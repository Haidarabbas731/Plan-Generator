import type { LanguageModel } from 'ai';
import { eq } from 'drizzle-orm';
import { rangeText } from '#lib/chat-types.js';
import { planBlockRanges } from '#lib/plan-blocks.js';
import { describeAiError } from '../ai/errors.js';
import { GenerationError } from '../ai/generate.js';
import { runOutliner } from '../ai/outliner.js';
import * as schema from '../db/schema.js';
import type { Db } from '../db/types.js';
import { outlineFromRows } from '../plans/generation.js';
import type { PlanStore } from '../plans/plan-store.js';
import { writeRevision } from '../plans/revisions.js';
import { loadEditablePlan, shorten, type EditResult } from './edit-shared.js';

const { plans, planBlocks } = schema;

export function createOutlineRestructurer(deps: { db: Db; store: PlanStore }) {
	const { db, store } = deps;

	async function restructureOutline(args: {
		planId: string;
		model: LanguageModel;
		instruction: string;
		signal?: AbortSignal;
	}): Promise<EditResult> {
		const { planId, model, instruction, signal } = args;
		const loaded = await loadEditablePlan(store, planId);
		if ('blocked' in loaded) return loaded.blocked;
		const { plan } = loaded;
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

	return restructureOutline;
}
