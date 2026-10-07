import type { PlanBlockView, PlanDayView } from '#lib/plan-types.js';
import type { BlockRow, DayRow } from './plan-store.js';

export function toBlockView(block: BlockRow): PlanBlockView {
	return {
		id: block.id,
		idx: block.idx,
		startDay: block.startDay,
		endDay: block.endDay,
		theme: block.theme,
		objective: block.objective,
		milestone: block.milestone,
		status: block.status,
		error: block.error
	};
}

export function toDayView(day: DayRow): PlanDayView {
	return {
		day: day.day,
		blockId: day.blockId,
		title: day.title,
		learn: day.learn,
		practice: day.practice,
		review: day.review,
		minutes: day.minutes,
		completed: day.completedAt !== null
	};
}
