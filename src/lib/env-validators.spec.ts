import { describe, expect, it } from 'vitest';
import {
	base64Key32,
	booleanFlag,
	httpUrl,
	optionalString,
	positiveInt,
	requiredHttpUrl,
	requiredString,
	secretString
} from './env-validators.js';

describe('optionalString', () => {
	it('returns undefined for missing or blank values', () => {
		expect(optionalString(undefined)).toBeUndefined();
		expect(optionalString('   ')).toBeUndefined();
	});

	it('trims real values', () => {
		expect(optionalString('  abc ')).toBe('abc');
	});
});

describe('positiveInt', () => {
	const limit = positiveInt(30);

	it('uses the fallback when unset', () => {
		expect(limit(undefined)).toBe(30);
		expect(limit('')).toBe(30);
	});

	it('parses whole numbers', () => {
		expect(limit('45')).toBe(45);
	});

	it('rejects zero, negatives and non-integers', () => {
		expect(() => limit('0')).toThrow();
		expect(() => limit('-3')).toThrow();
		expect(() => limit('1.5')).toThrow();
		expect(() => limit('many')).toThrow();
	});
});

describe('booleanFlag', () => {
	it('accepts 1 and true in any case', () => {
		expect(booleanFlag('1')).toBe(true);
		expect(booleanFlag('TRUE')).toBe(true);
	});

	it('treats everything else as false', () => {
		expect(booleanFlag(undefined)).toBe(false);
		expect(booleanFlag('0')).toBe(false);
		expect(booleanFlag('yes')).toBe(false);
	});
});

describe('base64Key32', () => {
	const valid = Buffer.alloc(32, 7).toString('base64');

	it('accepts a 32 byte base64 key', () => {
		expect(base64Key32(valid)).toBe(valid);
	});

	it('returns undefined when unset', () => {
		expect(base64Key32(undefined)).toBeUndefined();
	});

	it('rejects keys of the wrong length or encoding', () => {
		expect(() => base64Key32(Buffer.alloc(16, 1).toString('base64'))).toThrow();
		expect(() => base64Key32('not base64!!')).toThrow();
	});
});

describe('httpUrl', () => {
	it('accepts http and https URLs', () => {
		expect(httpUrl('https://plans.example.com')).toBe('https://plans.example.com');
		expect(httpUrl('http://localhost:5173')).toBe('http://localhost:5173');
	});

	it('returns undefined when unset', () => {
		expect(httpUrl(undefined)).toBeUndefined();
	});

	it('rejects other protocols and invalid URLs', () => {
		expect(() => httpUrl('ftp://example.com')).toThrow();
		expect(() => httpUrl('example.com')).toThrow();
	});
});

describe('requiredString', () => {
	it('returns the trimmed value', () => {
		expect(requiredString('  postgres://x  ')).toBe('postgres://x');
	});

	it('throws when missing or blank', () => {
		expect(() => requiredString(undefined)).toThrow();
		expect(() => requiredString('   ')).toThrow();
	});
});

describe('requiredHttpUrl', () => {
	it('accepts a valid URL', () => {
		expect(requiredHttpUrl('https://plans.example.com')).toBe('https://plans.example.com');
	});

	it('throws when missing or not http(s)', () => {
		expect(() => requiredHttpUrl(undefined)).toThrow();
		expect(() => requiredHttpUrl('ftp://example.com')).toThrow();
	});
});

describe('secretString', () => {
	const secret = secretString(32);

	it('accepts a long enough secret', () => {
		expect(secret('x'.repeat(32))).toBe('x'.repeat(32));
	});

	it('rejects missing or short secrets', () => {
		expect(() => secret(undefined)).toThrow();
		expect(() => secret('short')).toThrow();
	});
});
