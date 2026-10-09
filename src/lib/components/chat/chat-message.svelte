<script lang="ts">
	import {
		Message,
		MessageContent,
		MessageResponse
	} from '#lib/components/ai-elements/message/index.js';
	import {
		recoveredStepKeys,
		stepsOf,
		toAgentStep,
		type AgentStep as AgentStepData,
		type ChatUIMessage
	} from '#lib/chat-types.js';
	import AgentTrace from './agent-trace.svelte';

	interface Props {
		message: ChatUIMessage;
		streaming?: boolean;
		undoableRevisionId?: string | null;
		undoing?: boolean;
		onundo?: (revisionId: string) => void;
		onupdate?: (blocks: number[]) => void;
	}

	let {
		message,
		streaming = false,
		undoableRevisionId = null,
		undoing = false,
		onundo,
		onupdate
	}: Props = $props();

	type RenderPart =
		| { kind: 'text'; index: number; text: string }
		| { kind: 'trace'; index: number; steps: AgentStepData[] };

	const parts = $derived.by(() => {
		const recovered = recoveredStepKeys(stepsOf(message));
		const result: RenderPart[] = [];
		message.parts.forEach((part, index) => {
			if (part.type === 'text') {
				if (part.text) result.push({ kind: 'text', index, text: part.text });
				return;
			}
			const step = toAgentStep(part as Parameters<typeof toAgentStep>[0]);
			if (!step || recovered.has(step.key)) return;
			const last = result[result.length - 1];
			if (last?.kind === 'trace') last.steps.push(step);
			else result.push({ kind: 'trace', index, steps: [step] });
		});
		return result;
	});
	const model = $derived(message.role === 'assistant' ? (message.metadata?.model ?? null) : null);
</script>

<Message from={message.role} class="gap-2">
	{#each parts as part, position (part.index)}
		{#if part.kind === 'text'}
			<MessageContent>
				{#if message.role === 'assistant'}
					<MessageResponse content={part.text} />
				{:else}
					<p class="whitespace-pre-wrap">{part.text}</p>
				{/if}
			</MessageContent>
		{:else}
			<AgentTrace
				steps={part.steps}
				live={streaming && position === parts.length - 1}
				undoableRevisionId={streaming ? null : undoableRevisionId}
				{undoing}
				{onundo}
				{onupdate}
			/>
		{/if}
	{/each}
	{#if model && !streaming && parts.length > 0}
		<p class="text-caption text-muted-foreground">{model}</p>
	{/if}
</Message>
