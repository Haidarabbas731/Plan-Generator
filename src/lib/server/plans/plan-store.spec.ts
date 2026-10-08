import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PlanInputs } from '#lib/plan-types.js';
import * as schema from '../db/schema.js';
import { createPlanStore } from './plan-store.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('plan store reads and day completion (real database)', () => {
	const client = postgres(url ?? '', { max: 2 });
	const db = drizzle(client, { schema });
	const store = createPlanStore(db);
	const userId = `ps-${randomBytes(6).toString('hex')}`;
	const otherId = `ps-${randomBytes(6).toString('hex')}`;

	const inputs: PlanInputs = {
		goal: 'Learn Rust',
		level: null,
		studyDays: [1, 3, 5],
		doneLooksLike: null,
		daysTotal: 6,
		minutesPerDay: 60,
		blockSize: 3
	};

	beforeAll(async () => {
		for (const id of [userId, otherId]) {
			await db
				.insert(schema.user)
				.values({ id, name: 'Plan Store Test', email: `${id}@example.com` });
		}
	});

	afterAll(async () => {
		for (const id of [userId, otherId]) {
			await db.delete(schema.user).where(eq(schema.user.id, id));
		}
		await client.end();
	});

	async function planWithDays(owner: string) {
		const planId = await store.createPlan(owner, {
			inputs,
			provider: 'google',
			model: 'fake-model',
			startDate: '2026-10-05'
		});
		await store.saveOutline(planId, {
			title: 'Rust basics',
			overview: 'overview',
			finalOutcome: 'outcome',
			topicTag: 'rust',
			blocks: [
				{
					index: 1,
					startDay: 1,
					endDay: 3,
					theme: 'Start',
					objective: 'Begin',
					covers: ['a'],
					notCovers: ['b'],
					milestone: { title: 'm', description: 'd', successCriteria: 's' }
				}
			]
		});
		const [block] = await store.listBlocks(planId);
		await store.saveBlockDays(
			planId,
			block.id,
			[1, 2, 3].map((day) => ({
				day,
				title: `Day ${day}`,
				learn: 'learn',
				practice: 'practice',
				review: 'review',
				minutes: 60,
				topics: ['topic']
			})),
			[]
		);
		return planId;
	}

	it('lists summaries with progress, newest first, for the owner only', async () => {
		const first = await planWithDays(userId);
		const second = await planWithDays(userId);
		await planWithDays(otherId);

		expect(await store.setDayCompleted(userId, first, 1, true)).toBe(true);

		const summaries = await store.listPlanSummaries(userId);
		expect(summaries).toHaveLength(2);
		const firstSummary = summaries.find((s) => s.id === first)!;
		expect(firstSummary).toMatchObject({
			daysDone: 1,
			daysWritten: 3,
			daysTotal: 6,
			studyDays: [1, 3, 5],
			title: 'Rust basics'
		});
		expect(summaries.find((s) => s.id === second)).toMatchObject({ daysDone: 0 });
	});

	it('lists a plan with no written days', async () => {
		const planId = await store.createPlan(userId, {
			inputs,
			provider: 'google',
			model: 'fake-model',
			startDate: '2026-10-05'
		});
		const summaries = await store.listPlanSummaries(userId);
		expect(summaries.find((s) => s.id === planId)).toMatchObject({ daysDone: 0, daysWritten: 0 });
	});

	it('completes and un-completes a day', async () => {
		const planId = await planWithDays(userId);
		expect(await store.setDayCompleted(userId, planId, 2, true)).toBe(true);
		expect((await store.listDays(planId)).find((d) => d.day === 2)?.completedAt).not.toBeNull();
		expect(await store.setDayCompleted(userId, planId, 2, false)).toBe(true);
		expect((await store.listDays(planId)).find((d) => d.day === 2)?.completedAt).toBeNull();
	});

	it("refuses another user's plan and unknown days", async () => {
		const planId = await planWithDays(userId);
		expect(await store.setDayCompleted(otherId, planId, 1, true)).toBe(false);
		expect(await store.setDayCompleted(userId, planId, 99, true)).toBe(false);
		expect(await store.deleteOwnedPlan(otherId, planId)).toBe(false);
	});

	it('deletes an owned plan with its blocks and days', async () => {
		const planId = await planWithDays(userId);
		expect(await store.deleteOwnedPlan(userId, planId)).toBe(true);
		expect(await store.getPlan(planId)).toBeUndefined();
		expect(await store.listDays(planId)).toEqual([]);
	});

	it('lists recent usage of one user and drops events older than a day on write', async () => {
		const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
		const older = new Date(Date.now() - 90 * 60 * 1000);
		await db.insert(schema.usageEvents).values([
			{ userId, kind: 'chat', createdAt: old },
			{ userId, kind: 'chat', createdAt: older },
			{ userId: otherId, kind: 'chat' }
		]);
		await store.recordUsage(userId, 'generation');

		const lastHour = await store.usageSince(userId, new Date(Date.now() - 60 * 60 * 1000));
		expect(lastHour).toHaveLength(1);
		const lastDay = await store.usageSince(userId, new Date(Date.now() - 24 * 60 * 60 * 1000));
		expect(lastDay).toHaveLength(2);
		const everything = await db
			.select()
			.from(schema.usageEvents)
			.where(eq(schema.usageEvents.userId, userId));
		expect(everything).toHaveLength(2);
		expect(await store.usageSince(otherId, new Date(0))).toHaveLength(1);
	});
});
