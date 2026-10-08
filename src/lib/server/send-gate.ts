export interface GateRedis {
	set(key: string, value: string, mode: 'EX', seconds: number, flag: 'NX'): Promise<'OK' | null>;
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<number>;
	ttl(key: string): Promise<number>;
	get(key: string): Promise<string | null>;
}

export interface SendGateOptions {
	cooldownSeconds: number;
	perHour: number;
}

export type GateResult = { ok: true } | { ok: false; retryAfter: number };

const HOUR_SECONDS = 3600;

export function createSendGate(redis: GateRedis, options: SendGateOptions) {
	const { cooldownSeconds, perHour } = options;
	const cooldownKey = (address: string) => `otp:cooldown:${address.trim().toLowerCase()}`;
	const hourKey = (address: string) => `otp:hour:${address.trim().toLowerCase()}`;

	async function wait(address: string): Promise<number> {
		const cooldown = await redis.ttl(cooldownKey(address));
		if (cooldown > 0) return cooldown;
		const used = Number((await redis.get(hourKey(address))) ?? 0);
		if (used >= perHour) return Math.max(1, await redis.ttl(hourKey(address)));
		return 0;
	}

	async function take(address: string): Promise<GateResult> {
		const acquired = await redis.set(cooldownKey(address), '1', 'EX', cooldownSeconds, 'NX');
		if (acquired === null) {
			return { ok: false, retryAfter: Math.max(1, await redis.ttl(cooldownKey(address))) };
		}
		const count = await redis.incr(hourKey(address));
		if (count === 1) await redis.expire(hourKey(address), HOUR_SECONDS);
		if (count > perHour) {
			return { ok: false, retryAfter: Math.max(1, await redis.ttl(hourKey(address))) };
		}
		return { ok: true };
	}

	return { wait, take, cooldownSeconds };
}

export type SendGate = ReturnType<typeof createSendGate>;
