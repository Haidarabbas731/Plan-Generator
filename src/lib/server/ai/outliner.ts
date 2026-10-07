import type { LanguageModel } from 'ai';
import type { PlanInputs } from '#lib/plan-types.js';
import type { BlockRange } from './blocks.js';
import { generateValidated } from './generate.js';
import { OUTLINER_INSTRUCTIONS, outlinerPrompt } from './prompts.js';
import { outlineSchema } from './schemas.js';
import type { Outline } from './types.js';
import { validateOutline } from './validators.js';

export function runOutliner(args: {
	model: LanguageModel;
	inputs: PlanInputs;
	ranges: BlockRange[];
	abortSignal?: AbortSignal;
}): Promise<Outline> {
	return generateValidated<Outline>({
		model: args.model,
		instructions: OUTLINER_INSTRUCTIONS,
		prompt: outlinerPrompt(args.inputs, args.ranges),
		schema: outlineSchema,
		validate: (outline) => validateOutline(outline, args.ranges),
		abortSignal: args.abortSignal
	});
}
