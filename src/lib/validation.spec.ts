import { describe, expect, it } from 'vitest';
import {
	safeRedirectPath,
	validateEmail,
	validatePassword,
	validateSignIn,
	validateSignUp
} from './validation.js';

describe('validateEmail', () => {
	it('accepts normal addresses', () => {
		expect(validateEmail('ada@example.com')).toBeUndefined();
		expect(validateEmail('ada+plans@mail.example.co.uk')).toBeUndefined();
	});

	it('rejects empty and malformed addresses', () => {
		expect(validateEmail('')).toBeDefined();
		expect(validateEmail('ada')).toBeDefined();
		expect(validateEmail('ada@example')).toBeDefined();
		expect(validateEmail('a b@example.com')).toBeDefined();
	});
});

describe('validatePassword', () => {
	it('enforces length bounds', () => {
		expect(validatePassword('')).toBeDefined();
		expect(validatePassword('short')).toBeDefined();
		expect(validatePassword('long-enough')).toBeUndefined();
		expect(validatePassword('x'.repeat(129))).toBeDefined();
	});
});

describe('validateSignUp', () => {
	it('returns no errors for valid input', () => {
		expect(
			validateSignUp({ name: 'Ada', email: 'ada@example.com', password: 'correct-horse' })
		).toEqual({});
	});

	it('reports every invalid field', () => {
		const errors = validateSignUp({ name: '  ', email: 'nope', password: 'x' });
		expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password']);
	});
});

describe('validateSignIn', () => {
	it('requires an email and a password but not a minimum length', () => {
		expect(validateSignIn({ email: 'ada@example.com', password: 'x' })).toEqual({});
		expect(Object.keys(validateSignIn({ email: '', password: '' })).sort()).toEqual([
			'email',
			'password'
		]);
	});
});

describe('safeRedirectPath', () => {
	it('allows local paths', () => {
		expect(safeRedirectPath('/plans/123?tab=chat', '/plans')).toBe('/plans/123?tab=chat');
	});

	it('falls back for missing, external or protocol-relative targets', () => {
		expect(safeRedirectPath(null, '/plans')).toBe('/plans');
		expect(safeRedirectPath('https://evil.example', '/plans')).toBe('/plans');
		expect(safeRedirectPath('//evil.example', '/plans')).toBe('/plans');
		expect(safeRedirectPath('/\\evil.example', '/plans')).toBe('/plans');
	});
});
