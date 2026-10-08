import { describe, expect, it } from 'vitest';
import { createSendGate, type GateRedis } from './send-gate.js';

function fakeRedis() {
	let now = 0;
	const values = new Map<string, { value: string; expiresAt: number | null }>();
	const live = (key: string) => {
		const entry = values.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt !== null && entry.expiresAt <= now) {
			values.delete(key);
			return undefined;
		}
		return entry;
	};
	const redis: GateRedis = {
		async set(key, value, _mode, seconds) {
			if (live(key)) return null;
			values.set(key, { value, expiresAt: now + seconds * 1000 });
			return 'OK';
		},
		async incr(key) {
			const entry = live(key);
			const next = Number(entry?.value ?? 0) + 1;
			values.set(key, { value: String(next), expiresAt: entry?.expiresAt ?? null });
			return next;
		},
		async expire(key, seconds) {
			const entry = live(key);
			if (!entry) return 0;
			entry.expiresAt = now + seconds * 1000;
			return 1;
		},
		async ttl(key) {
			const entry = live(key);
			if (!entry) return -2;
			if (entry.expiresAt === null) return -1;
			return Math.ceil((entry.expiresAt - now) / 1000);
		},
		async get(key) {
			return live(key)?.value ?? null;
		}
	};
	return { redis, advance: (seconds: number) => void (now += seconds * 1000) };
}

describe('send gate', () => {
	it('allows the first send and blocks a second one during the cooldown', async () => {
		const { redis, advance } = fakeRedis();
		const gate = createSendGate(redis, { cooldownSeconds: 60, perHour: 5 });
		expect(await gate.take('a@x.io')).toEqual({ ok: true });
		expect(await gate.take('a@x.io')).toEqual({ ok: false, retryAfter: 60 });
		advance(20);
		expect(await gate.wait('a@x.io')).toBe(40);
		advance(41);
		expect(await gate.wait('a@x.io')).toBe(0);
		expect(await gate.take('a@x.io')).toEqual({ ok: true });
	});

	it('treats upper and lower case addresses as one', async () => {
		const { redis } = fakeRedis();
		const gate = createSendGate(redis, { cooldownSeconds: 60, perHour: 5 });
		await gate.take('Reader@X.io');
		expect((await gate.take('reader@x.io')).ok).toBe(false);
	});

	it('keeps different addresses apart', async () => {
		const { redis } = fakeRedis();
		const gate = createSendGate(redis, { cooldownSeconds: 60, perHour: 5 });
		await gate.take('a@x.io');
		expect(await gate.take('b@x.io')).toEqual({ ok: true });
	});

	it('stops after the hourly cap even when the cooldown has passed', async () => {
		const { redis, advance } = fakeRedis();
		const gate = createSendGate(redis, { cooldownSeconds: 60, perHour: 3 });
		for (let i = 0; i < 3; i++) {
			expect(await gate.take('a@x.io')).toEqual({ ok: true });
			advance(61);
		}
		expect(await gate.wait('a@x.io')).toBeGreaterThan(60);
		const blocked = await gate.take('a@x.io');
		expect(blocked.ok).toBe(false);
		advance(3600);
		expect(await gate.take('a@x.io')).toEqual({ ok: true });
	});
});
