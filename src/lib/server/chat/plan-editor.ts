import type { LanguageModel } from 'ai';
import { and, eq, gt, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { planBlockRanges } from '#lib/plan-blocks.js';
import type { LedgerEntry } from '#lib/plan-types.js';
import { runBlockWriter } from '../ai/block-writer.js';
import { describeAiError } from '../ai/errors.js';
import { GenerationError } from '../ai/generate.js';
import { ledgerBefore, ledgerEntriesFrom, replaceLedgerRange } from '../ai/ledger.js';
import { runOutliner } from '../ai/outliner.js';
import type { BlockOutput } from '../ai/types.js';
import { CHAT } from '../config.js';
import * as schema from '../db/schema.js';
import { outlineFromRows, toBlockOutput } from '../plans/generation.js';
import type { PlanStore } from '../plans/plan-store.js';
import { writeRevision, type WrittenRevision } from '../plans/revisions.js';

const { plans, planBlocks, planDays } = schema;

type Db = PostgresJsDatabase<typeof schema>;

export type EditResult =
	| {
			ok: true;
			revision: WrittenRevision;
			summary: string;
			changedBlocks: number[];
			staleBlocks: number[];
	  }
	| { ok: false; message: string };

export interface PlanView {
	title: string;
	goal: string;
	overview: string | null;
	finalOutcome: string | null;
	status: string;
	startDate: string;
	studyDays: number[];
	daysTotal: number;
	minutesPerDay: number;
	blocks: {
		block: number;
		theme: string;
		objective: string;
		days: string;
		status: string;
		milestone: string;
	}[];
	days: { day: number; title: string; completed: boolean }[] | { block: number; days: unknown[] };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
	if (!DATE_PATTERN.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const shorten = (text: string, max = 80) =>
	text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const rangeText = (from: number, to: number) =>
	from === to ? `block ${from}` : `blocks ${from}–${to}`;

export function createPlanEditor(deps: { db: Db; store: PlanStore }) {
	const { db, store } = deps;

	async function getPlanView(planId: string, blockNumber?: number): Promise<PlanView | null> {
		const plan = await store.getPlan(planId);
		if (!plan) return null;
		const [blocks, days] = await Promise.all([store.listBlocks(planId), store.listDays(planId)]);

		const view: PlanView = {
			title: plan.title,
			goal: plan.goal,
			overview: plan.overview,
			finalOutcome: plan.finalOutcome,
			status: plan.status,
			startDate: plan.startDate,
			studyDays: plan.inputs.studyDays,
			daysTotal: plan.inputs.daysTotal,
			minutesPerDay: plan.inputs.minutesPerDay,
			blocks: blocks.map((block) => ({
				block: block.idx + 1,
				theme: block.theme,
				objective: block.objective,
				days: `${block.startDay}-${block.endDay}`,
				status: block.status,
				milestone: block.milestone.title
			})),
			days: days.map((day) => ({
				day: day.day,
				title: day.title,
				completed: day.completedAt !== null
			}))
		};

		const chosen = blockNumber === undefined ? undefined : blocks[blockNumber - 1];
		if (chosen) {
			view.days = {
				block: chosen.idx + 1,
				days: days
					.filter((day) => day.blockId === chosen.id)
					.map((day) => ({
						day: day.day,
						title: day.title,
						learn: day.learn,
						practice: day.practice,
						review: day.review,
						minutes: day.minutes
					}))
			};
		}
		return view;
	}

	async function reviseBlocks(args: {
		planId: string;
		model: LanguageModel;
		fromBlock: number;
		toBlock: number;
		instruction: string;
		signal?: AbortSignal;
	}): Promise<EditResult> {
		const { planId, model, fromBlock, toBlock, instruction, signal } = args;
		const plan = await store.getPlan(planId);
		if (!plan) return { ok: false, message: 'The plan no longer exists.' };
		if (plan.status === 'generating') {
			return { ok: false, message: 'The plan is still being written. Try again when it is done.' };
		}

		const blocks = await store.listBlocks(planId);
		if (
			!Number.isInteger(fromBlock) ||
			!Number.isInteger(toBlock) ||
			fromBlock < 1 ||
			toBlock > blocks.length ||
			fromBlock > toBlock
		) {
			return { ok: false, message: `Choose blocks between 1 and ${blocks.length}.` };
		}
		if (toBlock - fromBlock + 1 > CHAT.maxReviseBlocks) {
			return {
				ok: false,
				message: `Rewrite at most ${CHAT.maxReviseBlocks} blocks at a time.`
			};
		}
		if (!instruction.trim()) return { ok: false, message: 'Say what should change.' };

		const days = await store.listDays(planId);
		const outline = outlineFromRows(plan, blocks);
		let ledger: LedgerEntry[] = plan.ledger;
		let previous: BlockOutput | null = null;

		const results: { block: (typeof blocks)[number]; output: BlockOutput }[] = [];
		for (let number = fromBlock; number <= toBlock; number++) {
			const block = blocks[number - 1];
			const currentRows = days.filter((day) => day.blockId === block.id);
			const before = blocks[number - 2];
			const previousBlock: BlockOutput | null =
				previous ??
				(before ? toBlockOutput(days.filter((day) => day.blockId === before.id)) : null);

			try {
				const output = await runBlockWriter({
					model,
					inputs: plan.inputs,
					outline,
					block: outline.blocks[number - 1],
					ledger: ledgerBefore(ledger, block.startDay),
					previous: previousBlock && previousBlock.days.length > 0 ? previousBlock : null,
					revision:
						currentRows.length > 0
							? { instruction, currentDays: toBlockOutput(currentRows).days }
							: { instruction, currentDays: [] },
					abortSignal: signal
				});
				results.push({ block, output });
				previous = output;
				ledger = replaceLedgerRange(
					ledger,
					block.startDay,
					block.endDay,
					ledgerEntriesFrom(output.days)
				);
			} catch (error) {
				return {
					ok: false,
					message:
						error instanceof GenerationError
							? `The model could not rewrite block ${number} in a valid way. Nothing was changed.`
							: `${describeAiError(error)} Nothing was changed.`
				};
			}
		}

		const staleBlocks: number[] = [];
		const revision = await db.transaction(async (tx) => {
			const completion = new Map(
				(
					await tx
						.select({ day: planDays.day, completedAt: planDays.completedAt })
						.from(planDays)
						.where(eq(planDays.planId, planId))
				).map((row) => [row.day, row.completedAt])
			);

			for (const { block, output } of results) {
				await tx.delete(planDays).where(eq(planDays.blockId, block.id));
				await tx.insert(planDays).values(
					output.days.map((day) => ({
						planId,
						blockId: block.id,
						day: day.day,
						title: day.title.trim(),
						learn: day.learn.trim(),
						practice: day.practice.trim(),
						review: day.review.trim(),
						minutes: day.minutes,
						completedAt: completion.get(day.day) ?? null
					}))
				);
				await tx
					.update(planBlocks)
					.set({ status: 'ready', error: null })
					.where(eq(planBlocks.id, block.id));
			}

			const lastIdx = blocks[toBlock - 1].idx;
			const later = await tx
				.update(planBlocks)
				.set({ status: 'stale' })
				.where(
					and(
						eq(planBlocks.planId, planId),
						gt(planBlocks.idx, lastIdx),
						inArray(planBlocks.status, ['ready'])
					)
				)
				.returning({ idx: planBlocks.idx });
			staleBlocks.push(...later.map((row) => row.idx + 1).sort((a, b) => a - b));

			await tx.update(plans).set({ ledger }).where(eq(plans.id, planId));
			return writeRevision(tx, planId, {
				source: 'chat',
				summary: `Rewrote ${rangeText(fromBlock, toBlock)}: ${shorten(instruction)}`
			});
		});

		return {
			ok: true,
			revision,
			summary: `Rewrote ${rangeText(fromBlock, toBlock)}.`,
			changedBlocks: results.map(({ block }) => block.idx + 1),
			staleBlocks
		};
	}

	async function restructureOutline(args: {
		planId: string;
		model: LanguageModel;
		instruction: string;
		signal?: AbortSignal;
	}): Promise<EditResult> {
		const { planId, model, instruction, signal } = args;
		const plan = await store.getPlan(planId);
		if (!plan) return { ok: false, message: 'The plan no longer exists.' };
		if (plan.status === 'generating') {
			return { ok: false, message: 'The plan is still being written. Try again when it is done.' };
		}
		if (!instruction.trim()) return { ok: false, message: 'Say what should change.' };

		const blocks = await store.listBlocks(planId);
		const ranges = planBlockRanges(plan.inputs.daysTotal, plan.inputs.blockSize);
		const current = outlineFromRows(plan, blocks);

		let outline;
		try {
			outline = await runOutliner({
				model,
				inputs: plan.inputs,
				ranges,
				revision: { instruction, current },
				abortSignal: signal
			});
		} catch (error) {
			return {
				ok: false,
				message:
					error instanceof GenerationError
						? 'The model could not redesign the outline in a valid way. Nothing was changed.'
						: `${describeAiError(error)} Nothing was changed.`
			};
		}

		const staleBlocks: number[] = [];
		const changedBlocks: number[] = [];
		const revision = await db.transaction(async (tx) => {
			await tx
				.update(plans)
				.set({
					title: outline.title,
					overview: outline.overview,
					finalOutcome: outline.finalOutcome,
					topicTag: outline.topicTag
				})
				.where(eq(plans.id, planId));

			for (const row of blocks) {
				const next = outline.blocks.find((block) => block.index === row.idx);
				if (!next) continue;
				const changed =
					next.theme !== row.theme ||
					next.objective !== row.objective ||
					JSON.stringify(next.covers) !== JSON.stringify(row.covers) ||
					JSON.stringify(next.notCovers) !== JSON.stringify(row.notCovers) ||
					JSON.stringify(next.milestone) !== JSON.stringify(row.milestone);
				if (!changed) continue;
				changedBlocks.push(row.idx + 1);
				const hasDays = row.status === 'ready' || row.status === 'stale';
				if (hasDays) staleBlocks.push(row.idx + 1);
				await tx
					.update(planBlocks)
					.set({
						theme: next.theme,
						objective: next.objective,
						covers: next.covers,
						notCovers: next.notCovers,
						milestone: next.milestone,
						...(hasDays ? { status: 'stale' as const } : {})
					})
					.where(eq(planBlocks.id, row.id));
			}

			return writeRevision(tx, planId, {
				source: 'chat',
				summary: `Changed the outline: ${shorten(instruction)}`
			});
		});

		return {
			ok: true,
			revision,
			summary:
				changedBlocks.length > 0
					? `Changed the outline of ${rangeText(changedBlocks[0], changedBlocks[changedBlocks.length - 1])}.`
					: 'The outline already fit the request, only the overview was refreshed.',
			changedBlocks,
			staleBlocks
		};
	}

	async function updateSchedule(args: {
		planId: string;
		startDate?: string;
		studyDays?: number[];
	}): Promise<EditResult> {
		const { planId, startDate, studyDays } = args;
		const plan = await store.getPlan(planId);
		if (!plan) return { ok: false, message: 'The plan no longer exists.' };
		if (startDate === undefined && studyDays === undefined) {
			return { ok: false, message: 'Say a new start date or new study days.' };
		}
		if (startDate !== undefined && !isRealDate(startDate)) {
			return { ok: false, message: 'The start date must be a real date like 2026-11-02.' };
		}
		const days =
			studyDays === undefined ? undefined : [...new Set(studyDays)].sort((a, b) => a - b);
		if (
			days &&
			(days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
		) {
			return { ok: false, message: 'Study days must be between 0 (Sunday) and 6 (Saturday).' };
		}

		const revision = await db.transaction(async (tx) => {
			await tx
				.update(plans)
				.set({
					...(startDate ? { startDate } : {}),
					...(days ? { inputs: { ...plan.inputs, studyDays: days } } : {})
				})
				.where(eq(plans.id, planId));
			return writeRevision(tx, planId, {
				source: 'chat',
				summary: [
					startDate ? `Start date set to ${startDate}` : null,
					days ? `Study days changed` : null
				]
					.filter(Boolean)
					.join(', ')
			});
		});

		return {
			ok: true,
			revision,
			summary: 'Updated the schedule.',
			changedBlocks: [],
			staleBlocks: []
		};
	}

	return { getPlanView, reviseBlocks, restructureOutline, updateSchedule };
}

export type PlanEditor = ReturnType<typeof createPlanEditor>;
