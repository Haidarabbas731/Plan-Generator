import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import type { Provider } from '#lib/providers.js';

export function createLanguageModel(
	provider: Provider,
	modelId: string,
	apiKey: string
): LanguageModel {
	switch (provider) {
		case 'google':
			return createGoogle({ apiKey })(modelId);
		case 'openai':
			return createOpenAI({ apiKey })(modelId);
		case 'anthropic':
			return createAnthropic({ apiKey })(modelId);
		case 'openrouter':
			return createOpenRouter({ apiKey }).chat(modelId);
	}
}
