import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createVault, VaultError } from './vault.js';

const newKey = () => randomBytes(32).toString('base64');

describe('vault', () => {
	const vault = createVault(newKey());

	it('round-trips a secret', () => {
		const secret = 'AIzaSy-example-key-1234';
		expect(vault.decrypt(vault.encrypt(secret))).toBe(secret);
	});

	it('round-trips empty and unicode text', () => {
		expect(vault.decrypt(vault.encrypt(''))).toBe('');
		expect(vault.decrypt(vault.encrypt('clé-秘密-🔑'))).toBe('clé-秘密-🔑');
	});

	it('produces a different blob each time (random IV)', () => {
		expect(vault.encrypt('same')).not.toBe(vault.encrypt('same'));
	});

	it('uses the v1 format and never contains the plain text', () => {
		const blob = vault.encrypt('super-secret-value');
		expect(blob.startsWith('v1:')).toBe(true);
		expect(blob.split(':')).toHaveLength(4);
		expect(blob).not.toContain('super-secret-value');
	});

	it('detects tampering with the ciphertext', () => {
		const parts = vault.encrypt('secret').split(':');
		const flipped = Buffer.from(parts[3], 'base64url');
		flipped[0] ^= 1;
		parts[3] = flipped.toString('base64url');
		expect(() => vault.decrypt(parts.join(':'))).toThrow(VaultError);
	});

	it('detects tampering with the auth tag', () => {
		const parts = vault.encrypt('secret').split(':');
		const flipped = Buffer.from(parts[2], 'base64url');
		flipped[0] ^= 1;
		parts[2] = flipped.toString('base64url');
		expect(() => vault.decrypt(parts.join(':'))).toThrow(VaultError);
	});

	it('cannot be read with a different key', () => {
		const blob = vault.encrypt('secret');
		expect(() => createVault(newKey()).decrypt(blob)).toThrow(VaultError);
	});

	it('rejects malformed or unknown-version blobs', () => {
		expect(() => vault.decrypt('nonsense')).toThrow(VaultError);
		expect(() => vault.decrypt('v2:a:b:c')).toThrow(VaultError);
		expect(() => vault.decrypt('v1:a:b')).toThrow(VaultError);
	});

	it('refuses a key that is not 32 bytes', () => {
		expect(() => createVault(randomBytes(16).toString('base64'))).toThrow(VaultError);
	});

	it('does not leak the secret in error messages', () => {
		try {
			vault.decrypt('v1:AAAA:BBBB:CCCC');
		} catch (error) {
			expect(String(error)).not.toContain('CCCC');
		}
	});
});
