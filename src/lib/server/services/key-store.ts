import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Provider } from '#lib/providers.js';
import type { Vault } from '../crypto/vault.js';
import * as schema from '../db/schema.js';
import type { KeyInfo } from './key-flow.js';

const { providerKeys } = schema;

export function createKeyStore(db: PostgresJsDatabase<typeof schema>, vault: Vault) {
	const selection = {
		provider: providerKeys.provider,
		last4: providerKeys.last4,
		updatedAt: providerKeys.updatedAt
	};

	return {
		async listKeys(userId: string): Promise<KeyInfo[]> {
			return db.select(selection).from(providerKeys).where(eq(providerKeys.userId, userId));
		},

		async saveKey(userId: string, provider: Provider, apiKey: string): Promise<KeyInfo> {
			const values = { encryptedKey: vault.encrypt(apiKey), last4: apiKey.slice(-4) };
			const [row] = await db
				.insert(providerKeys)
				.values({ userId, provider, ...values })
				.onConflictDoUpdate({
					target: [providerKeys.userId, providerKeys.provider],
					set: { ...values, updatedAt: new Date() }
				})
				.returning(selection);
			return row;
		},

		async getKey(userId: string, provider: Provider): Promise<string | null> {
			const [row] = await db
				.select({ encryptedKey: providerKeys.encryptedKey })
				.from(providerKeys)
				.where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, provider)))
				.limit(1);
			return row ? vault.decrypt(row.encryptedKey) : null;
		},

		async deleteKey(userId: string, provider: Provider): Promise<void> {
			await db
				.delete(providerKeys)
				.where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, provider)));
		}
	};
}
