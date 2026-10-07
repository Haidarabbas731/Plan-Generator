import { randomBytes } from 'node:crypto';
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

	it('creates one conversation per plan and returns the same one afterwards', async () => {
		const planId = await newPlan(userId);
		const first = await chat.getOrCreateConversation(userId, planId);
		const second = await chat.getOrCreateConversation(userId, planId);
		expect(first).toBeTruthy();
		expect(second).toBe(first);
	});

	it('does not create or reveal a conversation for a plan of another user', async () => {
		const planId = await newPlan(userId);
		expect(await chat.getOrCreateConversation(otherId, planId)).toBeNull();
		expect(await chat.findConversation(otherId, planId)).toBeNull();
	});

	it('finds nothing before the first message is sent', async () => {
		const planId = await newPlan(userId);
		expect(await chat.findConversation(userId, planId)).toBeNull();
	});

	it('stores messages with their parts, model and revision, oldest first', async () => {
		const planId = await newPlan(userId);
		const conversationId = (await chat.getOrCreateConversation(userId, planId))!;
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
		const conversationId = (await chat.getOrCreateConversation(userId, planId))!;
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
		const conversationId = (await chat.getOrCreateConversation(userId, planId))!;
		await chat.saveMessage({ conversationId, role: 'user', parts: [{ type: 'text', text: 'hi' }] });
		await plans.deleteOwnedPlan(userId, planId);
		expect(await chat.listMessages(conversationId)).toEqual([]);
		expect(await chat.findConversation(userId, planId)).toBeNull();
	});
});
