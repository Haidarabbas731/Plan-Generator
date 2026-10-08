import { describe, expect, it } from 'vitest';
import { summarizePlan } from './plan-summary.js';

const base = {
	daysTotal: 6,
	hoursPerDay: 1,
	blockSize: 3,
	studyDays: ['0', '1', '2', '3', '4', '5', '6'],
	startDate: '2026-10-08',
	maxPlanDays: 365
};

describe('summarizePlan', () => {
	it('sums hours, weeks, blocks and model calls', () => {
		const summary = summarizePlan(base);
		expect(summary).toMatchObject({ totalHours: 6, weeks: 1, blocks: 2, calls: 3 });
	});

	it('returns null while a number is missing or out of range', () => {
		expect(summarizePlan({ ...base, daysTotal: null })).toBeNull();
		expect(summarizePlan({ ...base, daysTotal: 366 })).toBeNull();
		expect(summarizePlan({ ...base, daysTotal: 2.5 })).toBeNull();
		expect(summarizePlan({ ...base, hoursPerDay: 0 })).toBeNull();
	});

	it('returns null without study days or with an invalid start date', () => {
		expect(summarizePlan({ ...base, studyDays: [] })).toBeNull();
		expect(summarizePlan({ ...base, startDate: '2026-02-31' })).toBeNull();
	});
});
