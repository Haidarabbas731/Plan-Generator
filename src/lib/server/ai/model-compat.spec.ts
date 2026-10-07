import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { checkModelCompat, createCompatCache } from './model-compat.js';

function modelReturning(text: string) {
	return new MockLanguageModelV4({
		doGenerate: async () => ({
			content: [{ type: 'text' as const, text }],
			finishReason: { unified: 'stop' as const, raw: 'stop' },
			usage: {
				inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
				outputTokens: { total: 10, text: 10, reasoning: 0 }
			},
			warnings: []
		})
	});
}

describe('checkModelCompat', () => {
	it('accepts a model that answers the structured probe correctly', async () => {
		const model = modelReturning(JSON.stringify({ sum: 42, words: ['red', 'blue'] }));
		expect(await checkModelCompat(model)).toEqual({ ok: true });
	});

	it('warns when the structured answer is wrong', async () => {
		const model = modelReturning(JSON.stringify({ sum: 41, words: ['red', 'blue'] }));
		const result = await checkModelCompat(model);
		expect(result.ok).toBe(false);
	});

	it('warns when the answer is not valid structured output', async () => {
		const result = await checkModelCompat(modelReturning('not json at all'));
		expect(result).toMatchObject({ ok: false });
		expect(!result.ok && result.kind).toBe('incompatible');
	});
});

describe('compat cache', () => {
	it('runs the check once per user, provider and model', async () => {
		const check = vi.fn(async () => ({ ok: true }) as const);
		const cache = createCompatCache(check);
		const model = modelReturning('{}');
		await cache.run('u1', 'openai', 'm1', model);
		await cache.run('u1', 'openai', 'm1', model);
		await cache.run('u1', 'openai', 'm2', model);
		expect(check).toHaveBeenCalledTimes(2);
	});

	it('does not cache provider failures', async () => {
		const check = vi.fn(
			async () =>
				({ ok: false, kind: 'error', message: 'The provider rejected your key.' }) as const
		);
		const cache = createCompatCache(check);
		await cache.run('u1', 'openai', 'm1', modelReturning('{}'));
		expect(cache.size()).toBe(0);
	});
});
