import type { Provider } from '#lib/providers.js';
import { KEY_CHECK_TIMEOUT_MS } from '../config.js';
import {
	authHeaders,
	failureFromResponse,
	KEY_CHECK_URL,
	UNREACHABLE,
	type ProviderFailure
} from './provider-api.js';

export type KeyCheckResult = { ok: true } | ProviderFailure;

type Fetch = typeof fetch;

export async function checkKey(
	provider: Provider,
	apiKey: string,
	fetchImpl: Fetch = fetch
): Promise<KeyCheckResult> {
	let response: Response;
	try {
		response = await fetchImpl(KEY_CHECK_URL[provider], {
			method: 'GET',
			headers: authHeaders(provider, apiKey),
			signal: AbortSignal.timeout(KEY_CHECK_TIMEOUT_MS)
		});
	} catch {
		return UNREACHABLE;
	}

	return response.ok ? { ok: true } : await failureFromResponse(response);
}
