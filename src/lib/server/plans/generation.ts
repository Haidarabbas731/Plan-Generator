import type { LanguageModel } from 'ai';
import { planBlockRanges } from '#lib/plan-blocks.js';
import { runBlockWriter } from '../ai/block-writer.js';
import { describeAiError } from '../ai/errors.js';
import { GenerationError } from '../ai/generate.js';
import { appendToLedger } from '../ai/ledger.js';
import { runOutliner } from '../ai/outliner.js';
import type { BlockOutput, Outline, OutlineBlock } from '../ai/types.js';
import { logger } from '../logger.js';
import type { PlanEvent } from './events.js';
import type { BlockRow, DayRow, PlanStore } from './plan-store.js';

export type RunOutcome = 'ready' | 'paused' | 'failed';

const toBlockOutput = (days: DayRow[]): BlockOutput => ({
	days: days.map((day) => ({
		day: day.day,
		title: day.title,
		learn: day.learn,
		practice: day.practice,
		review: day.review,
		minutes: day.minutes,
		topics: []
	}))
});

function outlineFromRows(
	plan: {
		title: string;
		overview: string | null;
		finalOutcome: string | null;
		topicTag: string | null;
	},
	blocks: BlockRow[]
): Outline {
	return {
		title: plan.title,
		overview: plan.overview ?? '',
		finalOutcome: plan.finalOutcome ?? '',
		topicTag: plan.topicTag ?? '',
		blocks: blocks.map((block): OutlineBlock => ({
			index: block.idx,
			startDay: block.startDay,
			endDay: block.endDay,
			theme: block.theme,
			objective: block.objective,
			covers: block.covers,
			notCovers: block.notCovers,
			milestone: block.milestone
		}))
	};
}

export async function runGeneration(args: {
	planId: string;
	store: PlanStore;
	model: LanguageModel;
	signal: AbortSignal;
	emit: (event: PlanEvent) => void;
}): Promise<RunOutcome> {
	const { planId, store, model, signal, emit } = args;

	const plan = await store.getPlan(planId);
	if (!plan) throw new Error('Plan not found');

	const failPlan = async (message: string): Promise<RunOutcome> => {
		await store.setPlanStatus(planId, 'failed', message);
		emit({ type: 'failed', planId, message });
		return 'failed';
	};
	const pausePlan = async (): Promise<RunOutcome> => {
		await store.setPlanStatus(planId, 'paused');
		emit({ type: 'paused', planId });
		return 'paused';
	};

	await store.setPlanStatus(planId, 'generating');

	let blocks = await store.listBlocks(planId);
	if (blocks.length === 0) {
		try {
			const ranges = planBlockRanges(plan.inputs.daysTotal, plan.inputs.blockSize);
			const outline = await runOutliner({
				model,
				inputs: plan.inputs,
				ranges,
				abortSignal: signal
			});
			await store.saveOutline(planId, outline);
			emit({ type: 'outline_ready', planId });
		} catch (error) {
			if (signal.aborted) return pausePlan();
			if (error instanceof GenerationError) {
				logger.warn({ planId, issues: error.issues }, 'Outline failed validation');
			} else {
				logger.error({ err: error, planId }, 'Outline generation failed');
			}
			return failPlan(
				error instanceof GenerationError
					? 'The model could not design the plan. Try again or pick another model.'
					: describeAiError(error)
			);
		}
		blocks = await store.listBlocks(planId);
	}

	for (const block of blocks) {
		if (block.status === 'ready') continue;
		if (signal.aborted) return pausePlan();

		await store.setBlockStatus(planId, block.idx, 'writing');
		emit({ type: 'block_started', planId, index: block.idx });

		try {
			const current = (await store.getPlan(planId))!;
			const previousBlock = blocks.find((other) => other.idx === block.idx - 1);
			const previous = previousBlock
				? toBlockOutput(await store.listBlockDays(previousBlock.id))
				: null;

			const output = await runBlockWriter({
				model,
				inputs: current.inputs,
				outline: outlineFromRows(current, blocks),
				block: outlineFromRows(current, [block]).blocks[0],
				ledger: current.ledger,
				previous,
				abortSignal: signal
			});

			await store.saveBlockDays(
				planId,
				block.id,
				output.days,
				appendToLedger(current.ledger, output.days)
			);
			emit({ type: 'block_ready', planId, index: block.idx });
		} catch (error) {
			if (signal.aborted) {
				await store.setBlockStatus(planId, block.idx, 'pending');
				return pausePlan();
			}
			if (error instanceof GenerationError) {
				logger.warn({ planId, block: block.idx, issues: error.issues }, 'Block failed validation');
			} else {
				logger.error({ err: error, planId, block: block.idx }, 'Block generation failed');
			}
			const message =
				error instanceof GenerationError
					? 'The model could not write this block. Retry it or pick another model.'
					: describeAiError(error);
			await store.setBlockStatus(planId, block.idx, 'failed', message);
			emit({ type: 'block_failed', planId, index: block.idx, message });
			return failPlan(message);
		}
	}

	await store.saveRevision(planId, 'generation');
	await store.setPlanStatus(planId, 'ready');
	emit({ type: 'done', planId });
	return 'ready';
}
