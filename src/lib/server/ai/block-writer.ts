import type { LanguageModel } from 'ai';
import type { LedgerEntry, PlanInputs } from '#lib/plan-types.js';
import { generateValidated } from './generate.js';
import { findDuplicateTitles } from './ledger.js';
import { BLOCK_WRITER_INSTRUCTIONS, blockWriterPrompt } from './prompts.js';
import { blockOutputSchema } from './schemas.js';
import type { BlockOutput, Outline, OutlineBlock } from './types.js';
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
