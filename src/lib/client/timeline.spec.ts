import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runTimeline } from './timeline.js';

describe('runTimeline', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('runs every step at its time', () => {
		const calls: string[] = [];
		runTimeline([
			{ at: 100, run: () => calls.push('a') },
			{ at: 300, run: () => calls.push('b') }
		]);
		vi.advanceTimersByTime(150);
		expect(calls).toEqual(['a']);
		vi.advanceTimersByTime(200);
		expect(calls).toEqual(['a', 'b']);
	});

	it('stops the steps that have not run when it is cleaned up', () => {
		const run = vi.fn();
		const stop = runTimeline([{ at: 100, run }]);
		stop();
		vi.advanceTimersByTime(500);
		expect(run).not.toHaveBeenCalled();
	});
});
