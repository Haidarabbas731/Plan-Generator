import { describe, expect, it } from 'vitest';
import {
	ALL_WEEKDAYS,
	addDays,
	endDate,
	scheduleDates,
	sessionDate,
	todayState,
	weekdayOf,
	weeksSpanned
} from './schedule.js';

const EVERY_DAY = [...ALL_WEEKDAYS];
const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];
const MON_WED_FRI = [1, 3, 5];

describe('scheduleDates', () => {
	it('uses consecutive dates when every weekday is a study day', () => {
		expect(scheduleDates('2026-10-06', EVERY_DAY, 3)).toEqual([
			'2026-10-06',
			'2026-10-07',
			'2026-10-08'
		]);
	});

	it('skips Saturday and Sunday when they are rest days', () => {
		expect(scheduleDates('2026-10-09', WEEKDAYS_ONLY, 4)).toEqual([
			'2026-10-09',
			'2026-10-12',
			'2026-10-13',
			'2026-10-14'
		]);
	});

	it('moves a start date on a rest day to the next study day', () => {
		expect(scheduleDates('2026-10-10', WEEKDAYS_ONLY, 1)).toEqual(['2026-10-12']);
	});

	it('handles a single study day a week', () => {
		expect(scheduleDates('2026-10-06', [3], 3)).toEqual(['2026-10-07', '2026-10-14', '2026-10-21']);
	});

	it('handles Mon, Wed and Fri', () => {
		expect(scheduleDates('2026-10-05', MON_WED_FRI, 4)).toEqual([
			'2026-10-05',
			'2026-10-07',
			'2026-10-09',
			'2026-10-12'
		]);
	});

	it('returns nothing without study days or without sessions', () => {
		expect(scheduleDates('2026-10-06', [], 3)).toEqual([]);
		expect(scheduleDates('2026-10-06', EVERY_DAY, 0)).toEqual([]);
	});

	it('is not thrown off by a daylight saving change', () => {
		const dates = scheduleDates('2026-03-27', EVERY_DAY, 5);
		expect(dates).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31']);
	});

	it('crosses a year end', () => {
		expect(scheduleDates('2026-12-30', EVERY_DAY, 3)).toEqual([
			'2026-12-30',
			'2026-12-31',
			'2027-01-01'
		]);
	});
});

describe('sessionDate and endDate', () => {
	it('maps a session number to its date', () => {
		expect(sessionDate('2026-10-05', MON_WED_FRI, 2)).toBe('2026-10-07');
		expect(sessionDate('2026-10-05', MON_WED_FRI, 0)).toBeNull();
	});

	it('finds the end date of a plan', () => {
		expect(endDate('2026-10-05', MON_WED_FRI, 6)).toBe('2026-10-16');
	});
});

describe('weeksSpanned', () => {
	it('spans about ten weeks for 30 sessions on three days a week', () => {
		expect(weeksSpanned('2026-10-05', MON_WED_FRI, 30)).toBe(10);
	});

	it('is one week for a few consecutive days', () => {
		expect(weeksSpanned('2026-10-05', EVERY_DAY, 5)).toBe(1);
	});

	it('is zero without study days', () => {
		expect(weeksSpanned('2026-10-05', [], 5)).toBe(0);
	});
});

describe('todayState', () => {
	const start = '2026-10-05';

	it('is before the plan starts', () => {
		expect(todayState(start, MON_WED_FRI, 6, '2026-10-01')).toEqual({
			kind: 'before',
			startsOn: '2026-10-05',
			firstDay: 1
		});
	});

	it('is a session on a study day', () => {
		expect(todayState(start, MON_WED_FRI, 6, '2026-10-07')).toEqual({ kind: 'session', day: 2 });
	});

	it('is a rest day between sessions and points to the next session', () => {
		expect(todayState(start, MON_WED_FRI, 6, '2026-10-06')).toEqual({
			kind: 'rest',
			nextDay: 2,
			nextDate: '2026-10-07'
		});
	});

	it('skips the weekend to the next study day', () => {
		expect(todayState('2026-10-05', WEEKDAYS_ONLY, 10, '2026-10-10')).toEqual({
			kind: 'rest',
			nextDay: 6,
			nextDate: '2026-10-12'
		});
	});

	it('is done after the last session', () => {
		expect(todayState(start, MON_WED_FRI, 6, '2026-10-17')).toEqual({ kind: 'done' });
	});

	it('is a session on the last day itself', () => {
		expect(todayState(start, MON_WED_FRI, 6, '2026-10-16')).toEqual({ kind: 'session', day: 6 });
	});
});

describe('date helpers', () => {
	it('adds days across a month end', () => {
		expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
	});

	it('finds the weekday of a date', () => {
		expect(weekdayOf('2026-10-05')).toBe(1);
		expect(weekdayOf('2026-10-11')).toBe(0);
	});
});
