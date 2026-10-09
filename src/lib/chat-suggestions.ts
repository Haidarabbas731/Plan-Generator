import { planBlockRanges } from './plan-blocks.js';
import type { PlanInputs } from './plan-types.js';

const WEEKEND_ONLY = 'I only have weekends now';

export function chatSuggestions(inputs: Pick<PlanInputs, 'daysTotal' | 'blockSize'>): string[] {
	const blocks = planBlockRanges(inputs.daysTotal, inputs.blockSize).length;
	const easier = blocks >= 2 ? 'Make block 2 easier' : 'Make this plan easier';
	const explain = `Explain day ${Math.min(4, inputs.daysTotal)}`;
	return [easier, WEEKEND_ONLY, explain];
}
