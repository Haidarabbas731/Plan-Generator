import { describe, expect, it, vi } from 'vitest';
import { createEmailSender, isReservedTestAddress, RESEND_ENDPOINT } from './email.js';

const message = { to: 'reader@gmail.com', subject: 'Hi', text: 'Body' };

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
			to: ['reader@gmail.com'],
			subject: 'Hi',
			text: 'Body'
		});
	});

	it('sends the HTML body and attaches the logo inline only when asked', async () => {
		const fetcher = vi.fn<typeof fetch>(async () => new Response('{}', { status: 200 }));
		const sender = createEmailSender({ apiKey: 'k', from: 'p@x.io', fetch: fetcher });
		await sender.send({ ...message, html: '<p>Hi</p>', inlineLogo: true });
		const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
		expect(body.html).toBe('<p>Hi</p>');
		expect(body.attachments).toEqual([
			expect.objectContaining({ content_id: 'plan-generator-logo', content_type: 'image/png' })
		]);
		await sender.send({ ...message, html: '<p>Hi</p>' });
		expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body)).attachments).toBeUndefined();
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

	it('never sends to reserved test addresses and keeps the message in the outbox', async () => {
		const fetcher = vi.fn<typeof fetch>();
		const saved: string[] = [];
		const sender = createEmailSender({
			apiKey: 'k',
			from: 'f@x.io',
			fetch: fetcher,
			outbox: { save: async (saved_message) => void saved.push(saved_message.to) }
		});
		expect(await sender.send({ ...message, to: 'e2e+1@example.com' })).toBe(true);
		expect(fetcher).not.toHaveBeenCalled();
		expect(saved).toEqual(['e2e+1@example.com']);
	});
});

describe('isReservedTestAddress', () => {
	it('recognises the domains reserved for documentation and testing', () => {
		for (const address of [
			'a@example.com',
			'A@EXAMPLE.ORG',
			'a@example.net',
			'a@mail.test',
			'a@x.invalid',
			'a@app.localhost'
		]) {
			expect(isReservedTestAddress(address)).toBe(true);
		}
	});

	it('lets real addresses through', () => {
		for (const address of ['a@gmail.com', 'a@example.com.au', 'a@notexample.com', 'a@test.io']) {
			expect(isReservedTestAddress(address)).toBe(false);
		}
	});
});
