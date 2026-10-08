export const USAGE_WINDOW_MS = 60 * 60 * 1000;
export const USAGE_KEEP_MS = 24 * 60 * 60 * 1000;

export type Allowance =
	| { ok: true; used: number; cap: number }
	| { ok: false; used: number; cap: number; retryInMinutes: number };

export function hourlyAllowance(events: Date[], cap: number, now: Date): Allowance {
	const windowStart = now.getTime() - USAGE_WINDOW_MS;
	const recent = events
		.map((event) => event.getTime())
		.filter((time) => time > windowStart)
		.sort((a, b) => a - b);
	const used = recent.length;
	if (used < cap) return { ok: true, used, cap };
	const frees = recent[used - cap] + USAGE_WINDOW_MS - now.getTime();
	return { ok: false, used, cap, retryInMinutes: Math.max(1, Math.ceil(frees / 60_000)) };
}

export function limitMessage(allowance: Extract<Allowance, { ok: false }>): string {
	const { cap, retryInMinutes } = allowance;
	const unit = retryInMinutes === 1 ? 'minute' : 'minutes';
	return `You have used all ${cap} AI requests for this hour. Try again in ${retryInMinutes} ${unit}.`;
}

export interface UsageGuardDeps {
	store: { usageSince: (userId: string, since: Date) => Promise<Date[]> };
	cap: number;
	now?: () => Date;
}

export function createUsageGuard(deps: UsageGuardDeps) {
	const { store, cap } = deps;
	const now = deps.now ?? (() => new Date());

	return {
		cap,
		async check(userId: string): Promise<Allowance> {
			const at = now();
			const events = await store.usageSince(userId, new Date(at.getTime() - USAGE_WINDOW_MS));
			return hourlyAllowance(events, cap, at);
		}
	};
}

export type UsageGuard = ReturnType<typeof createUsageGuard>;
