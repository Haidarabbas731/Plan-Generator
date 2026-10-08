import { eq } from 'drizzle-orm';
import { isRealDate } from '#lib/schedule.js';
import * as schema from '../db/schema.js';
import type { Db } from '../db/types.js';
import type { PlanStore } from '../plans/plan-store.js';
import { writeRevision } from '../plans/revisions.js';
import { PLAN_GONE, type EditResult } from './edit-shared.js';

const { plans } = schema;

export function createScheduleUpdater(deps: { db: Db; store: PlanStore }) {
	const { db, store } = deps;

	async function updateSchedule(args: {
		planId: string;
		startDate?: string;
		studyDays?: number[];
	}): Promise<EditResult> {
		const { planId, startDate, studyDays } = args;
		const plan = await store.getPlan(planId);
		if (!plan) return PLAN_GONE;
		if (startDate === undefined && studyDays === undefined) {
			return { ok: false, message: 'Say a new start date or new study days.' };
		}
		if (startDate !== undefined && !isRealDate(startDate)) {
			return { ok: false, message: 'The start date must be a real date like 2026-11-02.' };
		}
		const days =
			studyDays === undefined ? undefined : [...new Set(studyDays)].sort((a, b) => a - b);
		if (
			days &&
			(days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
		) {
			return { ok: false, message: 'Study days must be between 0 (Sunday) and 6 (Saturday).' };
		}

		const revision = await db.transaction(async (tx) => {
			await tx
				.update(plans)
				.set({
					...(startDate ? { startDate } : {}),
					...(days ? { inputs: { ...plan.inputs, studyDays: days } } : {})
				})
				.where(eq(plans.id, planId));
			return writeRevision(tx, planId, {
				source: 'chat',
				summary: [
					startDate ? `Start date set to ${startDate}` : null,
					days ? `Study days changed` : null
				]
					.filter(Boolean)
					.join(', ')
			});
		});

		return {
			ok: true,
			revision,
			summary: 'Updated the schedule.',
			changedBlocks: [],
			staleBlocks: []
		};
	}

	return updateSchedule;
}
