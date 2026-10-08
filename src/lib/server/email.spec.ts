import { describe, expect, it, vi } from 'vitest';
import { createEmailSender, RESEND_ENDPOINT } from './email.js';

const message = { to: 'a@example.com', subject: 'Hi', text: 'Body' };

describe('email sender', () => {
	it('is disabled and sends nothing without a key and a sender address', async () => {
		const fetcher = vi.fn<typeof fetch>();
		expect(createEmailSender({ apiKey: 'k', from: undefined, fetch: fetcher }).enabled).toBe(false);
		const sender = createEmailSender({ apiKey: undefined, from: 'x@y.z', fetch: fetcher });
		expect(sender.enabled).toBe(false);
		expect(await sender.send(message)).toBe(false);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('posts the message to Resend with the key', async () => {
		const fetcher = vi.fn<typeof fetch>(async () => new Response('{}', { status: 200 }));
		const sender = createEmailSender({ apiKey: 're_123', from: 'Plans <p@x.io>', fetch: fetcher });
		expect(sender.enabled).toBe(true);
		expect(await sender.send(message)).toBe(true);
		const [url, init] = fetcher.mock.calls[0];
		expect(url).toBe(RESEND_ENDPOINT);
		expect((init?.headers as Record<string, string>).authorization).toBe('Bearer re_123');
		expect(JSON.parse(String(init?.body))).toEqual({
			from: 'Plans <p@x.io>',
			to: ['a@example.com'],
			subject: 'Hi',
			text: 'Body'
		});
	});

	it('reports a rejected or failed request instead of throwing', async () => {
		const rejected = createEmailSender({
			apiKey: 'k',
			from: 'f@x.io',
			fetch: async () => new Response('no', { status: 422 })
		});
		expect(await rejected.send(message)).toBe(false);
		const broken = createEmailSender({
			apiKey: 'k',
			from: 'f@x.io',
			fetch: async () => {
				throw new Error('offline');
			}
		});
		expect(await broken.send(message)).toBe(false);
	});
});
