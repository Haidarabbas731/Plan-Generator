import type { Provider } from '#lib/providers.js';

export type ProviderFailureReason = 'rejected' | 'rate_limited' | 'unreachable';

export interface ProviderFailure {
	ok: false;
	reason: ProviderFailureReason;
	message: string;
}

export const UNREACHABLE: ProviderFailure = {
	ok: false,
	reason: 'unreachable',
	message: 'Could not reach the provider. Check your connection and try again.'
};

export function failureFromStatus(status: number): ProviderFailure {
	if (status === 429) {
		return {
			ok: false,
			reason: 'rate_limited',
			message: 'The provider is rate limiting this key. Try again in a minute.'
		};
	}
	if (status === 400 || status === 401 || status === 403) {
		return { ok: false, reason: 'rejected', message: 'The provider rejected this key.' };
	}
	return {
		ok: false,
		reason: 'unreachable',
		message: 'The provider could not answer right now. Try again later.'
	};
}

export const KEY_CHECK_URL: Record<Provider, string> = {
	google: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
	openai: 'https://api.openai.com/v1/models',
	anthropic: 'https://api.anthropic.com/v1/models?limit=1',
	openrouter: 'https://openrouter.ai/api/v1/key'
};

export const MODELS_URL: Record<Provider, string> = {
	google: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
	openai: 'https://api.openai.com/v1/models',
	anthropic: 'https://api.anthropic.com/v1/models?limit=1000',
	openrouter: 'https://openrouter.ai/api/v1/models'
};

export function authHeaders(provider: Provider, apiKey: string): Record<string, string> {
	switch (provider) {
		case 'google':
			return { 'x-goog-api-key': apiKey };
		case 'anthropic':
			return { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
		case 'openai':
		case 'openrouter':
			return { Authorization: `Bearer ${apiKey}` };
	}
}
