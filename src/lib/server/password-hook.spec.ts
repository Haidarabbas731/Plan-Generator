import { APIError } from 'better-auth/api';
import { describe, expect, it } from 'vitest';
import {
	assertPasswordStrong,
	PASSWORD_TOO_WEAK,
	passwordFromAuthRequest
} from './password-hook.js';

describe('passwordFromAuthRequest', () => {
	it('reads the password on sign-up and the new password on the other endpoints', () => {
		expect(passwordFromAuthRequest('/sign-up/email', { password: 'a' })).toBe('a');
		expect(passwordFromAuthRequest('/reset-password', { newPassword: 'b' })).toBe('b');
		expect(passwordFromAuthRequest('/change-password', { newPassword: 'c' })).toBe('c');
		expect(passwordFromAuthRequest('/set-password', { newPassword: 'd' })).toBe('d');
	});

	it('ignores other endpoints and bodies without a password', () => {
		expect(passwordFromAuthRequest('/sign-in/email', { password: 'a' })).toBeUndefined();
		expect(passwordFromAuthRequest('/sign-up/email', {})).toBeUndefined();
		expect(passwordFromAuthRequest('/sign-up/email', null)).toBeUndefined();
		expect(passwordFromAuthRequest('/reset-password', { newPassword: 5 })).toBeUndefined();
	});
});

describe('assertPasswordStrong', () => {
	it('throws a bad request with the first unmet rule for a weak password', () => {
		try {
			assertPasswordStrong('/sign-up/email', { password: 'longenough' });
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(APIError);
			const failure = error as APIError;
			expect(failure.statusCode).toBe(400);
			expect(failure.body?.code).toBe(PASSWORD_TOO_WEAK);
			expect(failure.body?.message).toBe('Add at least one uppercase letter.');
		}
	});

	it('lets a strong password and unrelated requests through', () => {
		expect(() =>
			assertPasswordStrong('/reset-password', { newPassword: 'Correct-horse-9' })
		).not.toThrow();
		expect(() => assertPasswordStrong('/sign-in/email', { password: 'x' })).not.toThrow();
	});

	it('also guards a password change', () => {
		expect(() => assertPasswordStrong('/change-password', { newPassword: 'weak' })).toThrow();
	});
});
