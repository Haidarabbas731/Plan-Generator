import type { LanguageModel } from 'ai';
import { LIMITS } from '#lib/limits.js';
import type { LedgerEntry, PlanInputs } from '#lib/plan-types.js';
import { generateValidated, streamValidated } from './generate.js';
import { findDuplicateTitles } from './ledger.js';
import { BLOCK_WRITER_INSTRUCTIONS, blockWriterPrompt } from './prompts.js';
import { blockOutputSchema, daySchema } from './schemas.js';
import type { DayOutput, BlockOutput, Outline, OutlineBlock } from './types.js';
import { validateBlock } from './validators.js';

export function runBlockWriter(args: {
	model: LanguageModel;
	inputs: PlanInputs;
	outline: Outline;
	block: OutlineBlock;
	ledger: LedgerEntry[];
	previous: BlockOutput | null;
	revision?: { instruction: string; currentDays: BlockOutput['days'] };
	abortSignal?: AbortSignal;
}): Promise<BlockOutput> {
	const { block, ledger, inputs } = args;
	return generateValidated<BlockOutput>({
		model: args.model,
		instructions: BLOCK_WRITER_INSTRUCTIONS,
		prompt: blockWriterPrompt(args),
		schema: blockOutputSchema,
		validate: (output) => [
			...validateBlock(output, block, inputs.minutesPerDay),
			...findDuplicateTitles(output.days, ledger).map((finding) => finding.message)
		],
		abortSignal: args.abortSignal
	});
}

export async function runBlockWriterStream(args: {
	model: LanguageModel;
	inputs: PlanInputs;
	outline: Outline;
	block: OutlineBlock;
	ledger: LedgerEntry[];
	previous: BlockOutput | null;
	onDay: (day: DayOutput) => void;
	onRestart: () => void;
	abortSignal?: AbortSignal;
}): Promise<BlockOutput> {
	const { block, ledger, inputs } = args;
	const days = await streamValidated<DayOutput>({
		model: args.model,
		instructions: BLOCK_WRITER_INSTRUCTIONS,
		prompt: blockWriterPrompt(args),
		element: daySchema,
		minItems: 1,
		maxItems: LIMITS.maxDaysPerBlock,
		validate: (output) => [
			...validateBlock({ days: output }, block, inputs.minutesPerDay),
			...findDuplicateTitles(output, ledger).map((finding) => finding.message)
		],
		onElement: args.onDay,
		onRestart: args.onRestart,
		abortSignal: args.abortSignal
	});
	return { days };
}
