import { describe, expect, it, vi } from 'vitest';
import { createModelCatalog, parseModels } from './model-list.js';

const json = (body: unknown, status = 200) =>
	vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe('parseModels', () => {
	it('keeps Gemini models that can generate text and strips the prefix', () => {
		const models = parseModels('google', {
			models: [
				{
					name: 'models/gemini-b',
					displayName: 'Gemini B',
					supportedGenerationMethods: ['generateContent']
				},
				{ name: 'models/embed', supportedGenerationMethods: ['embedContent'] },
				{
					name: 'models/gemini-a',
					displayName: 'Gemini A',
					supportedGenerationMethods: ['generateContent']
				}
			]
		});
		expect(models).toEqual([
			{ id: 'gemini-a', name: 'Gemini A' },
			{ id: 'gemini-b', name: 'Gemini B' }
		]);
	});

	it('hides OpenAI models that are not for chat', () => {
		const models = parseModels('openai', {
			data: [
				{ id: 'gpt-x' },
				{ id: 'text-embedding-3-small' },
				{ id: 'whisper-1' },
				{ id: 'gpt-image-1' }
			]
		});
		expect(models.map((model) => model.id)).toEqual(['gpt-x']);
	});

	it('uses Anthropic display names', () => {
		expect(
			parseModels('anthropic', { data: [{ id: 'claude-x', display_name: 'Claude X' }] })
		).toEqual([{ id: 'claude-x', name: 'Claude X' }]);
	});

	it('keeps OpenRouter models that take and return text', () => {
		const models = parseModels('openrouter', {
			data: [
				{
					id: 'a/text',
					name: 'Text',
					architecture: { input_modalities: ['text'], output_modalities: ['text'] }
				},
				{
					id: 'b/image',
					name: 'Image',
					architecture: { input_modalities: ['text'], output_modalities: ['image'] }
				}
			]
		});
		expect(models.map((model) => model.id)).toEqual(['a/text']);
	});

	it('turns OpenRouter per-token prices into dollars per million tokens', () => {
		const models = parseModels('openrouter', {
			data: [
				{ id: 'a/paid', name: 'Paid', pricing: { prompt: '0.000003', completion: '0.000015' } },
				{ id: 'b/free:free', name: 'Free', pricing: { prompt: '0', completion: '0' } },
				{ id: 'c/router', name: 'Router', pricing: { prompt: '-1', completion: '-1' } },
				{ id: 'd/none', name: 'None' }
			]
		});
		const byId = Object.fromEntries(models.map((model) => [model.id, model.pricing]));
		expect(byId['a/paid']).toEqual({ input: 3, output: 15 });
		expect(byId['b/free:free']).toEqual({ input: 0, output: 0 });
		expect(byId['c/router']).toBeUndefined();
		expect(byId['d/none']).toBeUndefined();
	});

	it('gives no prices for providers whose model list has none', () => {
		const models = parseModels('openai', { data: [{ id: 'gpt-x', owned_by: 'openai' }] });
		expect(models).toEqual([{ id: 'gpt-x', name: 'gpt-x' }]);
	});

	it('returns an empty list for unexpected bodies', () => {
		expect(parseModels('openai', null)).toEqual([]);
		expect(parseModels('google', { models: 'nope' })).toEqual([]);
	});
});

describe('model catalog', () => {
	it('fetches once and serves later calls from the cache', async () => {
		const fetchImpl = json({ data: [{ id: 'gpt-x' }] });
		const catalog = createModelCatalog({ fetchImpl });
		await catalog.list('u1', 'openai', 'key-1');
		const again = await catalog.list('u1', 'openai', 'key-1');
		expect(again).toMatchObject({ ok: true });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	it('refreshes after the time limit and when asked', async () => {
		let time = 0;
		const fetchImpl = json({ data: [{ id: 'gpt-x' }] });
		const catalog = createModelCatalog({ fetchImpl, now: () => time, ttlMs: 1000 });
		await catalog.list('u1', 'openai', 'key-1');
		time = 1500;
		await catalog.list('u1', 'openai', 'key-1');
		await catalog.list('u1', 'openai', 'key-1', true);
		expect(fetchImpl).toHaveBeenCalledTimes(3);
	});

	it('keeps users and providers apart', async () => {
		const fetchImpl = json({ data: [{ id: 'gpt-x' }] });
		const catalog = createModelCatalog({ fetchImpl });
		await catalog.list('u1', 'openai', 'key-1');
		await catalog.list('u2', 'openai', 'key-2');
		await catalog.list('u1', 'openrouter', 'key-3');
		expect(fetchImpl).toHaveBeenCalledTimes(3);
	});

	it('drops the oldest entries past the size cap', async () => {
		const catalog = createModelCatalog({ fetchImpl: json({ data: [] }), maxEntries: 2 });
		await catalog.list('u1', 'openai', 'k');
		await catalog.list('u2', 'openai', 'k');
		await catalog.list('u3', 'openai', 'k');
		expect(catalog.size()).toBe(2);
	});

	it('maps provider errors and never caches them', async () => {
		const catalog = createModelCatalog({ fetchImpl: json({}, 401) });
		expect(await catalog.list('u1', 'openai', 'bad')).toMatchObject({
			ok: false,
			reason: 'rejected'
		});
		expect(catalog.size()).toBe(0);

		const down = createModelCatalog({
			fetchImpl: vi.fn<typeof fetch>(async () => {
				throw new Error('offline');
			})
		});
		expect(await down.list('u1', 'openai', 'k')).toMatchObject({
			ok: false,
			reason: 'unreachable'
		});
	});

	it('sends the key only in a header', async () => {
		const fetchImpl = json({ data: [] });
		await createModelCatalog({ fetchImpl }).list('u1', 'openai', 'secret-key');
		const [url, init] = fetchImpl.mock.calls[0];
		expect(String(url)).not.toContain('secret-key');
		expect((init!.headers as Record<string, string>).Authorization).toContain('secret-key');
	});
});
