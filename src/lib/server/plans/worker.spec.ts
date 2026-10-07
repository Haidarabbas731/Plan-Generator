import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PlanInputs } from '#lib/plan-types.js';
import { createFakeModel, type FakeModelOptions } from '../ai/fake-model.js';
import * as schema from '../db/schema.js';
import { createEventBus } from './events.js';
import { createPlanStore } from './plan-store.js';
import { createPlanWorker, MissingKeyError } from './worker.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('plan worker (real database, fake model)', () => {
	const client = postgres(url ?? '', { max: 6 });
	const db = drizzle(client, { schema });
	const store = createPlanStore(db);
	const userId = `wrk-${randomBytes(6).toString('hex')}`;

	beforeAll(async () => {
		await db.insert(schema.user).values({
			id: userId,
			name: 'Worker Test',
			email: `${userId}@example.com`
		});
	});

	afterAll(async () => {
		await db.delete(schema.user).where(eq(schema.user.id, userId));
		await client.end();
	});

	const inputs: PlanInputs = {
		goal: 'Learn Rust',
		level: null,
		studyDays: [1, 2, 3, 4, 5],
		doneLooksLike: null,
		daysTotal: 15,
		minutesPerDay: 60,
		blockSize: 5
	};

	const newPlan = () =>
		store.createPlan(userId, {
			inputs,
			provider: 'google',
			model: 'fake-model',
			startDate: '2026-10-08'
		});

	function makeWorker(options: FakeModelOptions = {}, resolve?: () => Promise<never>) {
		const bus = createEventBus();
		return createPlanWorker({
			client,
			store,
			bus,
			resolveModel: resolve ?? (async () => createFakeModel(options))
		});
	}

	it('runs a plan in the background and finishes it', async () => {
		const worker = makeWorker();
		const planId = await newPlan();
		expect(await worker.start(planId)).toBe('started');
		expect(worker.isRunning(planId)).toBe(true);
		expect(await worker.whenIdle(planId)).toBe('ready');
		expect(worker.isRunning(planId)).toBe(false);
		expect((await store.getPlan(planId))!.status).toBe('ready');
		expect(await store.listDays(planId)).toHaveLength(15);
	});

	it('records one usage event per run', async () => {
		const worker = makeWorker();
		const planId = await newPlan();
		const before = await db
			.select()
			.from(schema.usageEvents)
			.where(eq(schema.usageEvents.userId, userId));
		await worker.start(planId);
		await worker.whenIdle(planId);
		const after = await db
			.select()
			.from(schema.usageEvents)
			.where(eq(schema.usageEvents.userId, userId));
		expect(after.length - before.length).toBe(1);
		expect(after.at(-1)?.kind).toBe('generation');
	});

	it('does not start the same plan twice in one process', async () => {
		const worker = makeWorker({ delayMs: 40 });
		const planId = await newPlan();
		expect(await worker.start(planId)).toBe('started');
		expect(await worker.start(planId)).toBe('already-running');
		await worker.whenIdle(planId);
	});

	it('does not start a plan that another process is already running (database lock)', async () => {
		const first = makeWorker({ delayMs: 60 });
		const second = makeWorker();
		const planId = await newPlan();
		expect(await first.start(planId)).toBe('started');
		expect(await second.start(planId)).toBe('locked');
		expect(await first.whenIdle(planId)).toBe('ready');
		expect(await second.start(planId)).toBe('started');
		await second.whenIdle(planId);
	});

	it('releases the lock when a run ends so the plan can be resumed', async () => {
		const worker = makeWorker({ blockAlwaysFails: [1] });
		const planId = await newPlan();
		await worker.start(planId);
		expect(await worker.whenIdle(planId)).toBe('failed');
		const retry = makeWorker();
		expect(await retry.start(planId)).toBe('started');
		expect(await retry.whenIdle(planId)).toBe('ready');
	});

	it('cancels a running plan, leaves it paused, and can resume it', async () => {
		const worker = makeWorker({ delayMs: 40 });
		const planId = await newPlan();
		await worker.start(planId);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(worker.cancel(planId)).toBe(true);
		expect(await worker.whenIdle(planId)).toBe('paused');
		expect((await store.getPlan(planId))!.status).toBe('paused');
		expect(worker.cancel(planId)).toBe(false);

		const resumed = makeWorker();
		await resumed.start(planId);
		expect(await resumed.whenIdle(planId)).toBe('ready');
		expect(await store.listDays(planId)).toHaveLength(15);
	});

	it('fails the plan with a helpful message when the key is missing', async () => {
		const worker = makeWorker({}, async () => {
			throw new MissingKeyError('google');
		});
		const planId = await newPlan();
		expect(await worker.start(planId)).toBe('no-key');
		const plan = (await store.getPlan(planId))!;
		expect(plan.status).toBe('failed');
		expect(plan.error).toContain('Add a key');
		const retry = makeWorker();
		expect(await retry.start(planId)).toBe('started');
		await retry.whenIdle(planId);
	});

	it('reports unknown plans', async () => {
		const worker = makeWorker();
		expect(await worker.start('00000000-0000-0000-0000-000000000000')).toBe('not-found');
	});

	it('streams events to subscribers while it runs', async () => {
		const bus = createEventBus();
		const worker = createPlanWorker({
			client,
			store,
			bus,
			resolveModel: async () => createFakeModel()
		});
		const planId = await newPlan();
		const types: string[] = [];
		const stop = worker.subscribe(planId, (event) => types.push(event.type));
		await worker.start(planId);
		await worker.whenIdle(planId);
		stop();
		expect(types[0]).toBe('outline_ready');
		expect(types.at(-1)).toBe('done');
		expect(types.filter((type) => type === 'block_ready')).toHaveLength(3);
		expect(bus.subscriberCount(planId)).toBe(0);
	});
});
