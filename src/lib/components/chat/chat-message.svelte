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
	import AgentStep from './agent-step.svelte';

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
		| { kind: 'step'; index: number; step: AgentStepData };

	const parts = $derived.by(() => {
		const recovered = recoveredStepKeys(stepsOf(message));
		const result: RenderPart[] = [];
		message.parts.forEach((part, index) => {
			if (part.type === 'text') {
				if (part.text) result.push({ kind: 'text', index, text: part.text });
				return;
			}
			const step = toAgentStep(part as Parameters<typeof toAgentStep>[0]);
			if (step && !recovered.has(step.key)) result.push({ kind: 'step', index, step });
		});
		return result;
	});
	const model = $derived(message.role === 'assistant' ? (message.metadata?.model ?? null) : null);
</script>

<Message from={message.role} class="gap-2">
	{#each parts as part (part.index)}
		{#if part.kind === 'text'}
			<MessageContent>
				{#if message.role === 'assistant'}
					<MessageResponse content={part.text} />
				{:else}
					<p class="whitespace-pre-wrap">{part.text}</p>
				{/if}
			</MessageContent>
		{:else}
			<AgentStep
				step={part.step}
				canUndo={part.step.revisionId !== null &&
					part.step.revisionId === undoableRevisionId &&
					!streaming}
				{undoing}
				{onundo}
				{onupdate}
			/>
		{/if}
	{/each}
	{#if model && !streaming}
		<p class="text-caption text-muted-foreground">{model}</p>
	{/if}
</Message>
