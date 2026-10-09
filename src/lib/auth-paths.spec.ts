import { describe, expect, it } from 'vitest';
import { FIRST_RUN_PATH, verifyEmailPath } from './auth-paths.js';

describe('verifyEmailPath', () => {
	it('carries only the address after a sign-up', () => {
		expect(verifyEmailPath('ada@example.com')).toBe('/verify-email?email=ada%40example.com');
	});

	it('carries where to go next after a sign-in', () => {
		expect(verifyEmailPath('ada@example.com', '/plans/abc?tab=1')).toBe(
			'/verify-email?email=ada%40example.com&next=%2Fplans%2Fabc%3Ftab%3D1'
		);
	});

	it('sends brand new accounts to their plans, which explains how to start', () => {
		expect(FIRST_RUN_PATH).toBe('/plans');
	});
});
