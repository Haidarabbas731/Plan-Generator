import { describe, expect, it } from 'vitest';
import { createRedisOutbox, OUTBOX_KEEP_SECONDS, outboxKey } from './email-outbox.js';

describe('redis outbox', () => {
	it('keeps the newest messages per address for a few minutes', async () => {
		const calls: unknown[][] = [];
		const outbox = createRedisOutbox({
			lpush: async (...args) => (calls.push(['lpush', ...args]), 1),
			ltrim: async (...args) => (calls.push(['ltrim', ...args]), 'OK'),
			expire: async (...args) => (calls.push(['expire', ...args]), 1)
		});
		await outbox.save({ to: 'Reader@Example.com', subject: 'Hi', text: 'Code 123456' });

		const key = outboxKey('reader@example.com');
		expect(calls[0][0]).toBe('lpush');
		expect(calls[0][1]).toBe(key);
		expect(JSON.parse(String(calls[0][2]))).toEqual({
			subject: 'Hi',
			text: 'Code 123456',
			html: null
		});
		expect(calls[1]).toEqual(['ltrim', key, 0, 9]);
		expect(calls[2]).toEqual(['expire', key, OUTBOX_KEEP_SECONDS]);
	});
});
