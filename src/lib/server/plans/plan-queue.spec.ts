import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PlanInputs } from '#lib/plan-types.js';
import { createFakeModel } from '../ai/fake-model.js';
import * as schema from '../db/schema.js';
import { createPlanQueue } from './plan-queue.js';
import { createPlanStore } from './plan-store.js';
import { createRedisEventBus } from './redis-events.js';
import { createPlanWorker } from './worker.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;

describe.skipIf(!databaseUrl || !redisUrl)(
	'plan queue (real Postgres and Redis)',
	{ timeout: 20_000 },
	() => {
		const client = postgres(databaseUrl ?? '', { max: 6 });
		const db = drizzle(client, { schema });
		const store = createPlanStore(db);
		const userId = `que-${randomBytes(6).toString('hex')}`;
		const name = `test-${randomBytes(4).toString('hex')}`;
		const closers: Array<() => Promise<void>> = [];

		const inputs: PlanInputs = {
			goal: 'Learn Rust',
			level: null,
			studyDays: [1, 2, 3, 4, 5],
			doneLooksLike: null,
			daysTotal: 15,
			minutesPerDay: 60,
			blockSize: 5
		};

		beforeAll(async () => {
			await db.insert(schema.user).values({
				id: userId,
				name: 'Queue Test',
				email: `${userId}@example.com`
			});
		});

		afterAll(async () => {
			for (const close of closers) await close();
			await db.delete(schema.user).where(eq(schema.user.id, userId));
			await client.end();
		});

		function setup(
			delayMs = 0,
			timings: { lockDurationMs?: number; stalledIntervalMs?: number } = {}
		) {
			const queueName = `${name}-${randomBytes(3).toString('hex')}`;
			const bus = createRedisEventBus(redisUrl!, `${queueName}-events`);
			const worker = createPlanWorker({
				client,
				store,
				bus,
				resolveModel: async () => createFakeModel({ delayMs })
			});
			const queue = createPlanQueue({
				url: redisUrl!,
				worker,
				store,
				bus,
				name: queueName,
				...timings
			});
			closers.push(async () => {
				await queue.close();
				await bus.close();
			});
			return { bus, queue };
		}

		const newPlan = () =>
			store.createPlan(userId, {
				inputs,
				provider: 'google',
				model: 'fake-model',
				startDate: '2026-10-08'
			});

		async function waitForStatus(planId: string, status: string) {
			for (let i = 0; i < 200; i++) {
				if ((await store.getPlan(planId))?.status === status) return;
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			throw new Error(`Plan never reached ${status}`);
		}

		it('runs a queued plan to completion and publishes events through Redis', async () => {
			const { bus, queue } = setup();
			const planId = await newPlan();
			const types: string[] = [];
			bus.subscribe(planId, (event) => types.push(event.type));
			await queue.enqueue(planId);
			await waitForStatus(planId, 'ready');
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(await store.listDays(planId)).toHaveLength(15);
			expect(types[0]).toBe('outline_ready');
			expect(types.at(-1)).toBe('done');
		});

		it('cancels a running plan and leaves it paused', async () => {
			const { queue } = setup(300);
			const planId = await newPlan();
			await queue.enqueue(planId);
			await new Promise((resolve) => setTimeout(resolve, 500));
			expect(await queue.cancel(planId)).toBe(true);
			await waitForStatus(planId, 'paused');
		});

		it('pauses generating plans that have no job, and leaves queued ones alone', async () => {
			const { queue } = setup();
			const orphan = await newPlan();
			expect(await queue.recoverInterruptedPlans()).toBeGreaterThanOrEqual(1);
			expect((await store.getPlan(orphan))!.status).toBe('paused');
		});

		it('finishes a plan on another worker after the first process is killed', async () => {
			const crashName = `${name}-crash`;
			const child = spawn('bun', ['src/lib/server/plans/testing/queue-child.ts'], {
				env: {
					...process.env,
					DATABASE_URL: databaseUrl,
					REDIS_URL: redisUrl,
					QUEUE_NAME: crashName,
					DELAY_MS: '250'
				},
				stdio: ['ignore', 'pipe', 'inherit']
			});
			await new Promise<void>((resolve) => child.stdout.on('data', () => resolve()));

			const bus = createRedisEventBus(redisUrl!, `${crashName}-events`);
			const producer = createPlanQueue({
				url: redisUrl!,
				worker: createPlanWorker({
					client,
					store,
					bus,
					resolveModel: async () => createFakeModel()
				}),
				store,
				bus,
				name: crashName,
				concurrency: 1,
				lockDurationMs: 1500,
				stalledIntervalMs: 500
			});
			closers.push(async () => {
				await producer.close(true);
				await bus.close();
			});

			const planId = await newPlan();
			await producer.enqueue(planId);

			for (let i = 0; i < 100; i++) {
				const blocks = await store.listBlocks(planId);
				if (blocks.some((block) => block.status === 'ready')) break;
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
			child.kill('SIGKILL');
			expect((await store.getPlan(planId))!.status).toBe('generating');

			await waitForStatus(planId, 'ready');
			expect(await store.listDays(planId)).toHaveLength(15);
			const usage = await db
				.select()
				.from(schema.usageEvents)
				.where(eq(schema.usageEvents.userId, userId));
			expect(usage.length).toBeGreaterThanOrEqual(1);
		}, 30_000);
	}
);
