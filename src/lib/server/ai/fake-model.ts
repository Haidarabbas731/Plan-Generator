import { MockLanguageModelV4 } from 'ai/test';
import { LIMITS } from '#lib/limits.js';

export type BlockFault = 'duplicate-title' | 'missing-day' | 'invalid-json' | 'too-long';

export interface FakeModelOptions {
	outlineFirstAttemptFails?: boolean;
	outlineAlwaysFails?: boolean;
	blockFirstAttemptFails?: Record<number, BlockFault>;
	blockAlwaysFails?: number[];
	delayMs?: number;
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

function outline(text: string, dropLast: boolean) {
	const blocks = [...text.matchAll(/<block index="(\d+)" start="(\d+)" end="(\d+)" \/>/g)].map(
		(m) => ({ index: Number(m[1]), startDay: Number(m[2]), endDay: Number(m[3]) })
	);
	const used = dropLast ? blocks.slice(0, -1) : blocks;
	return {
		title: `Fake plan: ${pick(text, /<goal>(.*?)<\/goal>/s)}`.slice(0, 70),
		overview: 'A deterministic plan for tests.',
		finalOutcome: 'The learner can do the thing.',
		topicTag: 'fake',
		blocks: used.map((block) => ({
			...block,
			theme: `Theme ${block.index + 1}`,
			objective: `Learn the topics of block ${block.index + 1}.`,
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
	const tag = /<this_block index="(\d+)" start="(\d+)" end="(\d+)">/.exec(text);
	const start = Number(tag?.[2]);
	const end = Number(tag?.[3]);
	const minutes = Number(pick(text, /<minutes_per_day>(\d+)<\/minutes_per_day>/));
	const days = [];
	for (let day = start; day <= end; day++) {
		days.push({
			day,
			title: `Lesson ${day}`,
			learn: `Study material for day ${day}.`,
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

export function createFakeModel(options: FakeModelOptions = {}) {
	return new MockLanguageModelV4({
		provider: 'fake',
		modelId: 'fake-model',
		doGenerate: async (callOptions) => {
			if (options.delayMs) {
				await new Promise((resolve) => setTimeout(resolve, options.delayMs));
			}
			callOptions.abortSignal?.throwIfAborted();

			const text = userText(callOptions.prompt);
			const retry = text.includes(RETRY_MARKER);
			let payload: string;

			if (text.includes('<task>outline</task>')) {
				const fail = options.outlineAlwaysFails || (options.outlineFirstAttemptFails && !retry);
				payload = JSON.stringify(outline(text, Boolean(fail)));
			} else {
				const index = Number(pick(text, /<this_block index="(\d+)"/));
				const always = options.blockAlwaysFails?.includes(index);
				const first = !retry ? options.blockFirstAttemptFails?.[index] : undefined;
				const fault = always ? 'missing-day' : first;
				payload =
					fault === 'invalid-json' ? 'this is not json' : JSON.stringify(block(text, fault));
			}

			return {
				content: [{ type: 'text' as const, text: payload }],
				finishReason: { unified: 'stop' as const, raw: 'stop' },
				usage: {
					inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
					outputTokens: { total: 200, text: 200, reasoning: 0 }
				},
				warnings: []
			};
		}
	});
}
