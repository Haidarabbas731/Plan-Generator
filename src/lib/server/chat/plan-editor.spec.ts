import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PlanInputs } from '#lib/plan-types.js';
import { createFakeModel } from '../ai/fake-model.js';
import { CHAT, REVISION_KEEP } from '../config.js';
import * as schema from '../db/schema.js';
import { runGeneration } from '../plans/generation.js';
import { createPlanStore } from '../plans/plan-store.js';
import { createRevisionStore } from '../plans/revisions.js';
import { createPlanEditor } from './plan-editor.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('plan editor and revisions (real database, fake model)', () => {
	const client = postgres(url ?? '', { max: 4 });
	const db = drizzle(client, { schema });
	const store = createPlanStore(db);
	const revisions = createRevisionStore(db);
	const editor = createPlanEditor({ db, store });
	const userId = `edit-${randomBytes(6).toString('hex')}`;

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
		await db
			.insert(schema.user)
			.values({ id: userId, name: 'Editor Test', email: `${userId}@example.com` });
	});

	afterAll(async () => {
		await db.delete(schema.user).where(eq(schema.user.id, userId));
		await client.end();
	});

	async function readyPlan() {
		const planId = await store.createPlan(userId, {
			inputs,
			provider: 'google',
			model: 'fake-model',
			startDate: '2026-10-05'
		});
		const outcome = await runGeneration({
			planId,
			store,
			model: createFakeModel(),
			signal: new AbortController().signal,
			emit: () => {}
		});
		expect(outcome).toBe('ready');
		return planId;
	}

	const learnOf = async (planId: string, day: number) =>
		(await store.listDays(planId)).find((row) => row.day === day)?.learn;

	describe('reviseBlocks', () => {
		it('rewrites the chosen block, keeps completion, marks later blocks stale and writes a revision', async () => {
			const planId = await readyPlan();
			await store.setDayCompleted(userId, planId, 4, true);

			const result = await editor.reviseBlocks({
				planId,
				model: createFakeModel(),
				fromBlock: 2,
				toBlock: 2,
				instruction: 'make it easier'
			});

			expect(result).toMatchObject({ ok: true, changedBlocks: [2], staleBlocks: [3, 4, 5] });
			expect(await learnOf(planId, 4)).toContain('Revised: make it easier');
			expect(await learnOf(planId, 1)).not.toContain('Revised');
			const day4 = (await store.listDays(planId)).find((row) => row.day === 4);
			expect(day4?.completedAt).not.toBeNull();

			const blocks = await store.listBlocks(planId);
			expect(blocks.map((block) => block.status)).toEqual([
				'ready',
				'ready',
				'stale',
				'stale',
				'stale'
			]);
			const plan = await store.getPlan(planId);
			expect(plan?.currentRevision).toBe(2);
			expect((await revisions.listRevisions(planId))[0]).toMatchObject({
				number: 2,
				source: 'chat'
			});
		});

		it('rewrites several blocks in order', async () => {
			const planId = await readyPlan();
			const result = await editor.reviseBlocks({
				planId,
				model: createFakeModel(),
				fromBlock: 1,
				toBlock: 3,
				instruction: 'add more practice'
			});
			expect(result).toMatchObject({ ok: true, changedBlocks: [1, 2, 3], staleBlocks: [4, 5] });
			expect(await learnOf(planId, 9)).toContain('Revised');
		});

		it('changes nothing when the model cannot produce a valid block', async () => {
			const planId = await readyPlan();
			const before = (await store.listDays(planId)).map((row) => row.learn);
			const result = await editor.reviseBlocks({
				planId,
				model: createFakeModel({ blockAlwaysFails: [1] }),
				fromBlock: 1,
				toBlock: 2,
				instruction: 'make it harder'
			});
			expect(result).toMatchObject({ ok: false });
			expect((result as { message: string }).message).toContain('Nothing was changed');
			expect((await store.listDays(planId)).map((row) => row.learn)).toEqual(before);
			expect((await store.getPlan(planId))?.currentRevision).toBe(1);
			expect((await store.listBlocks(planId)).every((block) => block.status === 'ready')).toBe(
				true
			);
		});

		it('rejects blocks outside the plan, backwards ranges and too many blocks', async () => {
			const planId = await readyPlan();
			const base = { planId, model: createFakeModel(), instruction: 'x' };
			expect(await editor.reviseBlocks({ ...base, fromBlock: 0, toBlock: 1 })).toMatchObject({
				ok: false
			});
			expect(await editor.reviseBlocks({ ...base, fromBlock: 3, toBlock: 2 })).toMatchObject({
				ok: false
			});
			expect(await editor.reviseBlocks({ ...base, fromBlock: 1, toBlock: 9 })).toMatchObject({
				ok: false
			});
			const tooMany = await editor.reviseBlocks({
				...base,
				fromBlock: 1,
				toBlock: CHAT.maxReviseBlocks + 1
			});
			expect(tooMany).toMatchObject({ ok: false });
			expect((tooMany as { message: string }).message).toContain(String(CHAT.maxReviseBlocks));
		});

		it('needs an instruction', async () => {
			const planId = await readyPlan();
			expect(
				await editor.reviseBlocks({
					planId,
					model: createFakeModel(),
					fromBlock: 1,
					toBlock: 1,
					instruction: '   '
				})
			).toMatchObject({ ok: false });
		});

		it('refuses while the plan is being written', async () => {
			const planId = await readyPlan();
			await store.setPlanStatus(planId, 'generating');
			const result = await editor.reviseBlocks({
				planId,
				model: createFakeModel(),
				fromBlock: 1,
				toBlock: 1,
				instruction: 'x'
			});
			expect(result).toMatchObject({ ok: false });
			expect((result as { message: string }).message).toContain('still being written');
		});
	});

	describe('restructureOutline', () => {
		it('updates the outline, marks changed blocks stale and writes a revision', async () => {
			const planId = await readyPlan();
			const result = await editor.restructureOutline({
				planId,
				model: createFakeModel(),
				instruction: 'add a week on testing'
			});
			expect(result).toMatchObject({ ok: true, changedBlocks: [1, 2, 3, 4, 5] });
			const plan = await store.getPlan(planId);
			expect(plan?.overview).toContain('Revised: add a week on testing');
			expect((await store.listBlocks(planId)).every((block) => block.status === 'stale')).toBe(
				true
			);
			expect(plan?.currentRevision).toBe(2);
			expect(await store.listDays(planId)).toHaveLength(15);
		});

		it('changes nothing when the outliner fails', async () => {
			const planId = await readyPlan();
			const result = await editor.restructureOutline({
				planId,
				model: createFakeModel({ outlineAlwaysFails: true }),
				instruction: 'add a week on testing'
			});
			expect(result).toMatchObject({ ok: false });
			expect((await store.getPlan(planId))?.currentRevision).toBe(1);
		});
	});

	describe('updateSchedule', () => {
		it('changes the start date and study days and writes a revision', async () => {
			const planId = await readyPlan();
			const result = await editor.updateSchedule({
				planId,
				startDate: '2026-11-02',
				studyDays: [6, 0, 6]
			});
			expect(result).toMatchObject({ ok: true });
			const plan = await store.getPlan(planId);
			expect(plan?.startDate).toBe('2026-11-02');
			expect(plan?.inputs.studyDays).toEqual([0, 6]);
			expect(plan?.currentRevision).toBe(2);
		});

		it('rejects an impossible date, empty or invalid days, and an empty request', async () => {
			const planId = await readyPlan();
			expect(await editor.updateSchedule({ planId, startDate: '2026-02-31' })).toMatchObject({
				ok: false
			});
			expect(await editor.updateSchedule({ planId, studyDays: [] })).toMatchObject({ ok: false });
			expect(await editor.updateSchedule({ planId, studyDays: [7] })).toMatchObject({ ok: false });
			expect(await editor.updateSchedule({ planId })).toMatchObject({ ok: false });
			expect((await store.getPlan(planId))?.currentRevision).toBe(1);
		});
	});

	describe('getPlanView', () => {
		it('summarises the plan with a compact day list', async () => {
			const planId = await readyPlan();
			const view = await editor.getPlanView(planId);
			expect(view?.blocks).toHaveLength(5);
			expect(view?.blocks[0]).toMatchObject({ block: 1, days: '1-3', status: 'ready' });
			expect(Array.isArray(view?.days) && view?.days).toHaveLength(15);
		});

		it('returns one block in full on request', async () => {
			const planId = await readyPlan();
			const view = await editor.getPlanView(planId, 2);
			const detail = view?.days as { block: number; days: { learn: string }[] };
			expect(detail.block).toBe(2);
			expect(detail.days).toHaveLength(3);
			expect(detail.days[0].learn).toContain('Study material');
		});

		it('returns nothing for an unknown plan', async () => {
			expect(await editor.getPlanView('00000000-0000-4000-8000-000000000000')).toBeNull();
		});
	});

	describe('revisions', () => {
		it('lists the revision made by generation first, then edits, newest first', async () => {
			const planId = await readyPlan();
			await editor.updateSchedule({ planId, startDate: '2026-11-02' });
			const list = await revisions.listRevisions(planId);
			expect(list.map((item) => [item.number, item.source])).toEqual([
				[2, 'chat'],
				[1, 'generation']
			]);
			expect(list[0].summary).toContain('2026-11-02');
		});

		it('restores an earlier revision, keeps completion and records the restore', async () => {
			const planId = await readyPlan();
			await editor.reviseBlocks({
				planId,
				model: createFakeModel(),
				fromBlock: 1,
				toBlock: 1,
				instruction: 'rewrite everything'
			});
			await store.setDayCompleted(userId, planId, 2, true);
			expect(await learnOf(planId, 2)).toContain('Revised');

			const restored = await revisions.restoreRevision(planId, 1);
			expect(restored?.number).toBe(3);

			expect(await learnOf(planId, 2)).not.toContain('Revised');
			const day2 = (await store.listDays(planId)).find((row) => row.day === 2);
			expect(day2?.completedAt).not.toBeNull();
			expect((await store.listBlocks(planId)).map((block) => block.status)).toEqual([
				'ready',
				'ready',
				'ready',
				'ready',
				'ready'
			]);
			expect((await revisions.listRevisions(planId))[0]).toMatchObject({
				number: 3,
				source: 'restore'
			});
		});

		it('restores the schedule together with the content', async () => {
			const planId = await readyPlan();
			await editor.updateSchedule({ planId, startDate: '2026-12-07', studyDays: [6] });
			await revisions.restoreRevision(planId, 1);
			const plan = await store.getPlan(planId);
			expect(plan?.startDate).toBe('2026-10-05');
			expect(plan?.inputs.studyDays).toEqual([1, 2, 3, 4, 5]);
		});

		it('returns nothing for a revision that does not exist', async () => {
			const planId = await readyPlan();
			expect(await revisions.restoreRevision(planId, 99)).toBeNull();
		});

		it('keeps only the newest revisions', async () => {
			const planId = await readyPlan();
			for (let i = 0; i < REVISION_KEEP + 3; i++) {
				const startDate = new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10);
				await editor.updateSchedule({ planId, startDate });
			}
			const list = await revisions.listRevisions(planId);
			expect(list).toHaveLength(REVISION_KEEP);
			expect(list[0].number).toBe(REVISION_KEEP + 4);
			expect(list[list.length - 1].number).toBe(5);
		});

		it('finds the number of a revision by its id for one plan only', async () => {
			const planId = await readyPlan();
			const other = await readyPlan();
			const [first] = await revisions.listRevisions(planId);
			expect(await revisions.findRevisionNumber(planId, first.id)).toBe(1);
			expect(await revisions.findRevisionNumber(other, first.id)).toBeNull();
		});
	});
});
