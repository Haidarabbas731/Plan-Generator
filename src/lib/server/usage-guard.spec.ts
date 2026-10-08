import { describe, expect, it } from 'vitest';
import { createUsageGuard, hourlyAllowance, limitMessage, USAGE_WINDOW_MS } from './usage-guard.js';

const now = new Date('2026-10-08T12:00:00Z');
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe('hourlyAllowance', () => {
	it('allows while under the cap and reports how many were used', () => {
		expect(hourlyAllowance([ago(5), ago(10)], 3, now)).toEqual({ ok: true, used: 2, cap: 3 });
	});

	it('ignores events older than an hour', () => {
		expect(hourlyAllowance([ago(61), ago(120)], 1, now)).toEqual({ ok: true, used: 0, cap: 1 });
		expect(hourlyAllowance([new Date(now.getTime() - USAGE_WINDOW_MS)], 1, now).ok).toBe(true);
	});

	it('blocks at the cap and says when the oldest event frees a slot', () => {
		const result = hourlyAllowance([ago(50), ago(20)], 2, now);
		expect(result).toEqual({ ok: false, used: 2, cap: 2, retryInMinutes: 10 });
	});

	it('waits for enough events to expire when the count is above the cap', () => {
		const result = hourlyAllowance([ago(55), ago(40), ago(10)], 2, now);
		expect(result).toMatchObject({ ok: false, retryInMinutes: 20 });
	});

	it('never says to retry in less than a minute', () => {
		const almost = new Date(now.getTime() - USAGE_WINDOW_MS + 5_000);
		expect(hourlyAllowance([almost], 1, now)).toMatchObject({ ok: false, retryInMinutes: 1 });
	});
});

describe('limitMessage', () => {
	it('names the cap and uses the right plural', () => {
		expect(limitMessage({ ok: false, used: 30, cap: 30, retryInMinutes: 1 })).toBe(
			'You have used all 30 AI requests for this hour. Try again in 1 minute.'
		);
		expect(limitMessage({ ok: false, used: 30, cap: 30, retryInMinutes: 12 })).toContain(
			'12 minutes'
		);
	});
});

describe('createUsageGuard', () => {
	it('asks the store for the last hour of one user', async () => {
		const calls: [string, Date][] = [];
		const guard = createUsageGuard({
			cap: 2,
			now: () => now,
			store: {
				usageSince: async (userId, since) => {
					calls.push([userId, since]);
					return [ago(5), ago(6)];
				}
			}
		});
		expect(await guard.check('u1')).toMatchObject({ ok: false, cap: 2 });
		expect(calls).toEqual([['u1', ago(60)]]);
	});
});
