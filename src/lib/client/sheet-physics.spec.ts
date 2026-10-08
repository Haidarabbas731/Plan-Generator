import { describe, expect, it } from 'vitest';
import {
	SHEET,
	SPRING_DEFAULT,
	SPRING_FLICK,
	computeStops,
	draggedHeight,
	isSettled,
	nearestStop,
	project,
	releaseVelocity,
	rubberband,
	springConfigFor,
	springState,
	stopAbove,
	stopBelow
} from './sheet-physics.js';

describe('computeStops', () => {
	it('puts medium at 55% of the visible height and large just below the top', () => {
		const stops = computeStops(104, 800);
		expect(stops.peek).toBe(104);
		expect(stops.medium).toBe(440);
		expect(stops.large).toBe(800 - SHEET.topGap);
	});

	it('keeps the stops in order on a very short viewport', () => {
		const stops = computeStops(104, 300);
		expect(stops.peek).toBeLessThanOrEqual(stops.medium);
		expect(stops.medium).toBeLessThanOrEqual(stops.large);
	});
});

describe('project', () => {
	it('throws a flick about 500 pixels for every pixel per millisecond', () => {
		expect(project(0.3)).toBeCloseTo(149.7, 1);
		expect(project(0)).toBe(0);
		expect(project(-0.3)).toBeCloseTo(-149.7, 1);
	});
});

describe('nearestStop', () => {
	const stops = computeStops(104, 800);

	it('stays on the stop for a slow drag that ends nearby', () => {
		expect(nearestStop(430, 0, stops)).toBe('medium');
		expect(nearestStop(120, 0, stops)).toBe('peek');
	});

	it('goes to the next stop up after a short flick up', () => {
		expect(nearestStop(440, 0.5, stops)).toBe('large');
	});

	it('goes down after a flick down', () => {
		expect(nearestStop(440, -0.6, stops)).toBe('peek');
	});

	it('moves by one stop through the helpers', () => {
		expect(stopAbove('peek')).toBe('medium');
		expect(stopAbove('large')).toBe('large');
		expect(stopBelow('large')).toBe('medium');
		expect(stopBelow('peek')).toBe('peek');
	});
});

describe('rubber band', () => {
	it('resists more the further it is pulled and never reaches the dimension', () => {
		expect(rubberband(0, 800)).toBe(0);
		expect(rubberband(50, 800)).toBeLessThan(50);
		expect(rubberband(400, 800)).toBeGreaterThan(rubberband(50, 800));
		expect(rubberband(100000, 800)).toBeLessThan(800);
	});

	it('follows the finger inside the stops and resists beyond them', () => {
		const stops = computeStops(104, 800);
		expect(draggedHeight(300, stops)).toBe(300);
		expect(draggedHeight(stops.large + 100, stops)).toBeGreaterThan(stops.large);
		expect(draggedHeight(stops.large + 100, stops)).toBeLessThan(stops.large + 100);
		expect(draggedHeight(stops.peek - 60, stops)).toBeLessThan(stops.peek);
		expect(draggedHeight(stops.peek - 60, stops)).toBeGreaterThan(stops.peek - 60);
	});

	it('never stretches further than the reach past either end', () => {
		const stops = computeStops(104, 800);
		expect(draggedHeight(stops.large + 5000, stops)).toBeLessThan(stops.large + SHEET.rubberReach);
		expect(draggedHeight(stops.peek - 5000, stops)).toBeGreaterThan(stops.peek - SHEET.rubberReach);
	});
});

describe('releaseVelocity', () => {
	it('is zero with fewer than two recent samples', () => {
		expect(releaseVelocity([], 1000)).toBe(0);
		expect(releaseVelocity([{ y: 10, t: 990 }], 1000)).toBe(0);
	});

	it('measures pixels per millisecond over the last moments and ignores old samples', () => {
		const samples = [
			{ y: 100, t: 940 },
			{ y: 140, t: 960 },
			{ y: 200, t: 980 }
		];
		expect(releaseVelocity(samples, 1000)).toBeCloseTo(100 / 40);
		expect(
			releaseVelocity(
				[
					{ y: 0, t: 100 },
					{ y: 500, t: 200 }
				],
				1000
			)
		).toBe(0);
	});
});

describe('spring', () => {
	it('starts at the start value and the start speed', () => {
		const state = springState(0, 100, 500, 300, SPRING_DEFAULT);
		expect(state.x).toBeCloseTo(100);
		expect(state.v).toBeCloseTo(300);
	});

	it('settles on the target without overshoot when critically damped', () => {
		let maxX = -Infinity;
		for (let t = 0; t <= 1.5; t += 0.01) {
			maxX = Math.max(maxX, springState(t, 100, 500, 0, SPRING_DEFAULT).x);
		}
		expect(maxX).toBeLessThanOrEqual(500.0001);
		const end = springState(1.5, 100, 500, 0, SPRING_DEFAULT);
		expect(isSettled(end.x, end.v, 500)).toBe(true);
	});

	it('overshoots the target once when under damped', () => {
		let maxX = -Infinity;
		for (let t = 0; t <= 1.5; t += 0.005) {
			maxX = Math.max(maxX, springState(t, 100, 500, 800, SPRING_FLICK).x);
		}
		expect(maxX).toBeGreaterThan(500);
		expect(maxX).toBeLessThan(530);
		const end = springState(2, 100, 500, 800, SPRING_FLICK);
		expect(isSettled(end.x, end.v, 500)).toBe(true);
	});

	it('uses the drawer spring only after a hard flick', () => {
		expect(springConfigFor(0.2)).toEqual(SPRING_DEFAULT);
		expect(springConfigFor(-0.8)).toEqual(SPRING_FLICK);
	});
});
