import { APICallError } from 'ai';

export function describeAiError(error: unknown): string {
	if (APICallError.isInstance(error)) {
		const status = error.statusCode;
		if (status === 401 || status === 403) {
			return 'The provider rejected your key. Check it in Settings.';
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
	return 'Something went wrong while writing the plan. Resume to try again.';
}
