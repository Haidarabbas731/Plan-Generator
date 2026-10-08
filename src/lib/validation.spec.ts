import { describe, expect, it } from 'vitest';
import {
	normalizeApiKey,
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
		expect(validatePassword('Long-enough-1')).toBeUndefined();
		expect(validatePassword(`Aa1!${'x'.repeat(125)}`)).toBeDefined();
	});

	it('asks for the first missing kind of character', () => {
		expect(validatePassword('long-enough')).toBe('Add at least one uppercase letter.');
		expect(validatePassword('Long-enough')).toBe('Add at least one number.');
		expect(validatePassword('Longenough1')).toBe(
			'Add at least one special character, such as ! or @.'
		);
	});
});

describe('validateSignUp', () => {
	it('returns no errors for valid input', () => {
		expect(
			validateSignUp({ name: 'Ada', email: 'ada@example.com', password: 'Correct-horse-9' })
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

describe('normalizeApiKey', () => {
	it('trims and accepts a normal key', () => {
		expect(normalizeApiKey('  AIzaSy-example-key-123  ')).toEqual({
			key: 'AIzaSy-example-key-123'
		});
	});

	it('rejects empty, spaced, short and huge keys', () => {
		expect(normalizeApiKey('   ')).toHaveProperty('error');
		expect(normalizeApiKey('abc def ghi jkl')).toHaveProperty('error');
		expect(normalizeApiKey('short')).toHaveProperty('error');
		expect(normalizeApiKey('k'.repeat(401))).toHaveProperty('error');
	});

	it('rejects keys with line breaks from a bad paste', () => {
		expect(normalizeApiKey('sk-abcdefgh\nsk-ijklmnop')).toHaveProperty('error');
	});
});
