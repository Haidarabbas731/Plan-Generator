import { LIMITS } from '#lib/limits.js';

export interface BlockRange {
	index: number;
	startDay: number;
	endDay: number;
}

export function planBlockRanges(totalDays: number, blockSize: number): BlockRange[] {
	if (!Number.isInteger(totalDays) || totalDays < 1) {
		throw new Error('The plan needs at least one day');
	}
	const size = Math.max(LIMITS.minBlockDays, Math.floor(blockSize) || LIMITS.minBlockDays);

	const ranges: BlockRange[] = [];
	let start = 1;
	while (start <= totalDays) {
		const end = Math.min(start + size - 1, totalDays);
		ranges.push({ index: ranges.length, startDay: start, endDay: end });
		start = end + 1;
	}

	if (ranges.length > 1) {
		const last = ranges[ranges.length - 1];
		if (last.endDay - last.startDay + 1 < LIMITS.minBlockDays) {
			ranges.pop();
			ranges[ranges.length - 1].endDay = last.endDay;
		}
	}
	return ranges;
}
