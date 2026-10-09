import type { LanguageModel } from 'ai';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { rangeText } from '#lib/chat-types.js';
import type { LedgerEntry } from '#lib/plan-types.js';
import { runBlockWriter } from '../ai/block-writer.js';
import { describeAiError } from '../ai/provider-error.js';
import { GenerationError } from '../ai/generate.js';
import { ledgerBefore, ledgerEntriesFrom, replaceLedgerRange } from '../ai/ledger.js';
import type { BlockOutput } from '../ai/types.js';
import { CHAT } from '../config.js';
import * as schema from '../db/schema.js';
import type { Db } from '../db/types.js';
import { outlineFromRows, toBlockOutput } from '../plans/generation.js';
import type { PlanStore } from '../plans/plan-store.js';
import { writeRevision } from '../plans/revisions.js';
import { loadEditablePlan, shorten, type EditResult } from './edit-shared.js';

const { plans, planBlocks, planDays } = schema;

export function createBlockReviser(deps: { db: Db; store: PlanStore }) {
	const { db, store } = deps;

	async function reviseBlocks(args: {
		planId: string;
		model: LanguageModel;
		fromBlock: number;
		toBlock: number;
		instruction: string;
		signal?: AbortSignal;
	}): Promise<EditResult> {
		const { planId, model, fromBlock, toBlock, instruction, signal } = args;
		const loaded = await loadEditablePlan(store, planId);
		if ('blocked' in loaded) return loaded.blocked;
		const { plan } = loaded;

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

	return reviseBlocks;
}
