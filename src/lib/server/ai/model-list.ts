import type { ModelOption } from '#lib/model-options.js';
import type { Provider } from '#lib/providers.js';
import { MODEL_LIST } from '../config.js';
import { failureFromResponse, UNREACHABLE, type ProviderFailure } from './provider-api.js';
import { PROVIDER_REGISTRY } from './provider-registry.js';

export type { ModelOption } from '#lib/model-options.js';

export type ModelListResult = { ok: true; models: ModelOption[] } | ProviderFailure;

type Fetch = typeof fetch;

export function parseModels(provider: Provider, body: unknown): ModelOption[] {
	return PROVIDER_REGISTRY[provider].parseModels(body);
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
			response = await fetchImpl(PROVIDER_REGISTRY[provider].modelsUrl, {
				method: 'GET',
				headers: PROVIDER_REGISTRY[provider].authHeaders(apiKey),
				signal: AbortSignal.timeout(MODEL_LIST.timeoutMs)
			});
		} catch {
			return UNREACHABLE;
		}
		if (!response.ok) return await failureFromResponse(response);

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
