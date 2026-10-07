import { scheduleDates } from './schedule.js';

export interface ProgressDay {
	day: number;
	completed: boolean;
}

export function dayProgress(days: ProgressDay[]): { done: number; total: number; ratio: number } {
	const total = days.length;
	const done = days.filter((day) => day.completed).length;
	return { done, total, ratio: total === 0 ? 0 : done / total };
}

export function streak(
	startDate: string,
	studyDays: number[],
	days: ProgressDay[],
	today: string
): number {
	if (days.length === 0) return 0;
	const completed = new Set(days.filter((day) => day.completed).map((day) => day.day));
	const dates = scheduleDates(startDate, studyDays, Math.max(...days.map((day) => day.day)));

	let index = -1;
	for (let i = dates.length - 1; i >= 0; i--) {
		if (dates[i] <= today) {
			index = i;
			break;
		}
	}
	if (index < 0) return 0;

	if (dates[index] === today && !completed.has(index + 1)) index -= 1;

	let count = 0;
	for (let i = index; i >= 0 && completed.has(i + 1); i--) count += 1;
	return count;
}

export function behindBy(
	startDate: string,
	studyDays: number[],
	daysTotal: number,
	days: ProgressDay[],
	today: string
): number {
	const completed = new Set(days.filter((day) => day.completed).map((day) => day.day));
	const dates = scheduleDates(startDate, studyDays, daysTotal);
	let missed = 0;
	for (let i = 0; i < dates.length; i++) {
		if (dates[i] < today && !completed.has(i + 1)) missed += 1;
	}
	return missed;
}
