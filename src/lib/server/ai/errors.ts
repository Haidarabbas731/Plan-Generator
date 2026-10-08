import { APICallError, RetryError } from 'ai';
import { LIMITS } from '#lib/limits.js';
import { VaultError } from '../crypto/vault.js';

const isTimeout = (error: unknown) =>
	error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');

export function rootAiError(error: unknown): unknown {
	return RetryError.isInstance(error) ? error.lastError : error;
}

export function describeAiError(error: unknown): string {
	const root = rootAiError(error);
	if (APICallError.isInstance(root)) {
		const status = root.statusCode;
		if (status === 401) {
			return 'The provider rejected your key. Check it in Settings.';
		}
		if (status === 403) {
			const said = root.message.trim().slice(0, LIMITS.providerMessageMax);
			const detail = said ? ` It said: "${said}"` : '';
			return `The provider refused this request for this model.${detail} Try another model, or check the key in Settings.`;
		}
		if (status === 404) {
			return 'The provider does not know this model. Pick another one.';
		}
		if (status === 429) {
			return 'The provider is rate limiting this key. Wait a moment and resume.';
		}
		if (status !== undefined && status >= 500) {
			return 'The provider had a problem. Resume in a moment.';
		}
		return 'The provider could not complete the request.';
	}
	if (root instanceof VaultError) {
		return 'The saved key can no longer be read. Add it again in Settings.';
	}
	if (isTimeout(root)) {
		return 'The provider took too long to answer. Resume in a moment.';
	}
	return 'Something went wrong while writing the plan. Resume to try again.';
}
