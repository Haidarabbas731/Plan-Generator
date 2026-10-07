import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createVault } from '../crypto/vault.js';
import * as schema from '../db/schema.js';
import { createKeyStore } from './key-store.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('key store (real database)', () => {
	const client = postgres(url ?? '', { max: 1 });
	const db = drizzle(client, { schema });
	const vault = createVault(randomBytes(32).toString('base64'));
	const store = createKeyStore(db, vault);
	const userId = `test-${randomBytes(6).toString('hex')}`;

	beforeAll(async () => {
		await db.insert(schema.user).values({
			id: userId,
			name: 'Key Store Test',
			email: `${userId}@example.com`
		});
	});

	afterAll(async () => {
		await db.delete(schema.user).where(eq(schema.user.id, userId));
		await client.end();
	});

	it('starts empty', async () => {
		expect(await store.listKeys(userId)).toEqual([]);
		expect(await store.getKey(userId, 'google')).toBeNull();
	});

	it('saves a key, lists only the last four characters, and decrypts it back', async () => {
		const info = await store.saveKey(userId, 'google', 'AIzaSy-first-key-1111');
		expect(info).toMatchObject({ provider: 'google', last4: '1111' });

		const listed = await store.listKeys(userId);
		expect(listed).toHaveLength(1);
		expect(JSON.stringify(listed)).not.toContain('AIzaSy');

		expect(await store.getKey(userId, 'google')).toBe('AIzaSy-first-key-1111');
	});

	it('stores ciphertext, never the plain key', async () => {
		const [row] = await db
			.select()
			.from(schema.providerKeys)
			.where(eq(schema.providerKeys.userId, userId));
		expect(row.encryptedKey.startsWith('v1:')).toBe(true);
		expect(row.encryptedKey).not.toContain('AIzaSy');
	});

	it('replaces the key for the same provider instead of adding a second row', async () => {
		await store.saveKey(userId, 'google', 'AIzaSy-second-key-2222');
		const listed = await store.listKeys(userId);
		expect(listed).toHaveLength(1);
		expect(listed[0].last4).toBe('2222');
		expect(await store.getKey(userId, 'google')).toBe('AIzaSy-second-key-2222');
	});

	it('keeps keys for different providers separately', async () => {
		await store.saveKey(userId, 'openai', 'sk-openai-key-3333');
		const providers = (await store.listKeys(userId)).map((entry) => entry.provider).sort();
		expect(providers).toEqual(['google', 'openai']);
	});

	it('deletes one provider key and leaves the other', async () => {
		await store.deleteKey(userId, 'google');
		expect(await store.getKey(userId, 'google')).toBeNull();
		expect(await store.getKey(userId, 'openai')).toBe('sk-openai-key-3333');
	});

	it('cannot read another user key', async () => {
		expect(await store.getKey('someone-else', 'openai')).toBeNull();
		expect(await store.listKeys('someone-else')).toEqual([]);
	});

	it('removes saved keys when the user is deleted', async () => {
		const other = `test-${randomBytes(6).toString('hex')}`;
		await db.insert(schema.user).values({ id: other, name: 'Temp', email: `${other}@example.com` });
		await store.saveKey(other, 'anthropic', 'sk-ant-temp-key-4444');
		await db.delete(schema.user).where(eq(schema.user.id, other));
		const rows = await db
			.select()
			.from(schema.providerKeys)
			.where(eq(schema.providerKeys.userId, other));
		expect(rows).toEqual([]);
	});
});
