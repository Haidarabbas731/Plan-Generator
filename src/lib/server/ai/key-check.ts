import type { Provider } from '#lib/providers.js';
import { KEY_CHECK_TIMEOUT_MS } from '../config.js';

export type KeyCheckResult =
	| { ok: true }
	| { ok: false; reason: 'rejected' | 'rate_limited' | 'unreachable'; message: string };

type Fetch = typeof fetch;

interface Probe {
	url: string;
	headers: Record<string, string>;
}

function probeFor(provider: Provider, apiKey: string): Probe {
	switch (provider) {
		case 'google':
			return {
				url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
				headers: { 'x-goog-api-key': apiKey }
			};
		case 'openai':
			return {
				url: 'https://api.openai.com/v1/models',
				headers: { Authorization: `Bearer ${apiKey}` }
			};
		case 'anthropic':
			return {
				url: 'https://api.anthropic.com/v1/models?limit=1',
				headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
			};
		case 'openrouter':
			return {
				url: 'https://openrouter.ai/api/v1/key',
				headers: { Authorization: `Bearer ${apiKey}` }
			};
	}
}

export async function checkKey(
	provider: Provider,
	apiKey: string,
	fetchImpl: Fetch = fetch
): Promise<KeyCheckResult> {
	const { url, headers } = probeFor(provider, apiKey);

	let response: Response;
	try {
		response = await fetchImpl(url, {
			method: 'GET',
			headers,
			signal: AbortSignal.timeout(KEY_CHECK_TIMEOUT_MS)
		});
	} catch {
		return {
			ok: false,
			reason: 'unreachable',
			message: 'Could not reach the provider. Check your connection and try again.'
		};
	}

	if (response.ok) return { ok: true };

	if (response.status === 429) {
		return {
			ok: false,
			reason: 'rate_limited',
			message: 'The provider is rate limiting this key. Try again in a minute.'
		};
	}

	if (response.status === 400 || response.status === 401 || response.status === 403) {
		return { ok: false, reason: 'rejected', message: 'The provider rejected this key.' };
	}

	return {
		ok: false,
		reason: 'unreachable',
		message: 'The provider could not check the key right now. Try again later.'
	};
}
