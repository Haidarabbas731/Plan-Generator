import { APIError } from 'better-auth/api';

export interface AuthFailure {
	status: number;
	code: string | undefined;
}

export function describeAuthError(error: unknown): AuthFailure | null {
	if (!(error instanceof APIError)) return null;
	const code = typeof error.body?.code === 'string' ? error.body.code : undefined;
	return { status: error.statusCode, code };
}

export function signInMessage(failure: AuthFailure | null): string {
	if (failure?.status === 429) return 'Too many attempts. Wait a minute and try again.';
	if (failure && failure.status < 500) return 'The email or password is not correct.';
	return 'Sign-in is unavailable right now. Try again in a moment.';
}

export function signUpMessage(failure: AuthFailure | null): { field?: 'email'; message: string } {
	if (failure?.status === 429) {
		return { message: 'Too many attempts. Wait a minute and try again.' };
	}
	if (failure?.status === 422 || failure?.code?.includes('USER_ALREADY_EXISTS')) {
		return {
			field: 'email',
			message: 'An account with this email already exists. Sign in instead.'
		};
	}
	if (failure && failure.status < 500) {
		return { message: 'Check your details and try again.' };
	}
	return { message: 'Sign-up is unavailable right now. Try again in a moment.' };
}
