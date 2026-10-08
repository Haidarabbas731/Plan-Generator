export function createRateLimiter(options: { max: number; windowMs: number; now?: () => number }) {
	const { max, windowMs } = options;
	const now = options.now ?? Date.now;
	const hits = new Map<string, number[]>();

	return {
		take(key: string): { ok: true } | { ok: false; retryInMinutes: number } {
			const at = now();
			const recent = (hits.get(key) ?? []).filter((time) => time > at - windowMs);
			if (recent.length >= max) {
				hits.set(key, recent);
				const wait = recent[0] + windowMs - at;
				return { ok: false, retryInMinutes: Math.max(1, Math.ceil(wait / 60_000)) };
			}
			recent.push(at);
			hits.set(key, recent);
			if (hits.size > 10_000) {
				for (const [id, times] of hits) {
					if (times.every((time) => time <= at - windowMs)) hits.delete(id);
				}
			}
			return { ok: true };
		}
	};
}
