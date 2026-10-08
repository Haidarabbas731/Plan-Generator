import type { ModelOption, ModelPricing } from '#lib/model-options.js';
import type { Provider } from '#lib/providers.js';
import { MODEL_LIST } from '../config.js';
import {
	authHeaders,
	failureFromStatus,
	MODELS_URL,
	UNREACHABLE,
	type ProviderFailure
} from './provider-api.js';

export type { ModelOption } from '#lib/model-options.js';

export type ModelListResult = { ok: true; models: ModelOption[] } | ProviderFailure;

type Fetch = typeof fetch;

const NON_CHAT_OPENAI_MARKERS = [
	'embedding',
	'whisper',
	'tts',
	'dall-e',
	'moderation',
	'image',
	'audio',
	'realtime',
	'transcribe',
	'sora',
	'davinci',
	'babbage'
];

interface GoogleModel {
	name?: string;
	displayName?: string;
	supportedGenerationMethods?: string[];
}
interface AnthropicModel {
	id?: string;
	display_name?: string;
}
interface OpenAiModel {
	id?: string;
}
interface OpenRouterModel {
	id?: string;
	name?: string;
	architecture?: { input_modalities?: string[]; output_modalities?: string[] };
	pricing?: { prompt?: unknown; completion?: unknown };
}

const PER_MILLION = 1_000_000;

function perMillion(value: unknown): number | undefined {
	const perToken = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
	if (!Number.isFinite(perToken) || perToken < 0) return undefined;
	return Math.round(perToken * PER_MILLION * 1_000_000) / 1_000_000;
}

function openRouterPricing(pricing: OpenRouterModel['pricing']): ModelPricing | undefined {
	const input = perMillion(pricing?.prompt);
	const output = perMillion(pricing?.completion);
	return input === undefined || output === undefined ? undefined : { input, output };
}

const isText = (value: string | undefined): value is string =>
	typeof value === 'string' && value.length > 0;

const asList = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export function parseModels(provider: Provider, body: unknown): ModelOption[] {
	const root = (body ?? {}) as { models?: unknown; data?: unknown };
	let models: ModelOption[] = [];

	switch (provider) {
		case 'google':
			models = asList<GoogleModel>(root.models)
				.filter(
					(model) =>
						isText(model.name) && model.supportedGenerationMethods?.includes('generateContent')
				)
				.map((model) => {
					const id = model.name!.replace(/^models\//, '');
					return { id, name: model.displayName || id };
				});
			break;
		case 'anthropic':
			models = asList<AnthropicModel>(root.data)
				.filter((model) => isText(model.id))
				.map((model) => ({ id: model.id!, name: model.display_name || model.id! }));
			break;
		case 'openai':
			models = asList<OpenAiModel>(root.data)
				.filter(
					(model) =>
						isText(model.id) &&
						!NON_CHAT_OPENAI_MARKERS.some((marker) => model.id!.includes(marker))
				)
				.map((model) => ({ id: model.id!, name: model.id! }));
			break;
		case 'openrouter':
			models = asList<OpenRouterModel>(root.data)
				.filter(
					(model) =>
						isText(model.id) &&
						model.architecture?.input_modalities?.includes('text') !== false &&
						model.architecture?.output_modalities?.includes('text') !== false
				)
				.map((model) => {
					const pricing = openRouterPricing(model.pricing);
					return {
						id: model.id!,
						name: model.name || model.id!,
						...(pricing ? { pricing } : {})
					};
				});
			break;
	}

	return models.sort((a, b) => a.name.localeCompare(b.name));
}

export function createModelCatalog(
	options: { fetchImpl?: Fetch; now?: () => number; ttlMs?: number; maxEntries?: number } = {}
) {
	const fetchImpl = options.fetchImpl ?? fetch;
	const now = options.now ?? Date.now;
	const ttlMs = options.ttlMs ?? MODEL_LIST.ttlMs;
	const maxEntries = options.maxEntries ?? MODEL_LIST.maxEntries;
	const cache = new Map<string, { models: ModelOption[]; expires: number }>();

	async function list(
		userId: string,
		provider: Provider,
		apiKey: string,
		refresh = false
	): Promise<ModelListResult> {
		const cacheKey = `${userId}:${provider}`;
		const hit = cache.get(cacheKey);
		if (hit && !refresh && hit.expires > now()) return { ok: true, models: hit.models };

		let response: Response;
		try {
			response = await fetchImpl(MODELS_URL[provider], {
				method: 'GET',
				headers: authHeaders(provider, apiKey),
				signal: AbortSignal.timeout(MODEL_LIST.timeoutMs)
			});
		} catch {
			return UNREACHABLE;
		}
		if (!response.ok) return failureFromStatus(response.status);

		let body: unknown;
		try {
			body = await response.json();
		} catch {
			return UNREACHABLE;
		}

		const models = parseModels(provider, body);
		cache.delete(cacheKey);
		cache.set(cacheKey, { models, expires: now() + ttlMs });
		while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
		return { ok: true, models };
	}

	return { list, clear: () => cache.clear(), size: () => cache.size };
}

export type ModelCatalog = ReturnType<typeof createModelCatalog>;
