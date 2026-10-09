import { LIMITS } from './limits.js';
import { formatDate } from './format.js';
import { planBlockRanges } from './plan-blocks.js';
import { endDate, isRealDate, weeksSpanned } from './schedule.js';

export interface PlanSummary {
	totalHours: number;
	weeks: number;
	end: string;
	blocks: number;
	calls: number;
}

export function summarizePlan(input: {
	daysTotal: number | null;
	hoursPerDay: number | null;
	blockSize: number | null;
	studyDays: string[];
	startDate: string;
	maxPlanDays: number;
}): PlanSummary | null {
	const { daysTotal: days, hoursPerDay: hours, blockSize: size, studyDays, startDate } = input;
	if (!days || !hours || !size) return null;
	if (!Number.isInteger(days) || days < LIMITS.minPlanDays || days > input.maxPlanDays) return null;
	if (hours <= 0 || studyDays.length === 0 || !isRealDate(startDate)) return null;
	const weekdays = studyDays.map(Number);
	const end = endDate(startDate, weekdays, days);
	if (!end) return null;
	const blocks = planBlockRanges(days, size).length;
	return {
		totalHours: Math.round(days * hours * 10) / 10,
		weeks: weeksSpanned(startDate, weekdays, days),
		end: formatDate(end, 'date'),
		blocks,
		calls: blocks + 1
	};
}
