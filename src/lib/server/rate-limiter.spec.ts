import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limiter.js';

describe('rate limiter', () => {
	it('allows up to the maximum per key, then says when to retry', () => {
		let time = 0;
		const limiter = createRateLimiter({ max: 2, windowMs: 600_000, now: () => time });
		expect(limiter.take('a')).toEqual({ ok: true });
		time = 60_000;
		expect(limiter.take('a')).toEqual({ ok: true });
		expect(limiter.take('a')).toEqual({ ok: false, retryInMinutes: 9 });
		expect(limiter.take('b')).toEqual({ ok: true });
	});

	it('lets a key through again once its window has passed', () => {
		let time = 0;
		const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => time });
		limiter.take('a');
		expect(limiter.take('a').ok).toBe(false);
		time = 1001;
		expect(limiter.take('a')).toEqual({ ok: true });
	});
});
