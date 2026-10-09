import { generateText, NoObjectGeneratedError, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { MODEL_COMPAT } from '../config.js';
import { describeAiError } from './provider-error.js';

export type CompatResult =
	{ ok: true } | { ok: false; kind: 'incompatible' | 'error'; message: string };

const probeSchema = z.object({ sum: z.number(), words: z.array(z.string()).min(2) });

const PROBE_PROMPT =
	'Answer in the requested JSON format. Put the sum of 17 and 25 in "sum" and any two colour names in "words".';

export async function checkModelCompat(model: LanguageModel): Promise<CompatResult> {
	try {
		const result = await generateText({
			model,
			prompt: PROBE_PROMPT,
			output: Output.object({ schema: probeSchema }),
			abortSignal: AbortSignal.timeout(MODEL_COMPAT.timeoutMs)
		});
		if (result.output.sum === 42) return { ok: true };
		return {
			ok: false,
			kind: 'incompatible',
			message: 'This model answered, but not accurately. It may struggle with structured plans.'
		};
	} catch (error) {
		if (NoObjectGeneratedError.isInstance(error)) {
			return {
				ok: false,
				kind: 'incompatible',
				message: 'This model may struggle with structured plans. Try another one.'
			};
		}
		return { ok: false, kind: 'error', message: describeAiError(error) };
	}
}

export function createCompatCache(
	check: (model: LanguageModel) => Promise<CompatResult> = checkModelCompat,
	maxEntries: number = MODEL_COMPAT.maxEntries
) {
	const cache = new Map<string, CompatResult>();

	return {
		async run(
			userId: string,
			provider: string,
			modelId: string,
			model: LanguageModel
		): Promise<CompatResult> {
			const key = `${userId}:${provider}:${modelId}`;
			const hit = cache.get(key);
			if (hit) return hit;
			const result = await check(model);
			if (result.ok || result.kind === 'incompatible') {
				cache.set(key, result);
				while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
			}
			return result;
		},
		size: () => cache.size
	};
}
