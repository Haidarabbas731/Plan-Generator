import type { LanguageModel } from 'ai';
import type { Provider } from '#lib/providers.js';
import { PROVIDER_REGISTRY } from './provider-registry.js';

export function createLanguageModel(
	provider: Provider,
	modelId: string,
	apiKey: string
): LanguageModel {
	return PROVIDER_REGISTRY[provider].createModel(modelId, apiKey);
}
