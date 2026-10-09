import type { Provider } from '#lib/providers.js';
import { KEY_CHECK_TIMEOUT_MS } from '../config.js';
import { failureFromResponse, UNREACHABLE, type ProviderFailure } from './provider-api.js';
import { PROVIDER_REGISTRY } from './provider-registry.js';

export type KeyCheckResult = { ok: true } | ProviderFailure;

type Fetch = typeof fetch;

export async function checkKey(
	provider: Provider,
	apiKey: string,
	fetchImpl: Fetch = fetch
): Promise<KeyCheckResult> {
	let response: Response;
	try {
		response = await fetchImpl(PROVIDER_REGISTRY[provider].keyCheckUrl, {
			method: 'GET',
			headers: PROVIDER_REGISTRY[provider].authHeaders(apiKey),
			signal: AbortSignal.timeout(KEY_CHECK_TIMEOUT_MS)
		});
	} catch {
		return UNREACHABLE;
	}

	return response.ok ? { ok: true } : await failureFromResponse(response);
}
