import type { PlanStore } from '../plans/plan-store.js';

export interface PlanView {
	title: string;
	goal: string;
	overview: string | null;
	finalOutcome: string | null;
	status: string;
	startDate: string;
	studyDays: number[];
	daysTotal: number;
	minutesPerDay: number;
	blocks: {
		block: number;
		theme: string;
		objective: string;
		days: string;
		status: string;
		milestone: string;
	}[];
	days: { day: number; title: string; completed: boolean }[] | { block: number; days: unknown[] };
}

export function createPlanViewer(deps: { store: PlanStore }) {
	const { store } = deps;

	async function getPlanView(planId: string, blockNumber?: number): Promise<PlanView | null> {
		const plan = await store.getPlan(planId);
		if (!plan) return null;
		const [blocks, days] = await Promise.all([store.listBlocks(planId), store.listDays(planId)]);

		const view: PlanView = {
			title: plan.title,
			goal: plan.goal,
			overview: plan.overview,
			finalOutcome: plan.finalOutcome,
			status: plan.status,
			startDate: plan.startDate,
			studyDays: plan.inputs.studyDays,
			daysTotal: plan.inputs.daysTotal,
			minutesPerDay: plan.inputs.minutesPerDay,
			blocks: blocks.map((block) => ({
				block: block.idx + 1,
				theme: block.theme,
				objective: block.objective,
				days: `${block.startDay}-${block.endDay}`,
				status: block.status,
				milestone: block.milestone.title
			})),
			days: days.map((day) => ({
				day: day.day,
				title: day.title,
				completed: day.completedAt !== null
			}))
		};

		const chosen = blockNumber === undefined ? undefined : blocks[blockNumber - 1];
		if (chosen) {
			view.days = {
				block: chosen.idx + 1,
				days: days
					.filter((day) => day.blockId === chosen.id)
					.map((day) => ({
						day: day.day,
						title: day.title,
						learn: day.learn,
						practice: day.practice,
						review: day.review,
						minutes: day.minutes
					}))
			};
		}
		return view;
	}

	return getPlanView;
}
