import { describe, expect, it } from 'vitest';
import {
	DISMISS_DISTANCE_RATIO,
	DISMISS_VELOCITY,
	dragOffset,
	releaseVelocity,
	rubberband,
	shouldDismiss
} from './drag-dismiss.js';

describe('rubberband', () => {
	it('is zero without overshoot', () => {
		expect(rubberband(0, 500)).toBe(0);
	});

	it('resists more the further it is pulled', () => {
		const small = rubberband(-50, 500);
		const large = rubberband(-400, 500);
		expect(small).toBeLessThan(0);
		expect(Math.abs(large)).toBeGreaterThan(Math.abs(small));
		expect(Math.abs(large)).toBeLessThan(400);
	});

	it('never moves further than the dimension allows', () => {
		expect(Math.abs(rubberband(-100000, 500))).toBeLessThan(500);
	});
});

describe('dragOffset', () => {
	it('follows the finger one to one when dragging down', () => {
		expect(dragOffset(120, 600)).toBe(120);
	});

	it('resists dragging up past the top', () => {
		const offset = dragOffset(-100, 600);
		expect(offset).toBeLessThan(0);
		expect(offset).toBeGreaterThan(-100);
	});
});

describe('shouldDismiss', () => {
	const height = 600;

	it('dismisses after a long enough drag', () => {
		expect(shouldDismiss(height * DISMISS_DISTANCE_RATIO + 1, 0, height)).toBe(true);
	});

	it('springs back after a short slow drag', () => {
		expect(shouldDismiss(40, 0.1, height)).toBe(false);
	});

	it('dismisses on a quick downward flick even after a short drag', () => {
		expect(shouldDismiss(30, DISMISS_VELOCITY + 0.1, height)).toBe(true);
	});

	it('stays open when flicked back up even after a long drag', () => {
		expect(shouldDismiss(400, -(DISMISS_VELOCITY + 0.1), height)).toBe(false);
	});
});

describe('releaseVelocity', () => {
	it('is zero with fewer than two recent samples', () => {
		expect(releaseVelocity([], 1000)).toBe(0);
		expect(releaseVelocity([{ y: 10, t: 990 }], 1000)).toBe(0);
	});

	it('measures pixels per millisecond over the last moments', () => {
		const samples = [
			{ y: 100, t: 940 },
			{ y: 140, t: 960 },
			{ y: 200, t: 980 }
		];
		expect(releaseVelocity(samples, 1000)).toBeCloseTo(100 / 40);
	});

	it('ignores samples that are too old to matter', () => {
		const samples = [
			{ y: 0, t: 100 },
			{ y: 500, t: 200 }
		];
		expect(releaseVelocity(samples, 1000)).toBe(0);
	});

	it('is negative when moving up', () => {
		expect(
			releaseVelocity(
				[
					{ y: 300, t: 950 },
					{ y: 200, t: 990 }
				],
				1000
			)
		).toBeLessThan(0);
	});
});
