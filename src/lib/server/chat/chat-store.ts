import type { UIMessage } from 'ai';
import { and, asc, count, desc, eq, inArray, max } from 'drizzle-orm';
import { chatTitle, NEW_CHAT_TITLE } from '#lib/chat-types.js';
import type { Provider } from '#lib/providers.js';
import * as schema from '../db/schema.js';
import type { Db } from '../db/types.js';

const { conversations, messages, plans } = schema;

export interface StoredMessage {
	id: string;
	role: 'user' | 'assistant';
	parts: UIMessage['parts'];
	provider: Provider | null;
	model: string | null;
	revisionId: string | null;
	createdAt: Date;
}

export interface ConversationSummary {
	id: string;
	title: string;
	lastMessageAt: Date;
	messageCount: number;
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
		async createConversation(
			userId: string,
			planId: string,
			conversationId: string
		): Promise<string | null> {
			const [owned] = await db
				.select({ id: plans.id })
				.from(plans)
				.where(and(eq(plans.id, planId), eq(plans.userId, userId)))
				.limit(1);
			if (!owned) return null;

			await db
				.insert(conversations)
				.values({ id: conversationId, planId, userId })
				.onConflictDoNothing({ target: conversations.id });
			return this.findConversation(userId, planId, conversationId);
		},

		async findConversation(
			userId: string,
			planId: string,
			conversationId: string
		): Promise<string | null> {
			const [row] = await db
				.select({ id: conversations.id })
				.from(conversations)
				.where(
					and(
						eq(conversations.id, conversationId),
						eq(conversations.planId, planId),
						eq(conversations.userId, userId)
					)
				)
				.limit(1);
			return row?.id ?? null;
		},

		async latestConversation(userId: string, planId: string): Promise<string | null> {
			const [row] = await db
				.select({ id: conversations.id })
				.from(conversations)
				.innerJoin(messages, eq(messages.conversationId, conversations.id))
				.where(and(eq(conversations.planId, planId), eq(conversations.userId, userId)))
				.groupBy(conversations.id)
				.orderBy(desc(max(messages.createdAt)))
				.limit(1);
			return row?.id ?? null;
		},

		async countConversations(userId: string, planId: string): Promise<number> {
			const [row] = await db
				.select({ n: count() })
				.from(conversations)
				.where(and(eq(conversations.planId, planId), eq(conversations.userId, userId)));
			return row?.n ?? 0;
		},

		async listConversations(userId: string, planId: string): Promise<ConversationSummary[]> {
			const rows = await db
				.select({
					id: conversations.id,
					lastMessageAt: max(messages.createdAt),
					messageCount: count(messages.id)
				})
				.from(conversations)
				.innerJoin(messages, eq(messages.conversationId, conversations.id))
				.where(and(eq(conversations.planId, planId), eq(conversations.userId, userId)))
				.groupBy(conversations.id)
				.orderBy(desc(max(messages.createdAt)), desc(conversations.id));
			if (rows.length === 0) return [];

			const firsts = await db
				.selectDistinctOn([messages.conversationId], {
					conversationId: messages.conversationId,
					parts: messages.parts
				})
				.from(messages)
				.where(
					and(
						inArray(
							messages.conversationId,
							rows.map((row) => row.id)
						),
						eq(messages.role, 'user')
					)
				)
				.orderBy(messages.conversationId, asc(messages.createdAt), asc(messages.id));
			const titles = new Map(firsts.map((row) => [row.conversationId, chatTitle(row.parts)]));

			return rows.map((row) => ({
				id: row.id,
				title: titles.get(row.id) ?? NEW_CHAT_TITLE,
				lastMessageAt: row.lastMessageAt!,
				messageCount: row.messageCount
			}));
		},

		async deleteConversation(
			userId: string,
			planId: string,
			conversationId: string
		): Promise<boolean> {
			const removed = await db
				.delete(conversations)
				.where(
					and(
						eq(conversations.id, conversationId),
						eq(conversations.planId, planId),
						eq(conversations.userId, userId)
					)
				)
				.returning({ id: conversations.id });
			return removed.length > 0;
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
