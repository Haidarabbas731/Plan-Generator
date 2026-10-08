import { randomBytes } from 'node:crypto';
import { APICallError } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PlanInputs } from '#lib/plan-types.js';
import { createFakeChatModel } from '../ai/fake-chat-model.js';
import { createFakeModel } from '../ai/fake-model.js';
import { CHAT } from '../config.js';
import * as schema from '../db/schema.js';
import { runGeneration } from '../plans/generation.js';
import { createPlanStore } from '../plans/plan-store.js';
import { createChatService, MissingChatKeyError } from './chat-service.js';
import { createChatStore } from './chat-store.js';
import { createPlanEditor } from './plan-editor.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('chat service (real database, fake chat model)', () => {
	const client = postgres(url ?? '', { max: 4 });
	const db = drizzle(client, { schema });
	const store = createPlanStore(db);
	const chatStore = createChatStore(db);
	const editor = createPlanEditor({ db, store });
	const userId = `chat-svc-${randomBytes(6).toString('hex')}`;
	const otherId = `chat-svc-${randomBytes(6).toString('hex')}`;

	const inputs: PlanInputs = {
		goal: 'Learn Rust',
		level: null,
		studyDays: [1, 2, 3, 4, 5],
		doneLooksLike: null,
		daysTotal: 15,
		minutesPerDay: 60,
		blockSize: 3
	};

	beforeAll(async () => {
		for (const id of [userId, otherId]) {
			await db.insert(schema.user).values({ id, name: 'Chat Service', email: `${id}@example.com` });
		}
	});

	afterAll(async () => {
		for (const id of [userId, otherId]) {
			await db.delete(schema.user).where(eq(schema.user.id, id));
		}
		await client.end();
	});

	async function readyPlan() {
		const planId = await store.createPlan(userId, {
			inputs,
			provider: 'google',
			model: 'fake-chat-model',
			startDate: '2026-10-05'
		});
		await runGeneration({
			planId,
			store,
			model: createFakeModel(),
			signal: new AbortController().signal,
			emit: () => {}
		});
		return planId;
	}

	const serviceWith = (model = createFakeChatModel()) =>
		createChatService({ store, chatStore, editor, resolveModel: async () => model });

	async function ask(service: ReturnType<typeof serviceWith>, planId: string, text: string) {
		const response = await service.send({ userId, planId, text });
		return { response, body: await response.text() };
	}

	it('refuses a plan that does not exist or belongs to someone else', async () => {
		const service = serviceWith();
		const planId = await readyPlan();
		expect(
			(await service.send({ userId, planId: '00000000-0000-4000-8000-000000000000', text: 'hi' }))
				.status
		).toBe(404);
		expect((await service.send({ userId: otherId, planId, text: 'hi' })).status).toBe(404);
		expect(await service.history(otherId, planId)).toBeNull();
	});

	it('rejects empty and over-long messages without saving anything', async () => {
		const service = serviceWith();
		const planId = await readyPlan();
		expect((await service.send({ userId, planId, text: '   ' })).status).toBe(400);
		expect(
			(await service.send({ userId, planId, text: 'x'.repeat(CHAT.maxMessageChars + 1) })).status
		).toBe(400);
		expect(await service.history(userId, planId)).toEqual([]);
	});

	it('answers 429 with a retry hint when the hourly AI cap is reached', async () => {
		const service = createChatService({
			store,
			chatStore,
			editor,
			resolveModel: async () => createFakeChatModel(),
			guard: { check: async () => ({ ok: false, used: 30, cap: 30, retryInMinutes: 7 }) }
		});
		const planId = await readyPlan();
		const response = await service.send({ userId, planId, text: 'hello' });
		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBe('420');
		expect(await response.json()).toMatchObject({ error: 'rate-limit', retryInMinutes: 7 });
		expect(await service.history(userId, planId)).toEqual([]);
	});

	it('uses the configured maximum message length', async () => {
		const service = createChatService({
			store,
			chatStore,
			editor,
			resolveModel: async () => createFakeChatModel(),
			maxMessageChars: 10
		});
		const planId = await readyPlan();
		const response = await service.send({ userId, planId, text: 'x'.repeat(11) });
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ message: expect.stringContaining('10') });
	});

	it('is closed while the plan is being written', async () => {
		const service = serviceWith();
		const planId = await readyPlan();
		await store.setPlanStatus(planId, 'generating');
		const response = await service.send({ userId, planId, text: 'hello' });
		expect(response.status).toBe(409);
		expect(await service.history(userId, planId)).toEqual([]);
	});

	it('asks for a key when the provider has none', async () => {
		const service = createChatService({
			store,
			chatStore,
			editor,
			resolveModel: async (plan) => {
				throw new MissingChatKeyError(plan.provider);
			}
		});
		const planId = await readyPlan();
		const response = await service.send({ userId, planId, text: 'hello' });
		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe('no-key');
	});

	it('answers a question, stores both messages with the model and records usage', async () => {
		const service = serviceWith();
		const planId = await readyPlan();
		const usageBefore = (
			await db
				.select({ n: count() })
				.from(schema.usageEvents)
				.where(eq(schema.usageEvents.userId, userId))
		)[0].n;

		const { response, body } = await ask(service, planId, 'what is this plan about?');
		expect(response.status).toBe(200);
		expect(body).toContain('Fake answer: what is this plan about?');

		const messages = await service.history(userId, planId);
		expect(messages?.map((m) => m.role)).toEqual(['user', 'assistant']);
		expect(messages?.[1].metadata).toMatchObject({ provider: 'google', model: 'fake-chat-model' });

		const usageAfter = (
			await db
				.select({ n: count() })
				.from(schema.usageEvents)
				.where(eq(schema.usageEvents.userId, userId))
		)[0].n;
		expect(usageAfter).toBe(usageBefore + 1);
	});

	it('edits the plan through a tool, links the revision to the reply and marks later blocks stale', async () => {
		const service = serviceWith();
		const planId = await readyPlan();
		const { response, body } = await ask(service, planId, 'make block 2 easier');
		expect(response.status).toBe(200);
		expect(body).toContain('revise_blocks');

		const days = await store.listDays(planId);
		expect(days.find((day) => day.day === 4)?.learn).toContain('Revised: make block 2 easier');
		expect(days.find((day) => day.day === 1)?.learn).not.toContain('Revised');
		expect((await store.getPlan(planId))?.currentRevision).toBe(2);
		expect((await store.listBlocks(planId)).map((b) => b.status)).toEqual([
			'ready',
			'ready',
			'stale',
			'stale',
			'stale'
		]);

		const conversationId = (await chatStore.findConversation(userId, planId))!;
		const stored = await chatStore.listMessages(conversationId);
		const reply = stored[stored.length - 1];
		expect(reply.role).toBe('assistant');
		expect(reply.revisionId).toBeTruthy();
		expect(JSON.stringify(reply.parts)).toContain('Rewrote block 2');
	});

	it('changes the schedule from chat without any AI call for the plan text', async () => {
		const service = serviceWith();
		const planId = await readyPlan();
		await ask(service, planId, 'I only have the weekend now');
		const plan = await store.getPlan(planId);
		expect(plan?.inputs.studyDays).toEqual([0, 6]);
		expect(plan?.currentRevision).toBe(2);
	});

	it('keeps the plan unchanged and says so when an edit fails', async () => {
		const failing = createFakeChatModel();
		const writer = createFakeModel({ blockAlwaysFails: [1] });
		failing.doGenerate = (options) => writer.doGenerate(options);
		const service = serviceWith(failing);
		const planId = await readyPlan();
		const { body } = await ask(service, planId, 'make block 2 easier');
		expect(body).toContain('Nothing was changed');
		expect((await store.getPlan(planId))?.currentRevision).toBe(1);
	});

	it('sends only the most recent messages to the model', async () => {
		const model = createFakeChatModel();
		const service = serviceWith(model);
		const planId = await readyPlan();
		const conversationId = (await chatStore.getOrCreateConversation(userId, planId))!;
		for (let i = 0; i < 30; i++) {
			await chatStore.saveMessage({
				conversationId,
				role: i % 2 === 0 ? 'user' : 'assistant',
				parts: [{ type: 'text', text: `older message ${i}` }]
			});
		}
		await ask(service, planId, 'a new question');
		const prompt = model.doStreamCalls[0].prompt as { role: string }[];
		const conversation = prompt.filter((message) => message.role !== 'system');
		expect(conversation.length).toBeLessThanOrEqual(CHAT.historyMessages);
		expect(JSON.stringify(prompt)).toContain('a new question');
		expect(JSON.stringify(prompt)).not.toContain('older message 0');
		expect((await service.history(userId, planId))?.length).toBe(32);
	});

	it('answers without tools after a model rejects them, and tells the user', async () => {
		const plain = createFakeChatModel();
		const rejecting = new MockLanguageModelV4({
			provider: 'fake',
			modelId: 'no-tools-model',
			doStream: async (options) => {
				if ((options.tools ?? []).length > 0) {
					throw new APICallError({
						message: 'This model does not support tools',
						url: 'https://example.com',
						requestBodyValues: {},
						statusCode: 400
					});
				}
				return plain.doStream(options);
			}
		});
		const service = serviceWith(rejecting as unknown as ReturnType<typeof createFakeChatModel>);
		const planId = await readyPlan();

		const first = await ask(service, planId, 'make block 1 easier');
		expect(first.body).toContain("can't use tools");
		expect((await store.getPlan(planId))?.currentRevision).toBe(1);

		const second = await ask(service, planId, 'make block 1 easier');
		expect(second.body).toContain('Q&A only');
		expect(second.body).not.toContain('revise_blocks');
		expect((await store.getPlan(planId))?.currentRevision).toBe(1);
	});
});
