import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import type { ModelOption } from '#lib/model-options.js';
import type { Provider } from '#lib/providers.js';
import {
	parseAnthropicModels,
	parseGoogleModels,
	parseOpenAiModels,
	parseOpenRouterModels
} from './model-parsers.js';

export interface ServerProvider {
	keyCheckUrl: string;
	modelsUrl: string;
	authHeaders: (apiKey: string) => Record<string, string>;
	createModel: (modelId: string, apiKey: string) => LanguageModel;
	parseModels: (body: unknown) => ModelOption[];
}

const bearer = (apiKey: string) => ({ Authorization: `Bearer ${apiKey}` });

export const PROVIDER_REGISTRY: Record<Provider, ServerProvider> = {
	google: {
		keyCheckUrl: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
		modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
		authHeaders: (apiKey) => ({ 'x-goog-api-key': apiKey }),
		createModel: (modelId, apiKey) => createGoogle({ apiKey })(modelId),
		parseModels: parseGoogleModels
	},
	openai: {
		keyCheckUrl: 'https://api.openai.com/v1/models',
		modelsUrl: 'https://api.openai.com/v1/models',
		authHeaders: bearer,
		createModel: (modelId, apiKey) => createOpenAI({ apiKey })(modelId),
		parseModels: parseOpenAiModels
	},
	anthropic: {
		keyCheckUrl: 'https://api.anthropic.com/v1/models?limit=1',
		modelsUrl: 'https://api.anthropic.com/v1/models?limit=1000',
		authHeaders: (apiKey) => ({ 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }),
		createModel: (modelId, apiKey) => createAnthropic({ apiKey })(modelId),
		parseModels: parseAnthropicModels
	},
	openrouter: {
		keyCheckUrl: 'https://openrouter.ai/api/v1/key',
		modelsUrl: 'https://openrouter.ai/api/v1/models',
		authHeaders: bearer,
		createModel: (modelId, apiKey) => createOpenRouter({ apiKey }).chat(modelId),
		parseModels: parseOpenRouterModels
	}
};
