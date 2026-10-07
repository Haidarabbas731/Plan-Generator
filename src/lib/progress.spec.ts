import { describe, expect, it } from 'vitest';
import { behindBy, dayProgress, streak, type ProgressDay } from './progress.js';

const MON_WED_FRI = [1, 3, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function days(completedDays: number[], total: number): ProgressDay[] {
	return Array.from({ length: total }, (_, i) => ({
		day: i + 1,
		completed: completedDays.includes(i + 1)
	}));
}

describe('dayProgress', () => {
	it('counts completed days over existing days', () => {
		expect(dayProgress(days([1, 2], 4))).toEqual({ done: 2, total: 4, ratio: 0.5 });
	});

	it('is zero for no days', () => {
		expect(dayProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
	});
});

describe('streak', () => {
	const start = '2026-10-05';

	it('is zero before the plan starts', () => {
		expect(streak(start, MON_WED_FRI, days([], 6), '2026-10-01')).toBe(0);
	});

	it('counts today when it is completed', () => {
		expect(streak(start, MON_WED_FRI, days([1, 2], 6), '2026-10-07')).toBe(2);
	});

	it('keeps the streak alive while today is not done yet', () => {
		expect(streak(start, MON_WED_FRI, days([1], 6), '2026-10-07')).toBe(1);
	});

	it('is not broken by rest days', () => {
		expect(streak(start, MON_WED_FRI, days([1, 2], 6), '2026-10-08')).toBe(2);
	});

	it('breaks when a past study day was missed', () => {
		expect(streak(start, MON_WED_FRI, days([1], 6), '2026-10-10')).toBe(0);
	});

	it('counts only the days after a gap', () => {
		expect(streak(start, EVERY_DAY, days([1, 3, 4], 6), '2026-10-08')).toBe(2);
	});

	it('is zero without days', () => {
		expect(streak(start, MON_WED_FRI, [], '2026-10-07')).toBe(0);
	});

	it('ignores sessions that are still ahead', () => {
		expect(streak(start, MON_WED_FRI, days([1, 2, 3], 6), '2026-10-07')).toBe(2);
	});
});

describe('behindBy', () => {
	const start = '2026-10-05';

	it('counts past study days that are not completed', () => {
		expect(behindBy(start, MON_WED_FRI, 6, days([1], 6), '2026-10-10')).toBe(2);
	});

	it('does not count today or the future', () => {
		expect(behindBy(start, MON_WED_FRI, 6, days([], 6), '2026-10-05')).toBe(0);
	});

	it('is zero when everything due is done', () => {
		expect(behindBy(start, MON_WED_FRI, 6, days([1, 2], 6), '2026-10-08')).toBe(0);
	});
});
