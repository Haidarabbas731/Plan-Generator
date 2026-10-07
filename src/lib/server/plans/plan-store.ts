import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
	BlockStatus,
	LedgerEntry,
	PlanInputs,
	PlanStatus,
	RevisionSource,
	UsageKind
} from '#lib/plan-types.js';
import type { Provider } from '#lib/providers.js';
import type { DayOutput, Outline } from '../ai/types.js';
import * as schema from '../db/schema.js';

const { plans, planBlocks, planDays, planRevisions, usageEvents } = schema;

export type Db = PostgresJsDatabase<typeof schema>;
export type PlanRow = typeof plans.$inferSelect;
export type BlockRow = typeof planBlocks.$inferSelect;
export type DayRow = typeof planDays.$inferSelect;

export interface PlanSnapshot {
	plan: Pick<PlanRow, 'title' | 'overview' | 'finalOutcome' | 'topicTag' | 'ledger'>;
	blocks: Omit<BlockRow, 'id' | 'planId'>[];
	days: Omit<DayRow, 'id' | 'planId' | 'blockId' | 'completedAt'>[];
}

export function createPlanStore(db: Db) {
	return {
		async createPlan(
			userId: string,
			input: { inputs: PlanInputs; provider: Provider; model: string; startDate: string }
		): Promise<string> {
			const [row] = await db
				.insert(plans)
				.values({
					userId,
					title: input.inputs.goal.slice(0, 80),
					goal: input.inputs.goal,
					inputs: input.inputs,
					provider: input.provider,
					model: input.model,
					startDate: input.startDate
				})
				.returning({ id: plans.id });
			return row.id;
		},

		async getPlan(planId: string): Promise<PlanRow | undefined> {
			const [row] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
			return row;
		},

		async getOwnedPlan(userId: string, planId: string): Promise<PlanRow | undefined> {
			const [row] = await db
				.select()
				.from(plans)
				.where(and(eq(plans.id, planId), eq(plans.userId, userId)))
				.limit(1);
			return row;
		},

		async countPlans(userId: string): Promise<number> {
			const [row] = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(plans)
				.where(eq(plans.userId, userId));
			return row.count;
		},

		async saveOutline(planId: string, outline: Outline): Promise<void> {
			await db.transaction(async (tx) => {
				await tx
					.update(plans)
					.set({
						title: outline.title,
						overview: outline.overview,
						finalOutcome: outline.finalOutcome,
						topicTag: outline.topicTag
					})
					.where(eq(plans.id, planId));
				await tx.delete(planBlocks).where(eq(planBlocks.planId, planId));
				await tx.insert(planBlocks).values(
					outline.blocks.map((block) => ({
						planId,
						idx: block.index,
						startDay: block.startDay,
						endDay: block.endDay,
						theme: block.theme,
						objective: block.objective,
						covers: block.covers,
						notCovers: block.notCovers,
						milestone: block.milestone
					}))
				);
			});
		},

		async listBlocks(planId: string): Promise<BlockRow[]> {
			return db
				.select()
				.from(planBlocks)
				.where(eq(planBlocks.planId, planId))
				.orderBy(asc(planBlocks.idx));
		},

		async setBlockStatus(
			planId: string,
			idx: number,
			status: BlockStatus,
			error: string | null = null
		): Promise<void> {
			await db
				.update(planBlocks)
				.set({ status, error })
				.where(and(eq(planBlocks.planId, planId), eq(planBlocks.idx, idx)));
			await db.update(plans).set({ updatedAt: new Date() }).where(eq(plans.id, planId));
		},

		async saveBlockDays(
			planId: string,
			blockId: string,
			days: DayOutput[],
			ledger: LedgerEntry[]
		): Promise<void> {
			await db.transaction(async (tx) => {
				await tx.delete(planDays).where(eq(planDays.blockId, blockId));
				await tx.insert(planDays).values(
					days.map((day) => ({
						planId,
						blockId,
						day: day.day,
						title: day.title.trim(),
						learn: day.learn.trim(),
						practice: day.practice.trim(),
						review: day.review.trim(),
						minutes: day.minutes
					}))
				);
				await tx
					.update(planBlocks)
					.set({ status: 'ready', error: null })
					.where(eq(planBlocks.id, blockId));
				await tx.update(plans).set({ ledger, updatedAt: new Date() }).where(eq(plans.id, planId));
			});
		},

		async listDays(planId: string): Promise<DayRow[]> {
			return db
				.select()
				.from(planDays)
				.where(eq(planDays.planId, planId))
				.orderBy(asc(planDays.day));
		},

		async listBlockDays(blockId: string): Promise<DayRow[]> {
			return db
				.select()
				.from(planDays)
				.where(eq(planDays.blockId, blockId))
				.orderBy(asc(planDays.day));
		},

		async setPlanStatus(
			planId: string,
			status: PlanStatus,
			error: string | null = null
		): Promise<void> {
			await db
				.update(plans)
				.set({ status, error, updatedAt: new Date() })
				.where(eq(plans.id, planId));
		},

		async saveRevision(planId: string, source: RevisionSource): Promise<number> {
			return db.transaction(async (tx) => {
				const [plan] = await tx.select().from(plans).where(eq(plans.id, planId)).limit(1);
				const blocks = await tx
					.select()
					.from(planBlocks)
					.where(eq(planBlocks.planId, planId))
					.orderBy(asc(planBlocks.idx));
				const days = await tx
					.select()
					.from(planDays)
					.where(eq(planDays.planId, planId))
					.orderBy(asc(planDays.day));

				const snapshot: PlanSnapshot = {
					plan: {
						title: plan.title,
						overview: plan.overview,
						finalOutcome: plan.finalOutcome,
						topicTag: plan.topicTag,
						ledger: plan.ledger
					},
					blocks: blocks.map((block) => ({
						idx: block.idx,
						startDay: block.startDay,
						endDay: block.endDay,
						theme: block.theme,
						objective: block.objective,
						covers: block.covers,
						notCovers: block.notCovers,
						milestone: block.milestone,
						status: block.status,
						error: block.error
					})),
					days: days.map((day) => ({
						day: day.day,
						title: day.title,
						learn: day.learn,
						practice: day.practice,
						review: day.review,
						minutes: day.minutes
					}))
				};

				const number = plan.currentRevision + 1;
				await tx.insert(planRevisions).values({ planId, number, snapshot, source });
				await tx.update(plans).set({ currentRevision: number }).where(eq(plans.id, planId));
				return number;
			});
		},

		async recordUsage(userId: string, kind: UsageKind): Promise<void> {
			await db.insert(usageEvents).values({ userId, kind });
		},

		async markGeneratingPlansPaused(onlyPlanIds?: string[]): Promise<number> {
			const scope = onlyPlanIds ? inArray(plans.id, onlyPlanIds) : undefined;
			const rows = await db
				.update(plans)
				.set({ status: 'paused' })
				.where(and(eq(plans.status, 'generating'), scope))
				.returning({ id: plans.id });
			const pausedIds = rows.map((row) => row.id);
			if (pausedIds.length > 0) {
				await db
					.update(planBlocks)
					.set({ status: 'pending' })
					.where(and(eq(planBlocks.status, 'writing'), inArray(planBlocks.planId, pausedIds)));
			}
			return pausedIds.length;
		}
	};
}

export type PlanStore = ReturnType<typeof createPlanStore>;
