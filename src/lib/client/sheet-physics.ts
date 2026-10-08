export type Stop = 'peek' | 'medium' | 'large';

export const SHEET = {
	deceleration: 0.998,
	flickVelocity: 0.5,
	rubberBand: 0.55,
	rubberReach: 24,
	mediumRatio: 0.55,
	mediumMinExtra: 160,
	topGap: 16,
	hysteresis: 8,
	velocityWindowMs: 100,
	settleDistance: 0.5,
	settleSpeed: 5
} as const;

export interface SpringConfig {
	response: number;
	damping: number;
}

export const SPRING_DEFAULT: SpringConfig = { response: 0.35, damping: 1 };
export const SPRING_FLICK: SpringConfig = { response: 0.3, damping: 0.8 };

export type Stops = Record<Stop, number>;

export function computeStops(peek: number, viewportHeight: number): Stops {
	const large = Math.max(peek, viewportHeight - SHEET.topGap);
	const wanted = Math.round(SHEET.mediumRatio * viewportHeight);
	const medium = Math.min(
		Math.max(peek + SHEET.mediumMinExtra, wanted),
		Math.max(peek, large - 40)
	);
	return { peek, medium, large };
}

export function project(velocity: number): number {
	return (velocity * SHEET.deceleration) / (1 - SHEET.deceleration);
}

export function nearestStop(height: number, heightVelocity: number, stops: Stops): Stop {
	const target = height + project(heightVelocity);
	let best: Stop = 'peek';
	for (const stop of ['peek', 'medium', 'large'] as const) {
		if (Math.abs(stops[stop] - target) < Math.abs(stops[best] - target)) best = stop;
	}
	return best;
}

export function stopAbove(stop: Stop): Stop {
	return stop === 'peek' ? 'medium' : 'large';
}

export function stopBelow(stop: Stop): Stop {
	return stop === 'large' ? 'medium' : 'peek';
}

export function rubberband(overshoot: number, dimension: number, constant = SHEET.rubberBand) {
	if (overshoot === 0) return 0;
	const sign = Math.sign(overshoot);
	const distance = Math.abs(overshoot);
	return (sign * (distance * dimension * constant)) / (dimension + constant * distance);
}

export function draggedHeight(raw: number, stops: Stops): number {
	if (raw > stops.large) return stops.large + rubberband(raw - stops.large, SHEET.rubberReach);
	if (raw < stops.peek) return stops.peek - rubberband(stops.peek - raw, SHEET.rubberReach);
	return raw;
}

export function releaseVelocity(samples: { y: number; t: number }[], now: number): number {
	const recent = samples.filter((sample) => now - sample.t <= SHEET.velocityWindowMs);
	if (recent.length < 2) return 0;
	const first = recent[0];
	const last = recent[recent.length - 1];
	const elapsed = last.t - first.t;
	return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
}

export function springConfigFor(speed: number): SpringConfig {
	return Math.abs(speed) > SHEET.flickVelocity ? SPRING_FLICK : SPRING_DEFAULT;
}

export function springState(
	t: number,
	from: number,
	to: number,
	velocity: number,
	config: SpringConfig
): { x: number; v: number } {
	const omega = (2 * Math.PI) / config.response;
	const a = from - to;
	if (config.damping >= 1) {
		const b = velocity + omega * a;
		const decay = Math.exp(-omega * t);
		return { x: to + (a + b * t) * decay, v: (b - omega * (a + b * t)) * decay };
	}
	const zeta = config.damping;
	const damped = omega * Math.sqrt(1 - zeta * zeta);
	const c = (velocity + zeta * omega * a) / damped;
	const decay = Math.exp(-zeta * omega * t);
	const cos = Math.cos(damped * t);
	const sin = Math.sin(damped * t);
	return {
		x: to + decay * (a * cos + c * sin),
		v: decay * (-zeta * omega * (a * cos + c * sin) + (-a * damped * sin + c * damped * cos))
	};
}

export function isSettled(x: number, v: number, to: number): boolean {
	return Math.abs(x - to) < SHEET.settleDistance && Math.abs(v) < SHEET.settleSpeed;
}
