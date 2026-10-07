import { describe, expect, it } from 'vitest';
import { validatePlanRequest } from './plan-validation.js';

const valid = {
	goal: 'Learn Rust well enough to build a CLI',
	level: 'beginner',
	doneLooksLike: '',
	daysTotal: '30',
	minutesPerDay: '90',
	blockSize: '5',
	studyDays: [1, 2, 3, 4, 5],
	startDate: '2026-10-08',
	provider: 'google',
	model: 'gemini-2.5-flash'
};

describe('validatePlanRequest', () => {
	it('accepts a complete request and normalizes it', () => {
		const result = validatePlanRequest(valid);
		expect(result).toEqual({
			value: {
				inputs: {
					goal: 'Learn Rust well enough to build a CLI',
					level: 'beginner',
					studyDays: [1, 2, 3, 4, 5],
					doneLooksLike: null,
					daysTotal: 30,
					minutesPerDay: 90,
					blockSize: 5
				},
				provider: 'google',
				model: 'gemini-2.5-flash',
				startDate: '2026-10-08'
			}
		});
	});

	it('treats level as optional and sorts and de-duplicates study days', () => {
		const result = validatePlanRequest({ ...valid, level: '', studyDays: [5, 1, 1, 3] });
		expect('value' in result && result.value.inputs.level).toBeNull();
		expect('value' in result && result.value.inputs.studyDays).toEqual([1, 3, 5]);
	});

	it('trims the goal and keeps the "done looks like" line', () => {
		const result = validatePlanRequest({
			...valid,
			goal: '  Learn piano  ',
			doneLooksLike: ' play a song '
		});
		expect('value' in result && result.value.inputs.goal).toBe('Learn piano');
		expect('value' in result && result.value.inputs.doneLooksLike).toBe('play a song');
	});

	it('reports every invalid field together', () => {
		const result = validatePlanRequest({
			goal: '  ',
			level: 'expert',
			daysTotal: '0',
			minutesPerDay: '5',
			blockSize: '1',
			studyDays: [],
			startDate: '2026-02-31',
			provider: 'nope',
			model: ''
		});
		expect('errors' in result && Object.keys(result.errors).sort()).toEqual(
			[
				'blockSize',
				'daysTotal',
				'goal',
				'level',
				'minutesPerDay',
				'model',
				'provider',
				'startDate',
				'studyDays'
			].sort()
		);
	});

	it('enforces the upper limits', () => {
		const result = validatePlanRequest({
			...valid,
			goal: 'x'.repeat(2001),
			daysTotal: '366',
			minutesPerDay: '721',
			blockSize: '31'
		});
		expect('errors' in result && Object.keys(result.errors).sort()).toEqual(
			['blockSize', 'daysTotal', 'goal', 'minutesPerDay'].sort()
		);
	});

	it('rejects days of the week outside 0 to 6 and non-whole numbers', () => {
		expect('errors' in validatePlanRequest({ ...valid, studyDays: [7] })).toBe(true);
		expect('errors' in validatePlanRequest({ ...valid, daysTotal: '2.5' })).toBe(true);
		expect('errors' in validatePlanRequest({ ...valid, daysTotal: 'many' })).toBe(true);
	});

	it('uses the default block size when none is given', () => {
		const result = validatePlanRequest({ ...valid, blockSize: undefined });
		expect('value' in result && result.value.inputs.blockSize).toBe(5);
	});
});
