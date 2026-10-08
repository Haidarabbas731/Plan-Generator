import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PlanInputs } from '#lib/plan-types.js';
import { createFakeModel, type FakeModelOptions } from '../ai/fake-model.js';
import * as schema from '../db/schema.js';
import { createEventBus, type PlanEvent } from './events.js';
import { runGeneration } from './generation.js';
import { createPlanStore } from './plan-store.js';

const url = process.env.DATABASE_URL;

const callsOf = (model: ReturnType<typeof createFakeModel>) => [
	...model.doGenerateCalls,
	...model.doStreamCalls
];

describe.skipIf(!url)('plan generation (real database, fake model)', () => {
	const client = postgres(url ?? '', { max: 4 });
	const db = drizzle(client, { schema });
	const store = createPlanStore(db);
	const userId = `gen-${randomBytes(6).toString('hex')}`;

	beforeAll(async () => {
		await db.insert(schema.user).values({
			id: userId,
			name: 'Generation Test',
			email: `${userId}@example.com`
		});
	});

	afterAll(async () => {
		await db.delete(schema.user).where(eq(schema.user.id, userId));
		await client.end();
	});

	const inputsFor = (daysTotal: number): PlanInputs => ({
		goal: 'Learn Rust well enough to build a CLI',
		level: 'beginner',
		studyDays: [1, 2, 3, 4, 5],
		doneLooksLike: null,
		daysTotal,
		minutesPerDay: 90,
		blockSize: 5
	});

	const newPlan = (daysTotal: number) =>
		store.createPlan(userId, {
			inputs: inputsFor(daysTotal),
			provider: 'google',
			model: 'fake-model',
			startDate: '2026-10-08'
		});

	function run(planId: string, options: FakeModelOptions = {}, signal?: AbortSignal) {
		const model = createFakeModel(options);
		const bus = createEventBus();
		const events: PlanEvent[] = [];
		bus.subscribe(planId, (event) => events.push(event));
		const outcome = runGeneration({
			planId,
			store,
			model,
			signal: signal ?? new AbortController().signal,
			emit: bus.emit
		});
		return { model, events, outcome };
	}

	it('writes a complete 30-day plan block by block', async () => {
		const planId = await newPlan(30);
		const { model, events, outcome } = run(planId);

		expect(await outcome).toBe('ready');

		const plan = (await store.getPlan(planId))!;
		expect(plan.status).toBe('ready');
		expect(plan.title).toContain('Fake plan');
		expect(plan.currentRevision).toBe(1);

		const blocks = await store.listBlocks(planId);
		expect(blocks).toHaveLength(6);
		expect(blocks.every((block) => block.status === 'ready')).toBe(true);

		const days = await store.listDays(planId);
		expect(days.map((day) => day.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
		expect(new Set(days.map((day) => day.title)).size).toBe(30);
		expect(days.every((day) => day.completedAt === null)).toBe(true);

		expect(plan.ledger).toHaveLength(30);
		expect(plan.ledger[29]).toMatchObject({ day: 30, title: 'Lesson 30' });

		expect(callsOf(model)).toHaveLength(7);
		expect(events.map((event) => event.type)).toEqual([
			'outline_ready',
			...Array.from({ length: 6 }, () => [
				'block_started',
				...Array.from({ length: 5 }, () => 'day_ready'),
				'block_ready'
			]).flat(),
			'done'
		]);
	});

	it('sends each day as it is written, before the block is saved', async () => {
		const planId = await newPlan(10);
		const { events, outcome } = run(planId);
		expect(await outcome).toBe('ready');
		const first = events.find((event) => event.type === 'day_ready');
		expect(first).toMatchObject({ index: 0, day: { day: 1, title: 'Lesson 1' } });
		expect(Object.keys((first as { day: object }).day).sort()).toEqual(
			['day', 'learn', 'minutes', 'practice', 'review', 'title'].sort()
		);
		const types = events.map((event) => event.type);
		expect(types.indexOf('day_ready')).toBeLessThan(types.indexOf('block_ready'));
	});

	it('tells the page to drop the preview when a block is written again', async () => {
		const planId = await newPlan(10);
		const { events, outcome } = run(planId, { blockFirstAttemptFails: { 0: 'missing-day' } });
		expect(await outcome).toBe('ready');
		const types = events.map((event) => event.type);
		const restart = types.indexOf('block_restarted');
		expect(restart).toBeGreaterThan(types.indexOf('day_ready'));
		expect(types.slice(restart + 1)).toContain('day_ready');
		expect(types.indexOf('block_ready')).toBeGreaterThan(restart);
	});

	it('writes a 90-day plan in 18 blocks with no repeated titles', async () => {
		const planId = await newPlan(90);
		const { model, outcome } = run(planId);
		expect(await outcome).toBe('ready');
		expect(callsOf(model)).toHaveLength(19);
		const days = await store.listDays(planId);
		expect(days).toHaveLength(90);
		expect(new Set(days.map((day) => day.title)).size).toBe(90);
	});

	it('stores a revision snapshot without progress information', async () => {
		const planId = await newPlan(10);
		await run(planId).outcome;
		const [revision] = await db
			.select()
			.from(schema.planRevisions)
			.where(eq(schema.planRevisions.planId, planId));
		expect(revision).toMatchObject({ number: 1, source: 'generation' });
		const snapshot = revision.snapshot as { days: Record<string, unknown>[]; blocks: unknown[] };
		expect(snapshot.days).toHaveLength(10);
		expect(snapshot.blocks).toHaveLength(2);
		expect(Object.keys(snapshot.days[0]).sort()).toEqual(
			['day', 'learn', 'minutes', 'practice', 'review', 'title'].sort()
		);
	});

	it('retries a block that repeats an earlier title and still finishes', async () => {
		const planId = await newPlan(30);
		const { model, outcome } = run(planId, { blockFirstAttemptFails: { 1: 'duplicate-title' } });
		expect(await outcome).toBe('ready');
		expect(callsOf(model)).toHaveLength(8);
		const days = await store.listDays(planId);
		expect(new Set(days.map((day) => day.title)).size).toBe(30);
	});

	it('stops at a block that keeps failing and resumes without redoing finished blocks', async () => {
		const planId = await newPlan(30);
		const first = run(planId, { blockAlwaysFails: [2] });
		expect(await first.outcome).toBe('failed');

		const failedPlan = (await store.getPlan(planId))!;
		expect(failedPlan.status).toBe('failed');
		expect(failedPlan.error).toContain('could not write this block');

		const blocks = await store.listBlocks(planId);
		expect(blocks.map((block) => block.status)).toEqual([
			'ready',
			'ready',
			'failed',
			'pending',
			'pending',
			'pending'
		]);
		expect(await store.listDays(planId)).toHaveLength(10);
		expect(first.events.map((event) => event.type)).toContain('block_failed');
		expect(first.events.at(-1)?.type).toBe('failed');
		expect(failedPlan.currentRevision).toBe(0);

		const second = run(planId);
		expect(await second.outcome).toBe('ready');
		expect(callsOf(second.model)).toHaveLength(4);

		const days = await store.listDays(planId);
		expect(days.map((day) => day.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
		expect(new Set(days.map((day) => day.title)).size).toBe(30);
		expect((await store.getPlan(planId))!.status).toBe('ready');
	});

	it('pauses when cancelled mid-run and resumes where it stopped', async () => {
		const planId = await newPlan(30);
		const controller = new AbortController();
		const bus = createEventBus();
		bus.subscribe(planId, (event) => {
			if (event.type === 'block_ready' && event.index === 1) controller.abort();
		});
		const model = createFakeModel({ delayMs: 15 });
		const outcome = await runGeneration({
			planId,
			store,
			model,
			signal: controller.signal,
			emit: bus.emit
		});
		expect(outcome).toBe('paused');
		expect((await store.getPlan(planId))!.status).toBe('paused');

		const blocks = await store.listBlocks(planId);
		expect(blocks.filter((block) => block.status === 'ready')).toHaveLength(2);
		expect(blocks.filter((block) => block.status === 'writing')).toHaveLength(0);

		const resumed = run(planId);
		expect(await resumed.outcome).toBe('ready');
		expect(callsOf(resumed.model)).toHaveLength(4);
		expect(await store.listDays(planId)).toHaveLength(30);
	});

	it('fails the plan with a clear message when the outline cannot be written', async () => {
		const planId = await newPlan(30);
		const { events, outcome } = run(planId, { outlineAlwaysFails: true });
		expect(await outcome).toBe('failed');
		const plan = (await store.getPlan(planId))!;
		expect(plan.status).toBe('failed');
		expect(plan.error).toContain('could not design the plan');
		expect(await store.listBlocks(planId)).toEqual([]);
		expect(events.at(-1)?.type).toBe('failed');
	});

	it('marks plans left in "generating" as paused after a restart', async () => {
		const planId = await newPlan(10);
		const { outcome } = run(planId, { blockAlwaysFails: [1] });
		await outcome;
		await store.setPlanStatus(planId, 'generating');
		await store.setBlockStatus(planId, 1, 'writing');

		expect(await store.markGeneratingPlansPaused([planId])).toBe(1);
		expect((await store.getPlan(planId))!.status).toBe('paused');
		const blocks = await store.listBlocks(planId);
		expect(blocks[1].status).toBe('pending');
	});

	it('keeps plans private to their owner', async () => {
		const planId = await newPlan(10);
		expect(await store.getOwnedPlan(userId, planId)).toBeDefined();
		expect(await store.getOwnedPlan('someone-else', planId)).toBeUndefined();
	});

	it('removes plans, blocks and days when the user is deleted', async () => {
		const other = `gen-${randomBytes(6).toString('hex')}`;
		await db.insert(schema.user).values({ id: other, name: 'Temp', email: `${other}@example.com` });
		const planId = await store.createPlan(other, {
			inputs: inputsFor(10),
			provider: 'google',
			model: 'fake-model',
			startDate: '2026-10-08'
		});
		await run(planId).outcome;
		await db.delete(schema.user).where(eq(schema.user.id, other));
		expect(await store.getPlan(planId)).toBeUndefined();
		expect(await store.listBlocks(planId)).toEqual([]);
		expect(await store.listDays(planId)).toEqual([]);
	});
});
