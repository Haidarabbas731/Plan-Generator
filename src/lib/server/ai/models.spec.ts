import { describe, expect, it } from 'vitest';
import { PROVIDERS } from '#lib/providers.js';
import { createLanguageModel } from './models.js';

describe('createLanguageModel', () => {
	it('creates a model for every provider with the requested model id', () => {
		for (const provider of PROVIDERS) {
			const model = createLanguageModel(provider, 'some-model', 'test-key-12345');
			expect(typeof model).toBe('object');
			expect((model as { modelId: string }).modelId).toBe('some-model');
		}
	});

	it('uses the matching provider for each', () => {
		const provider = (name: (typeof PROVIDERS)[number]) =>
			(createLanguageModel(name, 'm', 'test-key-12345') as { provider: string }).provider;
		expect(provider('google')).toContain('google');
		expect(provider('openai')).toContain('openai');
		expect(provider('anthropic')).toContain('anthropic');
		expect(provider('openrouter')).toContain('openrouter');
	});
});
