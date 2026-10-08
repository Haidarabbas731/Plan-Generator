import type { EmailMessage, EmailOutbox } from './email.js';

export interface OutboxRedis {
	lpush(key: string, value: string): Promise<number>;
	ltrim(key: string, start: number, stop: number): Promise<'OK'>;
	expire(key: string, seconds: number): Promise<number>;
}

export const OUTBOX_KEEP_SECONDS = 300;
const OUTBOX_KEEP_MESSAGES = 10;

export const outboxKey = (address: string) => `email-outbox:${address.trim().toLowerCase()}`;

export function createRedisOutbox(redis: OutboxRedis): EmailOutbox {
	return {
		async save(message: EmailMessage) {
			const key = outboxKey(message.to);
			await redis.lpush(
				key,
				JSON.stringify({ subject: message.subject, text: message.text, html: message.html ?? null })
			);
			await redis.ltrim(key, 0, OUTBOX_KEEP_MESSAGES - 1);
			await redis.expire(key, OUTBOX_KEEP_SECONDS);
		}
	};
}
