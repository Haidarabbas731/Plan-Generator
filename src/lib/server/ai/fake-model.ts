import { MockLanguageModelV4 } from 'ai/test';
import { LIMITS } from '#lib/limits.js';

export type BlockFault = 'duplicate-title' | 'missing-day' | 'invalid-json' | 'too-long';

export interface FakeModelOptions {
	outlineFirstAttemptFails?: boolean;
	outlineAlwaysFails?: boolean;
	blockFirstAttemptFails?: Record<number, BlockFault>;
	blockAlwaysFails?: number[];
	delayMs?: number;
	dayDelayMs?: number;
}

const RETRY_MARKER = 'Your previous answer had these problems';

function userText(prompt: unknown): string {
	const messages = prompt as { role: string; content: unknown }[];
	return messages
		.filter((message) => message.role === 'user')
		.flatMap((message) => message.content as { type: string; text?: string }[])
		.map((part) => (part.type === 'text' ? (part.text ?? '') : ''))
		.join('\n');
}

function pick(text: string, pattern: RegExp): string {
	return pattern.exec(text)?.[1] ?? '';
}

function revisionOf(text: string): string {
	return pick(text, /<revision_request>(.*?)<\/revision_request>/s);
}

function outline(text: string, dropLast: boolean) {
	const revision = revisionOf(text);
	const blocks = [...text.matchAll(/<block index="(\d+)" start="(\d+)" end="(\d+)" \/>/g)].map(
		(m) => ({ index: Number(m[1]), startDay: Number(m[2]), endDay: Number(m[3]) })
	);
	const used = dropLast ? blocks.slice(0, -1) : blocks;
	return {
		title: `Fake plan: ${pick(text, /<goal>(.*?)<\/goal>/s)}`.slice(0, 70),
		overview: revision
			? `A deterministic plan for tests. Revised: ${revision}`
			: 'A deterministic plan for tests.',
		finalOutcome: 'The learner can do the thing.',
		topicTag: 'fake',
		blocks: used.map((block) => ({
			...block,
			theme: `Theme ${block.index + 1}`,
			objective: revision
				? `Learn the topics of block ${block.index + 1}. Revised: ${revision}`
				: `Learn the topics of block ${block.index + 1}.`,
			covers: [`topic ${block.index}a`, `topic ${block.index}b`],
			notCovers: [],
			milestone: {
				title: `Milestone ${block.index + 1}`,
				description: 'Build a small thing.',
				successCriteria: 'It works.'
			}
		}))
	};
}

function block(text: string, fault: BlockFault | undefined) {
	const revision = revisionOf(text);
	const tag = /<this_block index="(\d+)" start="(\d+)" end="(\d+)">/.exec(text);
	const start = Number(tag?.[2]);
	const end = Number(tag?.[3]);
	const minutes = Number(pick(text, /<minutes_per_day>(\d+)<\/minutes_per_day>/));
	const days = [];
	for (let day = start; day <= end; day++) {
		days.push({
			day,
			title: `Lesson ${day}`,
			learn: revision
				? `Study material for day ${day}. Revised: ${revision}`
				: `Study material for day ${day}.`,
			practice: `Do the exercise for day ${day} and check the result.`,
			review: `Recall what you learned before day ${day}.`,
			minutes,
			topics: [`topic ${day}`]
		});
	}
	if (fault === 'duplicate-title') days[0].title = 'Lesson 1';
	if (fault === 'missing-day') days.pop();
	if (fault === 'too-long') days[1].practice = 'x'.repeat(LIMITS.dayPracticeMax + 1);
	return { days };
}

const USAGE = {
	inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 200, text: 200, reasoning: 0 }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createFakeModel(options: FakeModelOptions = {}) {
	const answer = (prompt: unknown) => {
		const text = userText(prompt);
		const retry = text.includes(RETRY_MARKER);

		if (text.includes('<task>outline</task>')) {
			const fail = options.outlineAlwaysFails || (options.outlineFirstAttemptFails && !retry);
			return { kind: 'outline' as const, payload: JSON.stringify(outline(text, Boolean(fail))) };
		}

		const index = Number(pick(text, /<this_block index="(\d+)"/));
		const always = options.blockAlwaysFails?.includes(index);
		const first = !retry ? options.blockFirstAttemptFails?.[index] : undefined;
		const fault = always ? 'missing-day' : first;
		if (fault === 'invalid-json')
			return { kind: 'block' as const, payload: 'this is not json', days: null };
		const { days } = block(text, fault);
		return { kind: 'block' as const, payload: JSON.stringify({ days }), days };
	};

	return new MockLanguageModelV4({
		provider: 'fake',
		modelId: 'fake-model',
		doGenerate: async (callOptions) => {
			if (options.delayMs) await sleep(options.delayMs);
			callOptions.abortSignal?.throwIfAborted();

			return {
				content: [{ type: 'text' as const, text: answer(callOptions.prompt).payload }],
				finishReason: { unified: 'stop' as const, raw: 'stop' },
				usage: USAGE,
				warnings: []
			};
		},
		doStream: async (callOptions) => {
			if (options.delayMs) await sleep(options.delayMs);
			callOptions.abortSignal?.throwIfAborted();

			const result = answer(callOptions.prompt);
			const pieces =
				result.kind === 'block' && result.days
					? result.days.map(
							(day, i) =>
								`${i === 0 ? '{"elements":[' : ','}${JSON.stringify(day)}${
									i === result.days.length - 1 ? ']}' : ''
								}`
						)
					: [result.payload];

			const stream = new ReadableStream({
				async start(controller) {
					controller.enqueue({ type: 'stream-start', warnings: [] });
					controller.enqueue({ type: 'text-start', id: 't1' });
					for (const piece of pieces) {
						if (options.dayDelayMs) await sleep(options.dayDelayMs);
						if (callOptions.abortSignal?.aborted) {
							controller.error(callOptions.abortSignal.reason);
							return;
						}
						controller.enqueue({ type: 'text-delta', id: 't1', delta: piece });
					}
					controller.enqueue({ type: 'text-end', id: 't1' });
					controller.enqueue({
						type: 'finish',
						usage: USAGE,
						finishReason: { unified: 'stop', raw: 'stop' }
					});
					controller.close();
				}
			});
			return { stream };
		}
	});
}
