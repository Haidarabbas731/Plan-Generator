import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { GenerationError, streamValidated } from './generate.js';

const element = z.object({ n: z.number() });
const usage = {
	inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 1, text: 1, reasoning: 0 }
};

function modelOf(answers: (string[] | Error)[]) {
	let call = 0;
	return new MockLanguageModelV4({
		doStream: async () => {
			const answer = answers[Math.min(call++, answers.length - 1)];
			if (answer instanceof Error) throw answer;
			return {
				stream: new ReadableStream({
					start(controller) {
						controller.enqueue({ type: 'stream-start', warnings: [] });
						controller.enqueue({ type: 'text-start', id: 't' });
						for (const delta of answer) controller.enqueue({ type: 'text-delta', id: 't', delta });
						controller.enqueue({ type: 'text-end', id: 't' });
						controller.enqueue({
							type: 'finish',
							usage,
							finishReason: { unified: 'stop', raw: 'stop' }
						});
						controller.close();
					}
				})
			};
		}
	});
}

const run = (model: MockLanguageModelV4, validate: (v: { n: number }[]) => string[] = () => []) => {
	const seen: number[] = [];
	let restarts = 0;
	const result = streamValidated({
		model,
		instructions: 'i',
		prompt: 'p',
		element,
		validate,
		onElement: (item) => seen.push(item.n),
		onRestart: () => restarts++,
		attempts: 2
	});
	return { result, seen, restarts: () => restarts };
};

describe('streamValidated', () => {
	it('hands over each complete element while the answer is still arriving', async () => {
		const model = modelOf([['{"elements":[{"n":1},', '{"n":2},', '{"n":3}]}']]);
		const { result, seen } = run(model);
		expect(await result).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
		expect(seen).toEqual([1, 2, 3]);
	});

	it('starts again with the problems fed back and says so', async () => {
		const model = modelOf([['{"elements":[{"n":1}]}'], ['{"elements":[{"n":1},{"n":2}]}']]);
		const { result, restarts } = run(model, (v) => (v.length < 2 ? ['need two'] : []));
		expect(await result).toHaveLength(2);
		expect(restarts()).toBe(1);
		expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain('need two');
	});

	it('gives up with a GenerationError after the attempts', async () => {
		const model = modelOf([['{"elements":[{"n":"x"}]}']]);
		const { result } = run(model);
		await expect(result).rejects.toBeInstanceOf(GenerationError);
	});

	it('rethrows a provider error instead of retrying it', async () => {
		const model = modelOf([new Error('boom')]);
		const { result } = run(model);
		await expect(result).rejects.toThrow('boom');
		expect(model.doStreamCalls).toHaveLength(1);
	});
});
