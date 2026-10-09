import type { UIMessage } from 'ai';
import type { Provider } from './providers.js';

export interface ChatMessageMetadata {
	provider?: Provider | null;
	model?: string | null;
}

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

export type StepState = 'running' | 'done' | 'failed';

export interface AgentStep {
	key: string;
	tool: string;
	state: StepState;
	label: string;
	detail: string | null;
	revisionId: string | null;
	revisionNumber: number | null;
	staleBlocks: number[];
}

interface ToolPartLike {
	type: string;
	toolCallId?: string;
	state?: string;
	input?: unknown;
	output?: unknown;
	errorText?: string;
}

const EDIT_TOOLS = new Set(['revise_blocks', 'restructure_outline', 'update_schedule']);

export const rangeText = (from: number, to: number) =>
	from === to ? `block ${from}` : `blocks ${from}–${to}`;

function runningLabel(tool: string, input: Record<string, unknown> | undefined): string {
	switch (tool) {
		case 'get_plan':
			return 'Reading the plan';
		case 'revise_blocks': {
			const from = Number(input?.fromBlock);
			const to = Number(input?.toBlock ?? input?.fromBlock);
			return Number.isInteger(from) && Number.isInteger(to)
				? `Rewriting ${rangeText(from, to)}`
				: 'Rewriting blocks';
		}
		case 'restructure_outline':
			return 'Changing the outline';
		case 'update_schedule':
			return 'Updating the schedule';
		default:
			return 'Working';
	}
}

export function toAgentStep(part: ToolPartLike): AgentStep | null {
	if (!part.type.startsWith('tool-')) return null;
	const tool = part.type.slice('tool-'.length);
	const input = (part.input ?? undefined) as Record<string, unknown> | undefined;
	const key = part.toolCallId ?? `${tool}-${JSON.stringify(input ?? {})}`;

	if (part.state === 'output-error') {
		return {
			key,
			tool,
			state: 'failed',
			label: 'Could not finish that step',
			detail: part.errorText ?? null,
			revisionId: null,
			revisionNumber: null,
			staleBlocks: []
		};
	}
	if (part.state !== 'output-available') {
		return {
			key,
			tool,
			state: 'running',
			label: runningLabel(tool, input),
			detail: null,
			revisionId: null,
			revisionNumber: null,
			staleBlocks: []
		};
	}

	const output = (part.output ?? {}) as {
		ok?: boolean;
		message?: string;
		summary?: string;
		revisionId?: string;
		revisionNumber?: number;
		staleBlocks?: number[];
	};
	if (EDIT_TOOLS.has(tool)) {
		return output.ok
			? {
					key,
					tool,
					state: 'done',
					label: output.summary?.replace(/\.$/, '') ?? 'Updated the plan',
					detail: null,
					revisionId: output.revisionId ?? null,
					revisionNumber: output.revisionNumber ?? null,
					staleBlocks: output.staleBlocks ?? []
				}
			: {
					key,
					tool,
					state: 'failed',
					label: 'Nothing was changed',
					detail: output.message ?? null,
					revisionId: null,
					revisionNumber: null,
					staleBlocks: []
				};
	}
	return {
		key,
		tool,
		state: 'done',
		label: 'Read the plan',
		detail: null,
		revisionId: null,
		revisionNumber: null,
		staleBlocks: []
	};
}

export function recoveredStepKeys(steps: AgentStep[]): Set<string> {
	const keys = new Set<string>();
	steps.forEach((step, index) => {
		if (step.state !== 'failed') return;
		if (
			steps.slice(index + 1).some((later) => later.tool === step.tool && later.state === 'done')
		) {
			keys.add(step.key);
		}
	});
	return keys;
}

export function stepsOf(message: ChatUIMessage): AgentStep[] {
	return message.parts.flatMap((part) => {
		const step = toAgentStep(part as ToolPartLike);
		return step ? [step] : [];
	});
}

export function textOf(message: ChatUIMessage): string {
	return message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('');
}

export function lastEditRevision(
	messages: ChatUIMessage[]
): { id: string; number: number | null } | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const steps = stepsOf(messages[i]).filter((step) => step.revisionId);
		if (steps.length > 0) {
			const last = steps[steps.length - 1];
			return { id: last.revisionId!, number: last.revisionNumber };
		}
	}
	return null;
}

export function lastEditRevisionId(messages: ChatUIMessage[]): string | null {
	return lastEditRevision(messages)?.id ?? null;
}
