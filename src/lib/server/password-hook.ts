import { APIError } from 'better-auth/api';
import { firstPasswordProblem } from '#lib/password.js';

export const PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK';

const NEW_PASSWORD_PATHS = ['/reset-password', '/change-password', '/set-password'];

export function passwordFromAuthRequest(path: string, body: unknown): string | undefined {
	if (typeof body !== 'object' || body === null) return undefined;
	const values = body as Record<string, unknown>;
	const value = path === '/sign-up/email' ? values.password : undefined;
	const next = NEW_PASSWORD_PATHS.includes(path) ? values.newPassword : undefined;
	const password = value ?? next;
	return typeof password === 'string' ? password : undefined;
}

export function assertPasswordStrong(path: string, body: unknown): void {
	const password = passwordFromAuthRequest(path, body);
	if (password === undefined) return;
	const problem = firstPasswordProblem(password);
	if (problem) throw new APIError('BAD_REQUEST', { message: problem, code: PASSWORD_TOO_WEAK });
}
