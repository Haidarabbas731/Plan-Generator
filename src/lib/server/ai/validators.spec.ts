import { describe, expect, it } from 'vitest';
import { planBlockRanges } from '#lib/plan-blocks.js';
import { blockOutputSchema, outlineSchema } from './schemas.js';
import type { BlockOutput, DayOutput, Outline, OutlineBlock } from './types.js';
import { validateBlock, validateOutline } from './validators.js';

const milestone = { title: 'Build it', description: 'A small build', successCriteria: 'It runs' };

function outlineFor(days: number, size: number, covers = (i: number) => [`topic ${i}`]): Outline {
	return {
		title: 'Plan',
		overview: 'Overview',
		finalOutcome: 'Outcome',
		topicTag: 'tag',
		blocks: planBlockRanges(days, size).map((range): OutlineBlock => ({
			...range,
			theme: `Theme ${range.index + 1}`,
			objective: 'Objective',
			covers: covers(range.index),
			notCovers: [],
			milestone
		}))
	};
}

const day = (n: number, minutes = 60): DayOutput => ({
	day: n,
	title: `Day ${n}`,
	learn: 'learn',
	practice: 'practice',
	review: 'review',
	minutes,
	topics: [`t${n}`]
});

describe('schemas', () => {
	it('accept a well-formed outline and block', () => {
		expect(outlineSchema.safeParse(outlineFor(10, 5)).success).toBe(true);
		expect(blockOutputSchema.safeParse({ days: [day(1)] }).success).toBe(true);
	});

	it('reject empty text, missing topics and silly minutes', () => {
		expect(blockOutputSchema.safeParse({ days: [{ ...day(1), title: '' }] }).success).toBe(false);
		expect(blockOutputSchema.safeParse({ days: [{ ...day(1), topics: [] }] }).success).toBe(false);
		expect(blockOutputSchema.safeParse({ days: [{ ...day(1), minutes: 1 }] }).success).toBe(false);
		expect(blockOutputSchema.safeParse({ days: [] }).success).toBe(false);
	});
});

describe('validateOutline', () => {
	const ranges = planBlockRanges(10, 5);

	it('passes a correct outline', () => {
		expect(validateOutline(outlineFor(10, 5), ranges)).toEqual([]);
	});

	it('reports the wrong number of blocks', () => {
		expect(validateOutline(outlineFor(15, 5), ranges)[0]).toContain('Expected 2 blocks');
	});

	it('reports blocks whose days do not match the plan', () => {
		const outline = outlineFor(10, 5);
		outline.blocks[1] = { ...outline.blocks[1], startDay: 7 };
		expect(validateOutline(outline, ranges)[0]).toContain('Block 2 must be index 1, days 6 to 10');
	});

	it('reports a topic covered by two blocks, ignoring case', () => {
		const outline = outlineFor(10, 5, (i) => (i === 0 ? ['Ownership'] : ['ownership']));
		const issues = validateOutline(outline, ranges);
		expect(issues).toHaveLength(1);
		expect(issues[0]).toContain('both block 1 and block 2');
	});
});

describe('validateBlock', () => {
	const range = { index: 0, startDay: 1, endDay: 3 };
	const block = (...days: DayOutput[]): BlockOutput => ({ days });

	it('passes a complete block that matches the daily time', () => {
		expect(validateBlock(block(day(1), day(2), day(3)), range, 60)).toEqual([]);
	});

	it('reports missing, repeated and out-of-range days', () => {
		const issues = validateBlock(block(day(1), day(1), day(5)), range, 60);
		expect(issues.join(' ')).toContain('Day 1 appears more than once');
		expect(issues.join(' ')).toContain('Day 5 is outside the range');
		expect(issues.join(' ')).toContain('Day 2 is missing');
		expect(issues.join(' ')).toContain('Day 3 is missing');
	});

	it('reports the wrong number of days', () => {
		expect(validateBlock(block(day(1), day(2)), range, 60).join(' ')).toContain('Expected 3 days');
	});

	it('allows a small drift from the daily time but not a large one', () => {
		expect(validateBlock(block(day(1, 65), day(2, 62), day(3, 66)), range, 60)).toEqual([]);
		const issues = validateBlock(block(day(1, 20), day(2, 20), day(3, 20)), range, 60);
		expect(issues[0]).toContain('add up to 60 minutes');
	});
});
