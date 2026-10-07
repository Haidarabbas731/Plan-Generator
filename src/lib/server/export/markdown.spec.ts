import { describe, expect, it } from 'vitest';
import { buildMarkdown, exportFileName } from './markdown.js';
import type { ExportData } from './types.js';

function sample(): ExportData {
	return {
		plan: {
			id: 'p1',
			title: 'Learn Rust',
			goal: 'Build a CLI tool',
			overview: 'Two sentences about the plan.',
			finalOutcome: 'Ship a small tool.',
			startDate: '2026-10-09',
			studyDays: [1, 2, 3, 4, 5],
			daysTotal: 4,
			minutesPerDay: 60
		},
		blocks: [
			{
				id: 'b1',
				idx: 0,
				startDay: 1,
				endDay: 2,
				theme: 'Basics',
				objective: 'Write first programs.',
				milestone: { title: 'Hello', description: 'Print text.', successCriteria: 'It runs.' },
				status: 'ready',
				error: null
			},
			{
				id: 'b2',
				idx: 1,
				startDay: 3,
				endDay: 4,
				theme: 'Ownership',
				objective: 'Borrow values.',
				milestone: { title: 'Counter', description: 'Count words.', successCriteria: 'No copies.' },
				status: 'pending',
				error: null
			}
		],
		days: [1, 2].map((day) => ({
			day,
			blockId: 'b1',
			title: `Lesson ${day}`,
			learn: 'Line one\nline two',
			practice: 'Do the thing',
			review: 'Redo it',
			minutes: 60,
			completed: day === 1
		}))
	};
}

describe('buildMarkdown', () => {
	const markdown = buildMarkdown(sample());

	it('starts with the title, goal and summary', () => {
		expect(markdown.startsWith('# Learn Rust\n')).toBe(true);
		expect(markdown).toContain('**Goal:** Build a CLI tool');
		expect(markdown).toContain('4 sessions · 60 minutes a day · starts Oct 9, 2026');
	});

	it('includes the overview and final outcome', () => {
		expect(markdown).toContain('## Overview\n\nTwo sentences about the plan.');
		expect(markdown).toContain('## Final outcome\n\nShip a small tool.');
	});

	it('lists blocks with their day range and objective', () => {
		expect(markdown).toContain('## Block 1 · Basics');
		expect(markdown).toContain('_Days 1–2_');
		expect(markdown).toContain('Write first programs.');
	});

	it('lists each day with its date, tasks and done state', () => {
		expect(markdown).toContain('### Day 1 · Lesson 1');
		expect(markdown).toContain('Fri, Oct 9 · 60 min · done');
		expect(markdown).toContain('Mon, Oct 12 · 60 min\n');
		expect(markdown).toContain('- **Learn:** Line one line two');
		expect(markdown).toContain('- **Practice:** Do the thing');
		expect(markdown).toContain('- **Review:** Redo it');
	});

	it('writes the milestone of every block as a quote', () => {
		expect(markdown).toContain('> **Milestone (day 2): Hello**');
		expect(markdown).toContain('> Done when: It runs.');
		expect(markdown).toContain('> **Milestone (day 4): Counter**');
	});

	it('says when a block has not been written yet', () => {
		expect(markdown).toContain('_This block has not been written yet._');
	});

	it('ends with exactly one newline and no triple blank lines', () => {
		expect(markdown.endsWith('\n')).toBe(true);
		expect(markdown.endsWith('\n\n')).toBe(false);
		expect(markdown).not.toMatch(/\n{3,}/);
	});
});

describe('exportFileName', () => {
	it('makes a safe lowercase file name', () => {
		expect(exportFileName('Learn Rust: CLI tools!', 'md')).toBe('learn-rust-cli-tools.md');
	});

	it('removes accents', () => {
		expect(exportFileName('Aprender español', 'ics')).toBe('aprender-espanol.ics');
	});

	it('falls back when nothing usable is left', () => {
		expect(exportFileName('日本語', 'md')).toBe('plan.md');
	});

	it('limits the length', () => {
		expect(exportFileName('a'.repeat(200), 'md').length).toBeLessThanOrEqual(63);
	});
});
