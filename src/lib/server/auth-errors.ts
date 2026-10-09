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

const TOO_MANY_ATTEMPTS = 'Too many attempts. Wait a minute and try again.';

const isRateLimited = (failure: AuthFailure | null) => failure?.status === 429;

export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

export function isEmailNotVerified(failure: AuthFailure | null): boolean {
	return failure?.status === 403 && failure.code === EMAIL_NOT_VERIFIED;
}

export function signInMessage(failure: AuthFailure | null): string {
	if (isRateLimited(failure)) return TOO_MANY_ATTEMPTS;
	if (failure && failure.status < 500) return 'The email or password is not correct.';
	return 'Sign-in is unavailable right now. Try again in a moment.';
}

export function signUpMessage(failure: AuthFailure | null): {
	field?: 'email' | 'password';
	message: string;
} {
	if (failure?.code === 'PASSWORD_TOO_WEAK') {
		return { field: 'password', message: 'Choose a stronger password that meets every rule.' };
	}
	if (isRateLimited(failure)) return { message: TOO_MANY_ATTEMPTS };
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

export function changePasswordMessage(failure: AuthFailure | null): string {
	if (isRateLimited(failure)) return TOO_MANY_ATTEMPTS;
	if (failure && failure.status < 500) return 'The current password is not correct.';
	return 'Could not change the password. Try again.';
}
