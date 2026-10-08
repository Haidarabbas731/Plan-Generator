import { eq } from 'drizzle-orm';
import type { Provider } from '#lib/providers.js';
import { db } from '../db/index.js';
import { userPrefs } from '../db/schema.js';

export interface UserPrefs {
	defaultProvider: Provider | null;
	defaultModel: string | null;
}

export async function getPrefs(userId: string): Promise<UserPrefs> {
	const [row] = await db
		.select({ defaultProvider: userPrefs.defaultProvider, defaultModel: userPrefs.defaultModel })
		.from(userPrefs)
		.where(eq(userPrefs.userId, userId))
		.limit(1);
	return row ?? { defaultProvider: null, defaultModel: null };
}

export async function savePrefs(
	userId: string,
	value: { provider: Provider; model: string } | null
): Promise<void> {
	const defaults = {
		defaultProvider: value?.provider ?? null,
		defaultModel: value?.model ?? null
	};
	await db
		.insert(userPrefs)
		.values({ userId, ...defaults })
		.onConflictDoUpdate({ target: userPrefs.userId, set: defaults });
}
