import type { Provider } from '#lib/providers.js';
import { normalizeApiKey } from '#lib/validation.js';
import type { KeyCheckResult } from '../ai/key-check.js';

export interface KeyInfo {
	provider: Provider;
	last4: string;
	updatedAt: Date;
}

export interface KeyFlowDeps {
	check: (provider: Provider, apiKey: string) => Promise<KeyCheckResult>;
	save: (userId: string, provider: Provider, apiKey: string) => Promise<KeyInfo>;
}

export type SaveOutcome =
	| { status: 'saved'; verified: boolean; info: KeyInfo; note?: string }
	| { status: 'invalid'; message: string }
	| { status: 'rejected'; message: string };

export async function saveProviderKey(
	input: { userId: string; provider: Provider; rawKey: string },
	deps: KeyFlowDeps
): Promise<SaveOutcome> {
	const normalized = normalizeApiKey(input.rawKey);
	if ('error' in normalized) return { status: 'invalid', message: normalized.error };

	const result = await deps.check(input.provider, normalized.key);
	if (!result.ok && result.reason === 'rejected') {
		return { status: 'rejected', message: result.message };
	}

	const info = await deps.save(input.userId, input.provider, normalized.key);
	return result.ok
		? { status: 'saved', verified: true, info }
		: { status: 'saved', verified: false, info, note: result.message };
}
