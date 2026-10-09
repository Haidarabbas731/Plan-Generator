import type { UIMessage } from 'ai';
import {
	date,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import {
	BLOCK_STATUSES,
	PLAN_STATUSES,
	REVISION_SOURCES,
	USAGE_KINDS,
	type LedgerEntry,
	type Milestone,
	type PlanInputs
} from '#lib/plan-types.js';
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

export const planStatusEnum = pgEnum('plan_status', PLAN_STATUSES);
export const blockStatusEnum = pgEnum('block_status', BLOCK_STATUSES);
export const revisionSourceEnum = pgEnum('revision_source', REVISION_SOURCES);
export const usageKindEnum = pgEnum('usage_kind', USAGE_KINDS);

export const plans = pgTable(
	'plans',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		goal: text('goal').notNull(),
		inputs: jsonb('inputs').$type<PlanInputs>().notNull(),
		topicTag: text('topic_tag'),
		status: planStatusEnum('status').notNull().default('generating'),
		startDate: date('start_date', { mode: 'string' }).notNull(),
		provider: providerEnum('provider').notNull(),
		model: text('model').notNull(),
		overview: text('overview'),
		finalOutcome: text('final_outcome'),
		ledger: jsonb('ledger').$type<LedgerEntry[]>().notNull().default([]),
		currentRevision: integer('current_revision').notNull().default(0),
		error: text('error'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('plans_user_updated_idx').on(table.userId, table.updatedAt)]
);

export const planBlocks = pgTable(
	'plan_blocks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		planId: uuid('plan_id')
			.notNull()
			.references(() => plans.id, { onDelete: 'cascade' }),
		idx: integer('idx').notNull(),
		startDay: integer('start_day').notNull(),
		endDay: integer('end_day').notNull(),
		theme: text('theme').notNull(),
		objective: text('objective').notNull(),
		covers: jsonb('covers').$type<string[]>().notNull().default([]),
		notCovers: jsonb('not_covers').$type<string[]>().notNull().default([]),
		milestone: jsonb('milestone').$type<Milestone>().notNull(),
		status: blockStatusEnum('status').notNull().default('pending'),
		error: text('error')
	},
	(table) => [unique('plan_blocks_plan_idx_unique').on(table.planId, table.idx)]
);

export const planDays = pgTable(
	'plan_days',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		planId: uuid('plan_id')
			.notNull()
			.references(() => plans.id, { onDelete: 'cascade' }),
		blockId: uuid('block_id')
			.notNull()
			.references(() => planBlocks.id, { onDelete: 'cascade' }),
		day: integer('day').notNull(),
		title: text('title').notNull(),
		learn: text('learn').notNull(),
		practice: text('practice').notNull(),
		review: text('review').notNull(),
		minutes: integer('minutes').notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true })
	},
	(table) => [unique('plan_days_plan_day_unique').on(table.planId, table.day)]
);

export const planRevisions = pgTable(
	'plan_revisions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		planId: uuid('plan_id')
			.notNull()
			.references(() => plans.id, { onDelete: 'cascade' }),
		number: integer('number').notNull(),
		snapshot: jsonb('snapshot').notNull(),
		source: revisionSourceEnum('source').notNull(),
		summary: text('summary'),
		messageId: uuid('message_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [unique('plan_revisions_plan_number_unique').on(table.planId, table.number)]
);

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

export const conversations = pgTable(
	'conversations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		planId: uuid('plan_id')
			.notNull()
			.references(() => plans.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('conversations_plan_created_idx').on(table.planId, table.createdAt)]
);

export const messages = pgTable(
	'messages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		role: messageRoleEnum('role').notNull(),
		parts: jsonb('parts').$type<UIMessage['parts']>().notNull(),
		provider: providerEnum('provider'),
		model: text('model'),
		revisionId: uuid('revision_id').references(() => planRevisions.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('messages_conversation_created_idx').on(table.conversationId, table.createdAt)]
);

export const usageEvents = pgTable(
	'usage_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		kind: usageKindEnum('kind').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('usage_events_user_created_idx').on(table.userId, table.createdAt)]
);
