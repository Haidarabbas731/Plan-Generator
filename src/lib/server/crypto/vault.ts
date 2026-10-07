import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class VaultError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'VaultError';
	}
}

export interface Vault {
	encrypt(plain: string): string;
	decrypt(blob: string): string;
}

const toBase64Url = (buffer: Buffer) => buffer.toString('base64url');
const fromBase64Url = (value: string) => Buffer.from(value, 'base64url');

export function createVault(keyBase64: string): Vault {
	const key = Buffer.from(keyBase64, 'base64');
	if (key.length !== KEY_BYTES) {
		throw new VaultError('The encryption key must be 32 bytes encoded as base64');
	}

	return {
		encrypt(plain) {
			const iv = randomBytes(IV_BYTES);
			const cipher = createCipheriv('aes-256-gcm', key, iv);
			const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
			const tag = cipher.getAuthTag();
			return [VERSION, toBase64Url(iv), toBase64Url(tag), toBase64Url(encrypted)].join(':');
		},

		decrypt(blob) {
			const parts = blob.split(':');
			if (parts.length !== 4 || parts[0] !== VERSION) {
				throw new VaultError('The saved key has an unknown format');
			}
			try {
				const iv = fromBase64Url(parts[1]);
				const tag = fromBase64Url(parts[2]);
				const encrypted = fromBase64Url(parts[3]);
				if (iv.length !== IV_BYTES) throw new Error('bad iv');
				const decipher = createDecipheriv('aes-256-gcm', key, iv);
				decipher.setAuthTag(tag);
				return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
			} catch {
				throw new VaultError('The saved key cannot be read. Add it again.');
			}
		}
	};
}
