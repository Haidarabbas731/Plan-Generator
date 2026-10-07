import { and, asc, desc, eq, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
	BlockStatus,
	LedgerEntry,
	Milestone,
	PlanInputs,
	RevisionSource
} from '#lib/plan-types.js';
import { REVISION_KEEP } from '../config.js';
import * as schema from '../db/schema.js';

const { plans, planBlocks, planDays, planRevisions } = schema;

type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Executor = Db | Tx;

export interface SnapshotBlock {
	idx: number;
	startDay: number;
	endDay: number;
	theme: string;
	objective: string;
	covers: string[];
	notCovers: string[];
	milestone: Milestone;
	status: BlockStatus;
	error: string | null;
}

export interface SnapshotDay {
	day: number;
	title: string;
	learn: string;
	practice: string;
	review: string;
	minutes: number;
}

export interface PlanSnapshot {
	plan: {
		title: string;
		overview: string | null;
		finalOutcome: string | null;
		topicTag: string | null;
		ledger: LedgerEntry[];
		startDate?: string;
		studyDays?: number[];
	};
	blocks: SnapshotBlock[];
	days: SnapshotDay[];
}

export interface RevisionInfo {
	id: string;
	number: number;
	source: RevisionSource;
	summary: string | null;
	createdAt: Date;
}

export interface WrittenRevision {
	id: string;
	number: number;
}

export async function takeSnapshot(exec: Executor, planId: string): Promise<PlanSnapshot> {
	const [plan] = await exec.select().from(plans).where(eq(plans.id, planId)).limit(1);
	const blocks = await exec
		.select()
		.from(planBlocks)
		.where(eq(planBlocks.planId, planId))
		.orderBy(asc(planBlocks.idx));
	const days = await exec
		.select()
		.from(planDays)
		.where(eq(planDays.planId, planId))
		.orderBy(asc(planDays.day));

	return {
		plan: {
			title: plan.title,
			overview: plan.overview,
			finalOutcome: plan.finalOutcome,
			topicTag: plan.topicTag,
			ledger: plan.ledger,
			startDate: plan.startDate,
			studyDays: plan.inputs.studyDays
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
}

export async function writeRevision(
	tx: Tx,
	planId: string,
	input: { source: RevisionSource; summary?: string | null; messageId?: string | null }
): Promise<WrittenRevision> {
	const snapshot = await takeSnapshot(tx, planId);
	const [plan] = await tx
		.select({ currentRevision: plans.currentRevision })
		.from(plans)
		.where(eq(plans.id, planId))
		.limit(1);

	const number = plan.currentRevision + 1;
	const [row] = await tx
		.insert(planRevisions)
		.values({
			planId,
			number,
			snapshot,
			source: input.source,
			summary: input.summary ?? null,
			messageId: input.messageId ?? null
		})
		.returning({ id: planRevisions.id });
	await tx.update(plans).set({ currentRevision: number }).where(eq(plans.id, planId));
	await tx
		.delete(planRevisions)
		.where(
			and(eq(planRevisions.planId, planId), lte(planRevisions.number, number - REVISION_KEEP))
		);
	return { id: row.id, number };
}

export function createRevisionStore(db: Db) {
	return {
		async listRevisions(planId: string): Promise<RevisionInfo[]> {
			return db
				.select({
					id: planRevisions.id,
					number: planRevisions.number,
					source: planRevisions.source,
					summary: planRevisions.summary,
					createdAt: planRevisions.createdAt
				})
				.from(planRevisions)
				.where(eq(planRevisions.planId, planId))
				.orderBy(desc(planRevisions.number));
		},

		async findRevisionNumber(planId: string, revisionId: string): Promise<number | null> {
			const [row] = await db
				.select({ number: planRevisions.number })
				.from(planRevisions)
				.where(and(eq(planRevisions.planId, planId), eq(planRevisions.id, revisionId)))
				.limit(1);
			return row?.number ?? null;
		},

		async restoreRevision(planId: string, number: number): Promise<WrittenRevision | null> {
			return db.transaction(async (tx) => {
				const [revision] = await tx
					.select({ snapshot: planRevisions.snapshot })
					.from(planRevisions)
					.where(and(eq(planRevisions.planId, planId), eq(planRevisions.number, number)))
					.limit(1);
				if (!revision) return null;
				const snapshot = revision.snapshot as PlanSnapshot;

				const completion = new Map(
					(
						await tx
							.select({ day: planDays.day, completedAt: planDays.completedAt })
							.from(planDays)
							.where(eq(planDays.planId, planId))
					).map((row) => [row.day, row.completedAt])
				);

				const [current] = await tx
					.select({ inputs: plans.inputs })
					.from(plans)
					.where(eq(plans.id, planId))
					.limit(1);
				const inputs: PlanInputs = snapshot.plan.studyDays
					? { ...current.inputs, studyDays: snapshot.plan.studyDays }
					: current.inputs;

				await tx
					.update(plans)
					.set({
						title: snapshot.plan.title,
						overview: snapshot.plan.overview,
						finalOutcome: snapshot.plan.finalOutcome,
						topicTag: snapshot.plan.topicTag,
						ledger: snapshot.plan.ledger,
						inputs,
						...(snapshot.plan.startDate ? { startDate: snapshot.plan.startDate } : {})
					})
					.where(eq(plans.id, planId));

				await tx.delete(planBlocks).where(eq(planBlocks.planId, planId));
				const inserted = await tx
					.insert(planBlocks)
					.values(
						snapshot.blocks.map((block) => ({
							planId,
							idx: block.idx,
							startDay: block.startDay,
							endDay: block.endDay,
							theme: block.theme,
							objective: block.objective,
							covers: block.covers,
							notCovers: block.notCovers,
							milestone: block.milestone,
							status: block.status === 'writing' ? ('pending' as const) : block.status,
							error: block.error
						}))
					)
					.returning({
						id: planBlocks.id,
						startDay: planBlocks.startDay,
						endDay: planBlocks.endDay
					});

				const dayRows = snapshot.days.flatMap((day) => {
					const block = inserted.find((b) => day.day >= b.startDay && day.day <= b.endDay);
					if (!block) return [];
					return [
						{
							planId,
							blockId: block.id,
							day: day.day,
							title: day.title,
							learn: day.learn,
							practice: day.practice,
							review: day.review,
							minutes: day.minutes,
							completedAt: completion.get(day.day) ?? null
						}
					];
				});
				if (dayRows.length > 0) await tx.insert(planDays).values(dayRows);

				return writeRevision(tx, planId, {
					source: 'restore',
					summary: `Restored revision ${number}`
				});
			});
		}
	};
}

export type RevisionStore = ReturnType<typeof createRevisionStore>;
