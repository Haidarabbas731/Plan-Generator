import { describe, expect, it, vi } from 'vitest';
import { PROVIDERS } from '#lib/providers.js';
import { checkKey } from './key-check.js';

const respond = (status: number) => vi.fn<typeof fetch>(async () => new Response('{}', { status }));

describe('checkKey', () => {
	it('sends the right request for each provider', async () => {
		const expectations = {
			google: { url: 'generativelanguage.googleapis.com/v1beta/models', header: 'x-goog-api-key' },
			openai: { url: 'api.openai.com/v1/models', header: 'Authorization' },
			anthropic: { url: 'api.anthropic.com/v1/models', header: 'x-api-key' },
			openrouter: { url: 'openrouter.ai/api/v1/key', header: 'Authorization' }
		} as const;

		for (const provider of PROVIDERS) {
			const fetchMock = respond(200);
			const result = await checkKey(provider, 'secret-123', fetchMock);
			expect(result).toEqual({ ok: true });

			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toContain(expectations[provider].url);
			expect(init!.method).toBe('GET');
			const headers = init!.headers as Record<string, string>;
			expect(headers[expectations[provider].header]).toContain('secret-123');
		}
	});

	it('never puts the key in the URL', async () => {
		for (const provider of PROVIDERS) {
			const fetchMock = respond(200);
			await checkKey(provider, 'secret-123', fetchMock);
			expect(String(fetchMock.mock.calls[0][0])).not.toContain('secret-123');
		}
	});

	it('adds the Anthropic version header', async () => {
		const fetchMock = respond(200);
		await checkKey('anthropic', 'k', fetchMock);
		const init = fetchMock.mock.calls[0][1]!;
		expect((init.headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01');
	});

	it.each([400, 401, 403])('treats %i as a rejected key', async (status) => {
		const result = await checkKey('google', 'k', respond(status));
		expect(result).toMatchObject({ ok: false, reason: 'rejected' });
	});

	it('reports rate limiting', async () => {
		const result = await checkKey('openai', 'k', respond(429));
		expect(result).toMatchObject({ ok: false, reason: 'rate_limited' });
	});

	it('reports provider errors as unreachable', async () => {
		const result = await checkKey('openai', 'k', respond(503));
		expect(result).toMatchObject({ ok: false, reason: 'unreachable' });
	});

	it('reports network failures as unreachable without leaking the key', async () => {
		const failing = vi.fn<typeof fetch>(async () => {
			throw new TypeError('fetch failed for secret-123');
		});
		const result = await checkKey('openai', 'secret-123', failing);
		expect(result).toMatchObject({ ok: false, reason: 'unreachable' });
		expect(JSON.stringify(result)).not.toContain('secret-123');
	});
});
