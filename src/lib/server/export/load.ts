import type { PlanStore } from '../plans/plan-store.js';
import { toBlockView, toDayView } from '../plans/views.js';
import type { ExportData } from './types.js';

export async function loadExportData(
	store: Pick<PlanStore, 'getOwnedPlan' | 'listBlocks' | 'listDays'>,
	userId: string,
	planId: string
): Promise<ExportData | null> {
	const plan = await store.getOwnedPlan(userId, planId);
	if (!plan) return null;

	const [blocks, days] = await Promise.all([store.listBlocks(plan.id), store.listDays(plan.id)]);

	return {
		plan: {
			id: plan.id,
			title: plan.title,
			goal: plan.goal,
			overview: plan.overview,
			finalOutcome: plan.finalOutcome,
			startDate: plan.startDate,
			studyDays: plan.inputs.studyDays,
			daysTotal: plan.inputs.daysTotal,
			minutesPerDay: plan.inputs.minutesPerDay
		},
		blocks: blocks.map(toBlockView),
		days: days.map(toDayView)
	};
}
