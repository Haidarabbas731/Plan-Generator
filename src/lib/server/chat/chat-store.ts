import type { UIMessage } from 'ai';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Provider } from '#lib/providers.js';
import * as schema from '../db/schema.js';

const { conversations, messages, plans } = schema;

type Db = PostgresJsDatabase<typeof schema>;

export interface StoredMessage {
	id: string;
	role: 'user' | 'assistant';
	parts: UIMessage['parts'];
	provider: Provider | null;
	model: string | null;
	revisionId: string | null;
	createdAt: Date;
}

export interface NewMessage {
	conversationId: string;
	role: 'user' | 'assistant';
	parts: UIMessage['parts'];
	provider?: Provider | null;
	model?: string | null;
	revisionId?: string | null;
}

const columns = {
	id: messages.id,
	role: messages.role,
	parts: messages.parts,
	provider: messages.provider,
	model: messages.model,
	revisionId: messages.revisionId,
	createdAt: messages.createdAt
};

export function createChatStore(db: Db) {
	return {
		async getOrCreateConversation(userId: string, planId: string): Promise<string | null> {
			const [owned] = await db
				.select({ id: plans.id })
				.from(plans)
				.where(and(eq(plans.id, planId), eq(plans.userId, userId)))
				.limit(1);
			if (!owned) return null;

			const [created] = await db
				.insert(conversations)
				.values({ planId, userId })
				.onConflictDoNothing({ target: conversations.planId })
				.returning({ id: conversations.id });
			if (created) return created.id;

			const [existing] = await db
				.select({ id: conversations.id })
				.from(conversations)
				.where(eq(conversations.planId, planId))
				.limit(1);
			return existing.id;
		},

		async findConversation(userId: string, planId: string): Promise<string | null> {
			const [row] = await db
				.select({ id: conversations.id })
				.from(conversations)
				.where(and(eq(conversations.planId, planId), eq(conversations.userId, userId)))
				.limit(1);
			return row?.id ?? null;
		},

		async saveMessage(input: NewMessage): Promise<StoredMessage> {
			const [row] = await db
				.insert(messages)
				.values({
					conversationId: input.conversationId,
					role: input.role,
					parts: input.parts,
					provider: input.provider ?? null,
					model: input.model ?? null,
					revisionId: input.revisionId ?? null
				})
				.returning(columns);
			return row;
		},

		async listMessages(conversationId: string): Promise<StoredMessage[]> {
			return db
				.select(columns)
				.from(messages)
				.where(eq(messages.conversationId, conversationId))
				.orderBy(asc(messages.createdAt), asc(messages.id));
		},

		async recentMessages(conversationId: string, limit: number): Promise<StoredMessage[]> {
			const rows = await db
				.select(columns)
				.from(messages)
				.where(eq(messages.conversationId, conversationId))
				.orderBy(desc(messages.createdAt), desc(messages.id))
				.limit(limit);
			return rows.reverse();
		},

		async setMessageRevision(messageId: string, revisionId: string): Promise<void> {
			await db.update(messages).set({ revisionId }).where(eq(messages.id, messageId));
		}
	};
}

export type ChatStore = ReturnType<typeof createChatStore>;
