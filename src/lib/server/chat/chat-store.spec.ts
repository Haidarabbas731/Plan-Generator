import { randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../db/schema.js';
import { createPlanStore } from '../plans/plan-store.js';
import { createChatStore } from './chat-store.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('chat store (real database)', () => {
	const client = postgres(url ?? '', { max: 2 });
	const db = drizzle(client, { schema });
	const plans = createPlanStore(db);
	const chat = createChatStore(db);
	const userId = `chat-${randomBytes(6).toString('hex')}`;
	const otherId = `chat-${randomBytes(6).toString('hex')}`;

	const newPlan = (owner: string) =>
		plans.createPlan(owner, {
			inputs: {
				goal: 'Learn Rust',
				level: null,
				studyDays: [1, 2, 3, 4, 5],
				doneLooksLike: null,
				daysTotal: 6,
				minutesPerDay: 60,
				blockSize: 3
			},
			provider: 'google',
			model: 'fake-model',
			startDate: '2026-10-05'
		});

	beforeAll(async () => {
		for (const id of [userId, otherId]) {
			await db.insert(schema.user).values({ id, name: 'Chat Test', email: `${id}@example.com` });
		}
	});

	afterAll(async () => {
		for (const id of [userId, otherId]) {
			await db.delete(schema.user).where(eq(schema.user.id, id));
		}
		await client.end();
	});

	it('creates a conversation with the given id and returns the same one on a repeat', async () => {
		const planId = await newPlan(userId);
		const id = randomUUID();
		expect(await chat.createConversation(userId, planId, id)).toBe(id);
		expect(await chat.createConversation(userId, planId, id)).toBe(id);
		expect(await chat.countConversations(userId, planId)).toBe(1);
	});

	it('does not create or reveal a conversation for a plan of another user', async () => {
		const planId = await newPlan(userId);
		const id = (await chat.createConversation(userId, planId, randomUUID()))!;
		expect(await chat.createConversation(otherId, planId, randomUUID())).toBeNull();
		expect(await chat.findConversation(otherId, planId, id)).toBeNull();
		expect(await chat.latestConversation(otherId, planId)).toBeNull();
		expect(await chat.listConversations(otherId, planId)).toEqual([]);
		expect(await chat.deleteConversation(otherId, planId, id)).toBe(false);
		expect(await chat.findConversation(userId, planId, id)).toBe(id);
	});

	it('does not hand over a conversation id that belongs to someone else', async () => {
		const mine = await newPlan(userId);
		const theirs = await newPlan(otherId);
		const id = (await chat.createConversation(userId, mine, randomUUID()))!;
		expect(await chat.createConversation(otherId, theirs, id)).toBeNull();
		expect(await chat.findConversation(userId, theirs, id)).toBeNull();
	});

	it('finds nothing before the first message is sent', async () => {
		const planId = await newPlan(userId);
		expect(await chat.latestConversation(userId, planId)).toBeNull();
		expect(await chat.listConversations(userId, planId)).toEqual([]);
	});

	it('keeps several conversations per plan, newest message first, titled by the first question', async () => {
		const planId = await newPlan(userId);
		const older = (await chat.createConversation(userId, planId, randomUUID()))!;
		const newer = (await chat.createConversation(userId, planId, randomUUID()))!;
		const say = (conversationId: string, role: 'user' | 'assistant', text: string) =>
			chat.saveMessage({ conversationId, role, parts: [{ type: 'text', text }] });

		await say(older, 'user', '  Make block 2\n  easier  ');
		await say(newer, 'user', 'x'.repeat(100));
		await say(older, 'assistant', 'Done.');

		const list = await chat.listConversations(userId, planId);
		expect(list.map((row) => row.id)).toEqual([older, newer]);
		expect(list[0]).toMatchObject({ title: 'Make block 2 easier', messageCount: 2 });
		expect(list[1].title).toHaveLength(60);
		expect(list[1].title.endsWith('…')).toBe(true);
		expect(await chat.latestConversation(userId, planId)).toBe(older);
		expect(await chat.countConversations(userId, planId)).toBe(2);
	});

	it('deletes one conversation and its messages and leaves the others', async () => {
		const planId = await newPlan(userId);
		const keep = (await chat.createConversation(userId, planId, randomUUID()))!;
		const drop = (await chat.createConversation(userId, planId, randomUUID()))!;
		for (const conversationId of [keep, drop]) {
			await chat.saveMessage({
				conversationId,
				role: 'user',
				parts: [{ type: 'text', text: 'hi' }]
			});
		}
		expect(await chat.deleteConversation(userId, planId, drop)).toBe(true);
		expect(await chat.deleteConversation(userId, planId, drop)).toBe(false);
		expect(await chat.listMessages(drop)).toEqual([]);
		expect((await chat.listConversations(userId, planId)).map((row) => row.id)).toEqual([keep]);
	});

	it('stores messages with their parts, model and revision, oldest first', async () => {
		const planId = await newPlan(userId);
		const conversationId = (await chat.createConversation(userId, planId, randomUUID()))!;
		await chat.saveMessage({
			conversationId,
			role: 'user',
			parts: [{ type: 'text', text: 'make block 2 easier' }]
		});
		const reply = await chat.saveMessage({
			conversationId,
			role: 'assistant',
			parts: [{ type: 'text', text: 'Done.' }],
			provider: 'google',
			model: 'gemini-test'
		});
		expect(reply).toMatchObject({ role: 'assistant', provider: 'google', model: 'gemini-test' });

		const all = await chat.listMessages(conversationId);
		expect(all.map((m) => m.role)).toEqual(['user', 'assistant']);
		expect(all[0].parts).toEqual([{ type: 'text', text: 'make block 2 easier' }]);
	});

	it('returns only the most recent messages, in order', async () => {
		const planId = await newPlan(userId);
		const conversationId = (await chat.createConversation(userId, planId, randomUUID()))!;
		for (let i = 1; i <= 5; i++) {
			await chat.saveMessage({
				conversationId,
				role: i % 2 ? 'user' : 'assistant',
				parts: [{ type: 'text', text: `message ${i}` }]
			});
		}
		const recent = await chat.recentMessages(conversationId, 3);
		expect(recent.map((m) => (m.parts[0] as { text: string }).text)).toEqual([
			'message 3',
			'message 4',
			'message 5'
		]);
	});

	it('removes the conversation and its messages with the plan', async () => {
		const planId = await newPlan(userId);
		const conversationId = (await chat.createConversation(userId, planId, randomUUID()))!;
		await chat.saveMessage({ conversationId, role: 'user', parts: [{ type: 'text', text: 'hi' }] });
		await plans.deleteOwnedPlan(userId, planId);
		expect(await chat.listMessages(conversationId)).toEqual([]);
		expect(await chat.latestConversation(userId, planId)).toBeNull();
	});
});
