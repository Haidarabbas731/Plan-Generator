import { describe, expect, it } from 'vitest';
import { authErrorCopy } from './auth-error-copy.js';

describe('authErrorCopy', () => {
	it('explains an account that is not linked yet and says what to do', () => {
		const copy = authErrorCopy('account_not_linked');
		expect(copy.title).toMatch(/password first/i);
		expect(copy.body).toMatch(/Settings/);
	});

	it('is not case sensitive', () => {
		expect(authErrorCopy('ACCESS_DENIED').title).toBe(authErrorCopy('access_denied').title);
	});

	it('has plain wording for a sign-in link that expired or was already used', () => {
		expect(authErrorCopy('state_not_found').title).toBe('That sign-in link expired');
		expect(authErrorCopy('state_not_found').body).toMatch(/Start again/);
	});

	it('never shows the raw code and falls back for unknown or missing ones', () => {
		for (const code of ['something_new', '', null, undefined]) {
			const copy = authErrorCopy(code);
			expect(copy.title).toBe("Sign-in didn't work");
			expect(JSON.stringify(copy)).not.toContain('something_new');
		}
	});
});
