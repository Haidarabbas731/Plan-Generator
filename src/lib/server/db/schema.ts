import { pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { PROVIDERS } from '#lib/providers.js';
import { user } from './auth-schema.js';

export * from './auth-schema.js';

export const providerEnum = pgEnum('provider', PROVIDERS);

export const providerKeys = pgTable(
	'provider_keys',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		provider: providerEnum('provider').notNull(),
		encryptedKey: text('encrypted_key').notNull(),
		last4: text('last4').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [unique('provider_keys_user_provider_unique').on(table.userId, table.provider)]
);

export const userPrefs = pgTable('user_prefs', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	defaultProvider: providerEnum('default_provider'),
	defaultModel: text('default_model'),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});
