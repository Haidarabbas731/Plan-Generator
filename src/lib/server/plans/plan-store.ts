import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
	BlockStatus,
	LedgerEntry,
	PlanInputs,
	PlanStatus,
	PlanSummary,
	RevisionSource,
	UsageKind
} from '#lib/plan-types.js';
import type { Provider } from '#lib/providers.js';
import type { DayOutput, Outline } from '../ai/types.js';
import * as schema from '../db/schema.js';
import { writeRevision } from './revisions.js';

const { plans, planBlocks, planDays, usageEvents } = schema;

export type Db = PostgresJsDatabase<typeof schema>;
export type PlanRow = typeof plans.$inferSelect;
export type BlockRow = typeof planBlocks.$inferSelect;
export type DayRow = typeof planDays.$inferSelect;

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

		async listPlanSummaries(userId: string): Promise<PlanSummary[]> {
			const rows = await db
				.select({
					id: plans.id,
					title: plans.title,
					topicTag: plans.topicTag,
					status: plans.status,
					provider: plans.provider,
					model: plans.model,
					startDate: plans.startDate,
					inputs: plans.inputs,
					updatedAt: plans.updatedAt,
					daysDone: sql<number>`count(${planDays.id}) filter (where ${planDays.completedAt} is not null)::int`,
					daysWritten: sql<number>`count(${planDays.id})::int`
				})
				.from(plans)
				.leftJoin(planDays, eq(planDays.planId, plans.id))
				.where(eq(plans.userId, userId))
				.groupBy(plans.id)
				.orderBy(desc(plans.updatedAt));
			return rows.map(({ inputs, ...row }) => ({
				...row,
				daysTotal: inputs.daysTotal,
				studyDays: inputs.studyDays
			}));
		},

		async setDayCompleted(
			userId: string,
			planId: string,
			day: number,
			completed: boolean
		): Promise<boolean> {
			const owned = await db
				.select({ id: plans.id })
				.from(plans)
				.where(and(eq(plans.id, planId), eq(plans.userId, userId)))
				.limit(1);
			if (owned.length === 0) return false;
			const rows = await db
				.update(planDays)
				.set({ completedAt: completed ? new Date() : null })
				.where(and(eq(planDays.planId, planId), eq(planDays.day, day)))
				.returning({ id: planDays.id });
			return rows.length > 0;
		},

		async deleteOwnedPlan(userId: string, planId: string): Promise<boolean> {
			const rows = await db
				.delete(plans)
				.where(and(eq(plans.id, planId), eq(plans.userId, userId)))
				.returning({ id: plans.id });
			return rows.length > 0;
		},

		async setPlanModel(
			userId: string,
			planId: string,
			provider: Provider,
			model: string
		): Promise<boolean> {
			const rows = await db
				.update(plans)
				.set({ provider, model })
				.where(and(eq(plans.id, planId), eq(plans.userId, userId)))
				.returning({ id: plans.id });
			return rows.length > 0;
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
			const revision = await db.transaction((tx) => writeRevision(tx, planId, { source }));
			return revision.number;
		},

		async recordUsage(userId: string, kind: UsageKind): Promise<void> {
			await db.insert(usageEvents).values({ userId, kind });
		},

		async listGeneratingPlanIds(): Promise<string[]> {
			const rows = await db
				.select({ id: plans.id })
				.from(plans)
				.where(eq(plans.status, 'generating'));
			return rows.map((row) => row.id);
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
