import { MockLanguageModelV4 } from 'ai/test';
import { createFakeModel } from './fake-model.js';

type MockInit = NonNullable<ConstructorParameters<typeof MockLanguageModelV4>[0]>;
type DoStream = Extract<NonNullable<MockInit['doStream']>, (...args: never[]) => unknown>;
type StreamPart =
	Awaited<ReturnType<DoStream>> extends { stream: ReadableStream<infer Part> } ? Part : never;

interface PromptMessage {
	role: string;
	content: unknown;
}

const USAGE = {
	inputTokens: { total: 50, noCache: 50, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 20, text: 20, reasoning: 0 }
};

function textOf(message: PromptMessage | undefined): string {
	if (!message || !Array.isArray(message.content)) return '';
	return (message.content as { type: string; text?: string }[])
		.map((part) => (part.type === 'text' ? (part.text ?? '') : ''))
		.join(' ');
}

function stream(parts: StreamPart[]) {
	return new ReadableStream<StreamPart>({
		start(controller) {
			for (const part of parts) controller.enqueue(part);
			controller.close();
		}
	});
}

function reply(text: string): StreamPart[] {
	return [
		{ type: 'stream-start', warnings: [] },
		{ type: 'text-start', id: 't1' },
		{ type: 'text-delta', id: 't1', delta: text },
		{ type: 'text-end', id: 't1' },
		{ type: 'finish', usage: USAGE, finishReason: { unified: 'stop', raw: 'stop' } }
	];
}

function toolCall(toolName: string, input: unknown): StreamPart[] {
	return [
		{ type: 'stream-start', warnings: [] },
		{ type: 'tool-call', toolCallId: `call-${toolName}`, toolName, input: JSON.stringify(input) },
		{ type: 'finish', usage: USAGE, finishReason: { unified: 'tool-calls', raw: 'tool_calls' } }
	];
}

export function planChatAction(
	text: string
): { tool: string; input: Record<string, unknown> } | null {
	const lower = text.toLowerCase();
	const block = Number(/block\s+(\d+)/.exec(lower)?.[1] ?? 1);
	if (/\b(weekend|study days|schedule)\b/.test(lower)) {
		return { tool: 'update_schedule', input: { studyDays: [0, 6] } };
	}
	if (/\b(outline|restructure)\b/.test(lower)) {
		return { tool: 'restructure_outline', input: { instruction: text } };
	}
	if (/\b(easier|harder|rewrite|simplify|shorter)\b/.test(lower)) {
		return {
			tool: 'revise_blocks',
			input: { fromBlock: block, toBlock: block, instruction: text }
		};
	}
	if (/\bshow|what is in\b/.test(lower)) return { tool: 'get_plan', input: { block } };
	return null;
}

export function createFakeChatModel() {
	const writer = createFakeModel();
	return new MockLanguageModelV4({
		provider: 'fake',
		modelId: 'fake-chat-model',
		doGenerate: (options) => writer.doGenerate(options),
		doStream: async (options) => {
			const messages = options.prompt as PromptMessage[];
			const last = messages[messages.length - 1];
			const hasTools = (options.tools ?? []).length > 0;

			if (last?.role === 'tool') {
				return { stream: stream(reply('Done. The plan has been updated.')) };
			}

			const text = textOf([...messages].reverse().find((message) => message.role === 'user'));
			const action = hasTools ? planChatAction(text) : null;
			if (action) return { stream: stream(toolCall(action.tool, action.input)) };
			return {
				stream: stream(reply(hasTools ? `Fake answer: ${text}` : `Q&A only: ${text}`))
			};
		}
	});
}
