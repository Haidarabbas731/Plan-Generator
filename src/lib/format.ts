const FORMATS = {
	short: { weekday: 'short', month: 'short', day: 'numeric' },
	long: { weekday: 'long', month: 'long', day: 'numeric' },
	weekday: { weekday: 'long' },
	date: { month: 'short', day: 'numeric', year: 'numeric' }
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof FORMATS;

export function formatDate(isoDate: string, style: DateStyle = 'short'): string {
	return new Intl.DateTimeFormat('en', { ...FORMATS[style], timeZone: 'UTC' }).format(
		new Date(`${isoDate}T00:00:00Z`)
	);
}

export function plural(count: number, one: string, other: string): string {
	return new Intl.PluralRules('en').select(count) === 'one' ? one : other;
}

export function localToday(now: Date = new Date()): string {
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
}
