<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import UndoIcon from '@lucide/svelte/icons/undo-2';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { summarizeSteps, type AgentStep } from '#lib/chat-types.js';

	interface Props {
		steps: AgentStep[];
		live?: boolean;
		undoableRevisionId?: string | null;
		undoing?: boolean;
		onundo?: (revisionId: string) => void;
		onupdate?: (blocks: number[]) => void;
	}

	const LIVE_ROWS = 3;

	let {
		steps,
		live = false,
		undoableRevisionId = null,
		undoing = false,
		onundo,
		onupdate
	}: Props = $props();

	let open = $state(false);

	const hidden = $derived(live ? Math.max(0, steps.length - LIVE_ROWS) : 0);
	const rows = $derived(steps.slice(hidden));
	const failed = $derived(steps.some((step) => step.state === 'failed'));
	const foldable = $derived(steps.length > 1 || steps[0]?.detail != null);
	const expanded = $derived(live || open || !foldable);
	const edits = $derived(
		steps.filter(
			(step) =>
				step.state === 'done' &&
				step.revisionId !== null &&
				!live &&
				(step.revisionId === undoableRevisionId || step.staleBlocks.length > 0)
		)
	);

	const staleText = (blocks: number[]) =>
		blocks.length === 1
			? `Block ${blocks[0]} may be out of date.`
			: `Blocks ${blocks[0]}–${blocks[blocks.length - 1]} may be out of date.`;
	const updateText = (blocks: number[]) =>
		blocks.length === 1
			? `Update block ${blocks[0]}`
			: `Update blocks ${blocks[0]}–${blocks[blocks.length - 1]}`;
</script>

<div class="flex flex-col gap-2" role="status" aria-live="polite">
	{#if !live && foldable}
		<button
			type="button"
			class="relative -ml-1 flex min-h-9 max-w-full items-center gap-1.5 self-start rounded-md px-1 py-0.5 text-caption text-muted-foreground transition-[color,transform] duration-150 after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<ChevronRightIcon
				class="size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none {open
					? 'rotate-90'
					: ''}"
				aria-hidden="true"
			/>
			{#if failed}
				<TriangleAlertIcon class="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
			{:else}
				<ListChecksIcon class="size-3.5 shrink-0" aria-hidden="true" />
			{/if}
			<span class="min-w-0 truncate">{summarizeSteps(steps)}</span>
		</button>
	{/if}

	<div
		class="grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none {expanded
			? 'grid-rows-[1fr]'
			: 'grid-rows-[0fr]'}"
		inert={!expanded}
	>
		<div class="overflow-hidden">
			<ul class="flex flex-col gap-2 {live ? '' : 'pt-1 pb-0.5'}">
				{#if hidden > 0}
					<li class="text-caption text-muted-foreground">+{hidden} earlier steps</li>
				{/if}
				{#each rows as step (step.key)}
					<li class="flex min-h-5 items-start gap-2.5 text-sm">
						<span class="flex h-5 shrink-0 items-center">
							{#if step.state === 'running'}
								<Spinner class="size-4 text-primary" aria-hidden="true" />
							{:else if step.state === 'failed'}
								<TriangleAlertIcon class="size-4 text-destructive" aria-hidden="true" />
							{:else}
								<CheckIcon class="size-4 text-muted-foreground" aria-hidden="true" />
							{/if}
						</span>
						<span class="min-w-0 flex-1 text-muted-foreground">
							{step.label}{step.state === 'running' ? '…' : ''}
							{#if step.detail}
								<span class="block text-caption">{step.detail}</span>
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>

	{#each edits as step (step.key)}
		{@const canUndo = step.revisionId === undoableRevisionId && !!onundo}
		<div class="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
			{#if canUndo}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="relative -my-1 -ml-1.5 h-9 shrink-0 gap-1.5 px-3 after:absolute after:-inset-1 after:content-['']"
					disabled={undoing}
					onclick={() => onundo?.(step.revisionId!)}
				>
					{#if undoing}<Spinner class="size-3.5" />{:else}<UndoIcon
							class="size-3.5"
							aria-hidden="true"
						/>{/if}
					Undo
				</Button>
			{/if}
			{#if step.staleBlocks.length > 0}
				<p class="min-w-0 flex-1 text-caption text-muted-foreground">
					{staleText(step.staleBlocks)}
				</p>
				{#if onupdate}
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="h-9 shrink-0 px-3"
						onclick={() => onupdate(step.staleBlocks.slice(0, 3))}
					>
						{updateText(step.staleBlocks.slice(0, 3))}
					</Button>
				{/if}
			{/if}
		</div>
	{/each}
</div>
