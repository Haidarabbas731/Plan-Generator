import { and, eq } from 'drizzle-orm';
import type { Provider } from '#lib/providers.js';
import { vault } from '../crypto/index.js';
import { db } from '../db/index.js';
import { providerKeys } from '../db/schema.js';
import type { KeyInfo } from './key-flow.js';

export async function listKeys(userId: string): Promise<KeyInfo[]> {
	return db
		.select({
			provider: providerKeys.provider,
			last4: providerKeys.last4,
			updatedAt: providerKeys.updatedAt
		})
		.from(providerKeys)
		.where(eq(providerKeys.userId, userId));
}

export async function saveKey(
	userId: string,
	provider: Provider,
	apiKey: string
): Promise<KeyInfo> {
	const values = { encryptedKey: vault.encrypt(apiKey), last4: apiKey.slice(-4) };
	const [row] = await db
		.insert(providerKeys)
		.values({ userId, provider, ...values })
		.onConflictDoUpdate({
			target: [providerKeys.userId, providerKeys.provider],
			set: { ...values, updatedAt: new Date() }
		})
		.returning({
			provider: providerKeys.provider,
			last4: providerKeys.last4,
			updatedAt: providerKeys.updatedAt
		});
	return row;
}

export async function getKey(userId: string, provider: Provider): Promise<string | null> {
	const [row] = await db
		.select({ encryptedKey: providerKeys.encryptedKey })
		.from(providerKeys)
		.where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, provider)))
		.limit(1);
	return row ? vault.decrypt(row.encryptedKey) : null;
}

export async function deleteKey(userId: string, provider: Provider): Promise<void> {
	await db
		.delete(providerKeys)
		.where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, provider)));
}
