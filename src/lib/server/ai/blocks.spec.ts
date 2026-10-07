import { describe, expect, it } from 'vitest';
import { planBlockRanges } from './blocks.js';

const sizes = (ranges: ReturnType<typeof planBlockRanges>) =>
	ranges.map((r) => r.endDay - r.startDay + 1);

describe('planBlockRanges', () => {
	it('splits evenly', () => {
		const ranges = planBlockRanges(30, 5);
		expect(ranges).toHaveLength(6);
		expect(ranges[0]).toEqual({ index: 0, startDay: 1, endDay: 5 });
		expect(ranges[5]).toEqual({ index: 5, startDay: 26, endDay: 30 });
	});

	it('keeps a short last block when it still has the minimum days', () => {
		expect(sizes(planBlockRanges(13, 5))).toEqual([5, 5, 3]);
	});

	it('merges a too-short remainder into the previous block', () => {
		expect(sizes(planBlockRanges(11, 5))).toEqual([5, 6]);
		expect(sizes(planBlockRanges(21, 10))).toEqual([10, 11]);
	});

	it('raises very small block sizes to the minimum', () => {
		expect(sizes(planBlockRanges(9, 1))).toEqual([3, 3, 3]);
		expect(sizes(planBlockRanges(9, 2))).toEqual([3, 3, 3]);
	});

	it('handles plans shorter than a block', () => {
		expect(planBlockRanges(1, 5)).toEqual([{ index: 0, startDay: 1, endDay: 1 }]);
		expect(planBlockRanges(4, 5)).toEqual([{ index: 0, startDay: 1, endDay: 4 }]);
	});

	it('always covers every day exactly once, in order', () => {
		for (const total of [1, 2, 3, 7, 14, 30, 90, 365]) {
			for (const size of [1, 3, 5, 7, 10, 30]) {
				const ranges = planBlockRanges(total, size);
				expect(ranges[0].startDay).toBe(1);
				expect(ranges[ranges.length - 1].endDay).toBe(total);
				ranges.forEach((range, i) => {
					expect(range.index).toBe(i);
					if (i > 0) expect(range.startDay).toBe(ranges[i - 1].endDay + 1);
				});
			}
		}
	});

	it('rejects a plan with no days', () => {
		expect(() => planBlockRanges(0, 5)).toThrow();
		expect(() => planBlockRanges(2.5, 5)).toThrow();
	});
});
