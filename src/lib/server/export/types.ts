import type { PlanBlockView, PlanDayView } from '#lib/plan-types.js';

export interface ExportPlan {
	id: string;
	title: string;
	goal: string;
	overview: string | null;
	finalOutcome: string | null;
	startDate: string;
	studyDays: number[];
	daysTotal: number;
	minutesPerDay: number;
}

export interface ExportData {
	plan: ExportPlan;
	blocks: PlanBlockView[];
	days: PlanDayView[];
}
