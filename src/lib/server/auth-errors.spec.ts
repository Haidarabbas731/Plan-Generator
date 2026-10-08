import { APIError } from 'better-auth/api';
import { describe, expect, it } from 'vitest';
import {
	describeAuthError,
	isEmailNotVerified,
	signInMessage,
	signUpMessage
} from './auth-errors.js';

const apiError = (status: 'FORBIDDEN' | 'UNAUTHORIZED', code: string) =>
	new APIError(status, { code, message: code });

describe('describeAuthError', () => {
	it('reads the status and code of an API error and ignores other errors', () => {
		expect(describeAuthError(apiError('FORBIDDEN', 'EMAIL_NOT_VERIFIED'))).toEqual({
			status: 403,
			code: 'EMAIL_NOT_VERIFIED'
		});
		expect(describeAuthError(new Error('boom'))).toBeNull();
	});
});

describe('isEmailNotVerified', () => {
	it('is true only for a 403 with the not-verified code', () => {
		expect(isEmailNotVerified({ status: 403, code: 'EMAIL_NOT_VERIFIED' })).toBe(true);
		expect(isEmailNotVerified({ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(false);
		expect(isEmailNotVerified({ status: 403, code: 'SOMETHING_ELSE' })).toBe(false);
		expect(isEmailNotVerified(null)).toBe(false);
	});
});

describe('messages', () => {
	it('points a weak password back at the password field', () => {
		expect(signUpMessage({ status: 400, code: 'PASSWORD_TOO_WEAK' })).toEqual({
			field: 'password',
			message: 'Choose a stronger password that meets every rule.'
		});
	});

	it('never says which half of a wrong sign-in was wrong', () => {
		expect(signInMessage({ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(
			'The email or password is not correct.'
		);
	});

	it('asks to wait after too many attempts', () => {
		expect(signInMessage({ status: 429, code: undefined })).toMatch(/Too many attempts/);
		expect(signUpMessage({ status: 429, code: undefined }).message).toMatch(/Too many attempts/);
	});
});
