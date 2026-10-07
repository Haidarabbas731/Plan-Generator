import { describe, expect, it } from 'vitest';
import type { LedgerEntry } from '#lib/plan-types.js';
import {
	appendToLedger,
	findDuplicateTitles,
	normalizeText,
	uniqueTopics,
	windowLedger
} from './ledger.js';
import type { DayOutput } from './types.js';

const day = (n: number, title: string, topics: string[] = [title]): DayOutput => ({
	day: n,
	title,
	learn: 'learn',
	practice: 'practice',
	review: 'review',
	minutes: 90,
	topics
});

describe('normalizeText', () => {
	it('lowercases and strips punctuation and extra spaces', () => {
		expect(normalizeText('  Move Semantics: in  Practice!! ')).toBe('move semantics in practice');
	});

	it('keeps letters and numbers from any language', () => {
		expect(normalizeText('Día 3: Ñandú y 日本語')).toBe('día 3 ñandú y 日本語');
	});
});

describe('uniqueTopics', () => {
	it('keeps the first spelling of each topic, in order', () => {
		expect(
			uniqueTopics([
				['Variables', 'Types'],
				['types', 'Functions']
			])
		).toEqual(['Variables', 'Types', 'Functions']);
	});

	it('ignores blank topics', () => {
		expect(uniqueTopics([['', '  ', 'Real']])).toEqual(['Real']);
	});
});

describe('ledger', () => {
	it('appends new days, keeps the ledger sorted and never duplicates a day', () => {
		const start = appendToLedger([], [day(3, 'C'), day(1, 'A')]);
		expect(start.map((e) => e.day)).toEqual([1, 3]);
		const next = appendToLedger(start, [day(3, 'C again'), day(2, 'B')]);
		expect(next.map((e) => e.day)).toEqual([1, 2, 3]);
		expect(next.find((e) => e.day === 3)?.title).toBe('C');
	});

	it('keeps recent days verbatim and summarizes older ones as topics', () => {
		const ledger: LedgerEntry[] = Array.from({ length: 150 }, (_, i) => ({
			day: i + 1,
			title: `Day ${i + 1}`,
			topics: [`topic ${i + 1}`]
		}));
		const { recent, earlierTopics } = windowLedger(ledger, 120);
		expect(recent).toHaveLength(120);
		expect(recent[0].day).toBe(31);
		expect(earlierTopics).toHaveLength(30);
		expect(earlierTopics[0]).toBe('topic 1');
	});

	it('returns everything verbatim when the ledger is short', () => {
		const ledger = [{ day: 1, title: 'A', topics: ['x'] }];
		expect(windowLedger(ledger)).toEqual({ recent: ledger, earlierTopics: [] });
	});
});

describe('findDuplicateTitles', () => {
	const ledger: LedgerEntry[] = [
		{ day: 1, title: 'Move semantics in practice', topics: ['move semantics'] },
		{ day: 2, title: 'References and borrowing', topics: ['references'] }
	];

	it('accepts new titles', () => {
		expect(findDuplicateTitles([day(3, 'Lifetimes in structs')], ledger)).toEqual([]);
	});

	it('flags a title that already exists, ignoring case and punctuation', () => {
		const findings = findDuplicateTitles([day(3, 'MOVE semantics, in practice!')], ledger);
		expect(findings).toEqual([
			{ day: 3, message: 'Day 3 repeats the title of day 1: "MOVE semantics, in practice!"' }
		]);
	});

	it('flags a repeated title inside the same block', () => {
		const findings = findDuplicateTitles([day(3, 'Error handling'), day(4, 'error handling')], []);
		expect(findings).toHaveLength(1);
		expect(findings[0].day).toBe(4);
		expect(findings[0].message).toContain('day 3');
	});

	it('does not treat a follow-up or reworded title as a duplicate', () => {
		const days = [
			day(3, 'References and borrowing, part two'),
			day(4, 'Borrowing and references revisited')
		];
		expect(findDuplicateTitles(days, ledger)).toEqual([]);
	});

	it('works for titles in other languages', () => {
		const spanish: LedgerEntry[] = [{ day: 1, title: 'Introducción a los verbos', topics: [] }];
		expect(findDuplicateTitles([day(2, 'introducción a los VERBOS')], spanish)).toHaveLength(1);
	});
});
