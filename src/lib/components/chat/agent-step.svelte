<script lang="ts">
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import UndoIcon from '@lucide/svelte/icons/undo-2';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { AgentStep } from '#lib/chat-types.js';

	interface Props {
		step: AgentStep;
		canUndo?: boolean;
		undoing?: boolean;
		onundo?: (revisionId: string) => void;
		onupdate?: (blocks: number[]) => void;
	}

	let { step, canUndo = false, undoing = false, onundo, onupdate }: Props = $props();

	const nextBlocks = $derived(step.staleBlocks.slice(0, 3));
	const staleText = $derived(
		step.staleBlocks.length === 1
			? `Block ${step.staleBlocks[0]} may be out of date.`
			: `Blocks ${step.staleBlocks[0]}–${step.staleBlocks[step.staleBlocks.length - 1]} may be out of date.`
	);
</script>

<div class="flex flex-col rounded-xl bg-muted/50 px-3 py-2.5 text-sm" role="status">
	<div class="flex items-center gap-2.5">
		{#if step.state === 'running'}
			<Spinner class="size-4 shrink-0 text-primary" aria-label={step.label} />
		{:else if step.state === 'done'}
			<CircleCheckIcon class="size-4 shrink-0 text-success" aria-hidden="true" />
		{:else}
			<TriangleAlertIcon class="size-4 shrink-0 text-destructive" aria-hidden="true" />
		{/if}
		<span
			class="min-w-0 flex-1 {step.state === 'running' ? 'text-muted-foreground' : 'font-medium'}"
		>
			{step.label}{step.state === 'running' ? '…' : ''}
		</span>
		{#if step.state === 'done' && step.revisionId && canUndo && onundo}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="relative -my-1 -mr-1.5 h-9 shrink-0 gap-1.5 px-3 after:absolute after:-inset-1 after:content-['']"
				disabled={undoing}
				onclick={() => onundo(step.revisionId!)}
			>
				{#if undoing}<Spinner class="size-3.5" />{:else}<UndoIcon
						class="size-3.5"
						aria-hidden="true"
					/>{/if}
				Undo
			</Button>
		{/if}
	</div>
	{#if step.detail}
		<p class="pt-1 pl-6.5 text-caption text-muted-foreground">{step.detail}</p>
	{/if}
	{#if step.state === 'done' && step.staleBlocks.length > 0}
		<div class="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5 pl-6.5">
			<p class="min-w-0 flex-1 text-caption text-muted-foreground">{staleText}</p>
			{#if onupdate}
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="h-9 shrink-0 px-3"
					onclick={() => onupdate(nextBlocks)}
				>
					Update {nextBlocks.length === 1
						? `block ${nextBlocks[0]}`
						: `blocks ${nextBlocks[0]}–${nextBlocks[nextBlocks.length - 1]}`}
				</Button>
			{/if}
		</div>
	{/if}
</div>
