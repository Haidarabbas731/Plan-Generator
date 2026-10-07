import { describe, expect, it } from 'vitest';
import { formatDate, localToday } from './format.js';

describe('formatDate', () => {
	it('formats a short date with the weekday', () => {
		expect(formatDate('2026-10-07')).toBe('Wed, Oct 7');
	});

	it('formats a long date', () => {
		expect(formatDate('2026-10-07', 'long')).toBe('Wednesday, October 7');
	});

	it('formats only the weekday', () => {
		expect(formatDate('2026-10-11', 'weekday')).toBe('Sunday');
	});

	it('formats a date with the year', () => {
		expect(formatDate('2026-12-31', 'date')).toBe('Dec 31, 2026');
	});

	it('does not shift the day across time zones', () => {
		expect(formatDate('2026-01-01', 'date')).toBe('Jan 1, 2026');
	});
});

describe('localToday', () => {
	it('uses the local calendar date with zero padding', () => {
		expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
	});

	it('uses the local date late in the evening', () => {
		expect(localToday(new Date(2026, 9, 7, 23, 30))).toBe('2026-10-07');
	});
});
