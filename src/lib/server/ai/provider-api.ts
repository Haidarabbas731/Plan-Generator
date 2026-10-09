import { classifyStatus, extractDetail } from './provider-error.js';

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

export async function failureFromResponse(response: Response): Promise<ProviderFailure> {
	const errorClass = classifyStatus(response.status);
	const body = await response.text().catch(() => '');
	const detail = extractDetail(body);
	const said = detail ? ` It said: "${detail}"` : '';
	if (errorClass === 'rate_limited') {
		return {
			ok: false,
			reason: 'rate_limited',
			message: `The provider is rate limiting this key.${said} Try again in a minute.`
		};
	}
	if (errorClass === 'auth' || errorClass === 'refused' || response.status === 400) {
		return {
			ok: false,
			reason: 'rejected',
			message: `The provider rejected this key.${said}`
		};
	}
	return {
		ok: false,
		reason: 'unreachable',
		message: `The provider could not answer right now.${said} Try again later.`
	};
}
