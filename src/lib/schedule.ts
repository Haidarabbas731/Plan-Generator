const DAY_MS = 86_400_000;

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type TodayState =
	| { kind: 'before'; startsOn: string; firstDay: number }
	| { kind: 'session'; day: number }
	| { kind: 'rest'; nextDay: number; nextDate: string }
	| { kind: 'done' };

function toUtc(date: string): number {
	return Date.parse(`${date}T00:00:00Z`);
}

function fromUtc(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, amount: number): string {
	return fromUtc(toUtc(date) + amount * DAY_MS);
}

export function weekdayOf(date: string): number {
	return new Date(toUtc(date)).getUTCDay();
}

export function scheduleDates(startDate: string, studyDays: number[], count: number): string[] {
	const allowed = new Set(studyDays);
	if (allowed.size === 0 || count <= 0) return [];
	const dates: string[] = [];
	let cursor = toUtc(startDate);
	while (dates.length < count) {
		if (allowed.has(new Date(cursor).getUTCDay())) dates.push(fromUtc(cursor));
		cursor += DAY_MS;
	}
	return dates;
}

export function sessionDate(startDate: string, studyDays: number[], day: number): string | null {
	if (day < 1) return null;
	return scheduleDates(startDate, studyDays, day)[day - 1] ?? null;
}

export function endDate(startDate: string, studyDays: number[], daysTotal: number): string | null {
	return sessionDate(startDate, studyDays, daysTotal);
}

export function weeksSpanned(startDate: string, studyDays: number[], daysTotal: number): number {
	const end = endDate(startDate, studyDays, daysTotal);
	if (!end) return 0;
	return Math.floor((toUtc(end) - toUtc(startDate)) / (7 * DAY_MS)) + 1;
}

export function todayState(
	startDate: string,
	studyDays: number[],
	daysTotal: number,
	today: string
): TodayState {
	const dates = scheduleDates(startDate, studyDays, daysTotal);
	if (dates.length === 0) return { kind: 'done' };
	if (today < dates[0]) return { kind: 'before', startsOn: dates[0], firstDay: 1 };
	if (today > dates[dates.length - 1]) return { kind: 'done' };
	const index = dates.indexOf(today);
	if (index >= 0) return { kind: 'session', day: index + 1 };
	const nextIndex = dates.findIndex((date) => date > today);
	return { kind: 'rest', nextDay: nextIndex + 1, nextDate: dates[nextIndex] };
}
