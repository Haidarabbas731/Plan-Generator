import type { LedgerEntry } from '#lib/plan-types.js';
import { LEDGER_VERBATIM_DAYS } from '../config.js';
import type { DayOutput } from './types.js';

export function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function uniqueTopics(lists: string[][]): string[] {
	const seen = new Set<string>();
	const topics: string[] = [];
	for (const list of lists) {
		for (const topic of list) {
			const key = normalizeText(topic);
			if (key && !seen.has(key)) {
				seen.add(key);
				topics.push(topic.trim());
			}
		}
	}
	return topics;
}

export function ledgerEntriesFrom(days: DayOutput[]): LedgerEntry[] {
	return days.map((day) => ({ day: day.day, title: day.title.trim(), topics: day.topics }));
}

export function appendToLedger(ledger: LedgerEntry[], days: DayOutput[]): LedgerEntry[] {
	const known = new Set(ledger.map((entry) => entry.day));
	const fresh = ledgerEntriesFrom(days).filter((entry) => !known.has(entry.day));
	return [...ledger, ...fresh].sort((a, b) => a.day - b.day);
}

export function replaceLedgerRange(
	ledger: LedgerEntry[],
	fromDay: number,
	toDay: number,
	entries: LedgerEntry[]
): LedgerEntry[] {
	const kept = ledger.filter((entry) => entry.day < fromDay || entry.day > toDay);
	return [...kept, ...entries].sort((a, b) => a.day - b.day);
}

export function ledgerBefore(ledger: LedgerEntry[], day: number): LedgerEntry[] {
	return ledger.filter((entry) => entry.day < day);
}

export function windowLedger(
	ledger: LedgerEntry[],
	verbatimDays = LEDGER_VERBATIM_DAYS
): { recent: LedgerEntry[]; earlierTopics: string[] } {
	const sorted = [...ledger].sort((a, b) => a.day - b.day);
	const recent = sorted.slice(-verbatimDays);
	const older = sorted.slice(0, Math.max(0, sorted.length - verbatimDays));
	return { recent, earlierTopics: uniqueTopics(older.map((entry) => entry.topics)) };
}

export interface DuplicateFinding {
	day: number;
	message: string;
}

export function findDuplicateTitles(days: DayOutput[], ledger: LedgerEntry[]): DuplicateFinding[] {
	const seen = new Map<string, number>();
	for (const entry of ledger) {
		const key = normalizeText(entry.title);
		if (key && !seen.has(key)) seen.set(key, entry.day);
	}

	const findings: DuplicateFinding[] = [];
	for (const day of days) {
		const key = normalizeText(day.title);
		const earlierDay = seen.get(key);
		if (earlierDay !== undefined) {
			findings.push({
				day: day.day,
				message: `Day ${day.day} repeats the title of day ${earlierDay}: "${day.title}"`
			});
		} else if (key) {
			seen.set(key, day.day);
		}
	}
	return findings;
}
