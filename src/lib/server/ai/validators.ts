import type { BlockRange } from '#lib/plan-blocks.js';
import { normalizeText } from './ledger.js';
import type { BlockOutput, Outline } from './types.js';

export const MINUTES_TOLERANCE = 0.15;

export function validateOutline(outline: Outline, ranges: BlockRange[]): string[] {
	const issues: string[] = [];

	if (outline.blocks.length !== ranges.length) {
		issues.push(`Expected ${ranges.length} blocks but got ${outline.blocks.length}.`);
	}

	ranges.forEach((range, i) => {
		const block = outline.blocks[i];
		if (!block) return;
		if (
			block.index !== range.index ||
			block.startDay !== range.startDay ||
			block.endDay !== range.endDay
		) {
			issues.push(
				`Block ${i + 1} must be index ${range.index}, days ${range.startDay} to ${range.endDay}.`
			);
		}
	});

	const owner = new Map<string, number>();
	outline.blocks.forEach((block, i) => {
		for (const topic of block.covers) {
			const key = normalizeText(topic);
			const earlier = owner.get(key);
			if (earlier !== undefined && earlier !== i) {
				issues.push(`Topic "${topic}" is covered by both block ${earlier + 1} and block ${i + 1}.`);
			} else if (key) {
				owner.set(key, i);
			}
		}
	});

	return issues;
}

export function validateBlock(
	output: BlockOutput,
	range: BlockRange,
	minutesPerDay: number
): string[] {
	const issues: string[] = [];
	const expected = range.endDay - range.startDay + 1;

	if (output.days.length !== expected) {
		issues.push(
			`Expected ${expected} days (${range.startDay} to ${range.endDay}) but got ${output.days.length}.`
		);
	}

	const seen = new Set<number>();
	for (const day of output.days) {
		if (day.day < range.startDay || day.day > range.endDay) {
			issues.push(`Day ${day.day} is outside the range ${range.startDay} to ${range.endDay}.`);
		}
		if (seen.has(day.day)) issues.push(`Day ${day.day} appears more than once.`);
		seen.add(day.day);
	}
	for (let n = range.startDay; n <= range.endDay; n++) {
		if (!seen.has(n)) issues.push(`Day ${n} is missing.`);
	}

	const total = output.days.reduce((sum, day) => sum + day.minutes, 0);
	const target = expected * minutesPerDay;
	if (Math.abs(total - target) > target * MINUTES_TOLERANCE) {
		issues.push(
			`The days add up to ${total} minutes but the block should take about ${target} (${minutesPerDay} per day).`
		);
	}

	return issues;
}
