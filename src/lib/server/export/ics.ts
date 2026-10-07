import { addDays, scheduleDates } from '#lib/schedule.js';
import type { ExportData } from './types.js';

const FOLD_LIMIT = 75;
const encoder = new TextEncoder();

export function escapeText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');
}

export function foldLine(line: string): string {
	if (encoder.encode(line).length <= FOLD_LIMIT) return line;
	const parts: string[] = [];
	let current = '';
	let currentBytes = 0;
	let limit = FOLD_LIMIT;
	for (const char of line) {
		const bytes = encoder.encode(char).length;
		if (currentBytes + bytes > limit) {
			parts.push(current);
			current = '';
			currentBytes = 0;
			limit = FOLD_LIMIT - 1;
		}
		current += char;
		currentBytes += bytes;
	}
	parts.push(current);
	return parts.join('\r\n ');
}

const compactDate = (isoDate: string) => isoDate.replace(/-/g, '');

function utcStamp(now: Date): string {
	return now
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}Z$/, 'Z');
}

function event(lines: string[]): string[] {
	return ['BEGIN:VEVENT', ...lines, 'END:VEVENT'];
}

function allDay(isoDate: string): string[] {
	return [
		`DTSTART;VALUE=DATE:${compactDate(isoDate)}`,
		`DTEND;VALUE=DATE:${compactDate(addDays(isoDate, 1))}`
	];
}

export function buildIcs(data: ExportData, now: Date = new Date()): string {
	const { plan, blocks, days } = data;
	const dates = scheduleDates(plan.startDate, plan.studyDays, plan.daysTotal);
	const stamp = utcStamp(now);
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Plan Generator//Study plan//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${escapeText(plan.title)}`
	];

	for (const day of days) {
		const date = dates[day.day - 1];
		if (!date) continue;
		lines.push(
			...event([
				`UID:plan-${plan.id}-day-${day.day}@plan-generator`,
				`DTSTAMP:${stamp}`,
				...allDay(date),
				`SUMMARY:${escapeText(`Day ${day.day} · ${day.title}`)}`,
				`DESCRIPTION:${escapeText(
					`Learn: ${day.learn}\n\nPractice: ${day.practice}\n\nReview: ${day.review}\n\n${day.minutes} min`
				)}`
			])
		);
	}

	for (const block of blocks) {
		const date = dates[block.endDay - 1];
		if (!date) continue;
		lines.push(
			...event([
				`UID:plan-${plan.id}-block-${block.idx}-milestone@plan-generator`,
				`DTSTAMP:${stamp}`,
				...allDay(date),
				`SUMMARY:${escapeText(`Milestone: ${block.milestone.title}`)}`,
				`DESCRIPTION:${escapeText(
					`${block.milestone.description}\n\nDone when: ${block.milestone.successCriteria}`
				)}`
			])
		);
	}

	lines.push('END:VCALENDAR');
	return lines.map(foldLine).join('\r\n') + '\r\n';
}
