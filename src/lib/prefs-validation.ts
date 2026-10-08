import { LIMITS } from './limits.js';
import { isProvider, type Provider } from './providers.js';

export type DefaultsInput = { provider: unknown; model: unknown };

export type DefaultsResult =
	| { ok: true; value: { provider: Provider; model: string } | null }
	| { ok: false; errors: { provider?: string; model?: string } };

export function validateDefaults(input: DefaultsInput, connected: Provider[]): DefaultsResult {
	const provider = typeof input.provider === 'string' ? input.provider.trim() : '';
	const model = typeof input.model === 'string' ? input.model.trim() : '';
	if (!provider && !model) return { ok: true, value: null };
	if (!isProvider(provider) || !connected.includes(provider)) {
		return { ok: false, errors: { provider: 'Choose a provider you have a key for.' } };
	}
	if (!model) return { ok: false, errors: { model: 'Choose a model.' } };
	if (model.length > LIMITS.modelIdMax) {
		return { ok: false, errors: { model: 'That model name is too long.' } };
	}
	return { ok: true, value: { provider, model } };
}
