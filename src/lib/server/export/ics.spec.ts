import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, foldLine } from './ics.js';
import type { ExportData } from './types.js';

const NOW = new Date('2026-10-07T12:34:56.789Z');

function sample(overrides: Partial<ExportData['plan']> = {}): ExportData {
	return {
		plan: {
			id: 'p1',
			title: 'Learn Rust',
			goal: 'Build a CLI',
			overview: 'overview',
			finalOutcome: 'outcome',
			startDate: '2026-10-09',
			studyDays: [1, 2, 3, 4, 5],
			daysTotal: 3,
			minutesPerDay: 60,
			...overrides
		},
		blocks: [
			{
				id: 'b1',
				idx: 0,
				startDay: 1,
				endDay: 3,
				theme: 'Basics',
				objective: 'Start',
				milestone: {
					title: 'First program',
					description: 'Print, then read input.',
					successCriteria: 'It runs; no warnings.'
				},
				status: 'ready',
				error: null
			}
		],
		days: [1, 2, 3].map((day) => ({
			day,
			blockId: 'b1',
			title: `Lesson ${day}`,
			learn: 'Learn, this; that',
			practice: 'Practice line one\nline two',
			review: 'Review',
			minutes: 60,
			completed: false
		}))
	};
}

const unfold = (ics: string) => ics.replace(/\r\n /g, '');

describe('escapeText', () => {
	it('escapes backslashes, semicolons, commas and newlines', () => {
		expect(escapeText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf');
	});
});

describe('foldLine', () => {
	it('leaves short lines alone', () => {
		expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short');
	});

	it('folds long lines at 75 octets with a leading space on continuations', () => {
		const folded = foldLine(`DESCRIPTION:${'x'.repeat(200)}`);
		const parts = folded.split('\r\n');
		expect(parts.length).toBeGreaterThan(2);
		expect(parts[0].length).toBe(75);
		for (const part of parts.slice(1)) {
			expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
			expect(part.startsWith(' ')).toBe(true);
		}
		expect(folded.replace(/\r\n /g, '')).toBe(`DESCRIPTION:${'x'.repeat(200)}`);
	});

	it('never splits a multi-byte character', () => {
		const text = `SUMMARY:${'é'.repeat(100)}`;
		const folded = foldLine(text);
		for (const part of folded.split('\r\n')) {
			expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
		}
		expect(folded.replace(/\r\n /g, '')).toBe(text);
	});
});

describe('buildIcs', () => {
	it('is a calendar with CRLF line endings and a trailing break', () => {
		const ics = buildIcs(sample(), NOW);
		expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
		expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
		expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
	});

	it('creates an all-day event per day on study dates and skips rest days', () => {
		const ics = unfold(buildIcs(sample(), NOW));
		expect(ics).toContain('DTSTART;VALUE=DATE:20261009');
		expect(ics).toContain('DTEND;VALUE=DATE:20261010');
		expect(ics).toContain('DTSTART;VALUE=DATE:20261012');
		expect(ics).toContain('DTSTART;VALUE=DATE:20261013');
		expect(ics).not.toContain('DTSTART;VALUE=DATE:20261010');
		expect(ics).not.toContain('DTSTART;VALUE=DATE:20261011');
	});

	it('uses stable unique ids so re-importing updates events', () => {
		const first = buildIcs(sample(), NOW);
		const later = buildIcs(sample(), new Date('2027-01-01T00:00:00Z'));
		const uids = (ics: string) => [...ics.matchAll(/UID:(.*)\r\n/g)].map((m) => m[1]);
		expect(uids(first)).toEqual(uids(later));
		expect(new Set(uids(first)).size).toBe(uids(first).length);
		expect(uids(first)).toContain('plan-p1-day-1@plan-generator');
		expect(uids(first)).toContain('plan-p1-block-0-milestone@plan-generator');
	});

	it('stamps events in UTC', () => {
		expect(buildIcs(sample(), NOW)).toContain('DTSTAMP:20261007T123456Z');
	});

	it('puts the milestone on the last study date of its block', () => {
		const ics = unfold(buildIcs(sample(), NOW));
		const milestone = ics.split('BEGIN:VEVENT').find((part) => part.includes('Milestone:'))!;
		expect(milestone).toContain('DTSTART;VALUE=DATE:20261013');
		expect(milestone).toContain('SUMMARY:Milestone: First program');
		expect(milestone).toContain('Done when: It runs\\; no warnings.');
	});

	it('escapes special characters in the description', () => {
		const ics = unfold(buildIcs(sample(), NOW));
		expect(ics).toContain('Learn: Learn\\, this\\; that');
		expect(ics).toContain('Practice: Practice line one\\nline two');
	});

	it('names events after the day and title', () => {
		expect(unfold(buildIcs(sample(), NOW))).toContain('SUMMARY:Day 2 · Lesson 2');
	});

	it('skips days that fall outside the schedule', () => {
		const data = sample({ daysTotal: 2 });
		const ics = unfold(buildIcs(data, NOW));
		expect(ics).toContain('plan-p1-day-2@plan-generator');
		expect(ics).not.toContain('plan-p1-day-3@plan-generator');
	});
});
