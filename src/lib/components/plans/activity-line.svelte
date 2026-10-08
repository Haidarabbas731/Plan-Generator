<script lang="ts">
	import { createDisclosureMode } from '#lib/disclosure.svelte.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CircleIcon from '@lucide/svelte/icons/circle';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '#lib/components/ui/collapsible/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { BlockStatus, PlanStatus } from '#lib/plan-types.js';

	interface TimelineBlock {
		idx: number;
		theme: string;
		status: BlockStatus;
		error: string | null;
	}

	interface Props {
		status: PlanStatus;
		error: string | null;
		label: string;
		blocks: TimelineBlock[];
		busy?: boolean;
		onresume: () => void;
		onpause: () => void;
	}

	let { status, error, label, blocks, busy = false, onresume, onpause }: Props = $props();

	let open = $state(false);
	const mode = createDisclosureMode();

	const outlineDone = $derived(blocks.length > 0);
</script>

<section aria-label="Plan generation" class="rounded-lg border bg-card">
	<div class="flex flex-wrap items-center gap-3 p-4">
		<div class="flex min-w-0 flex-1 items-center gap-3">
			{#if status === 'generating'}
				<Spinner class="size-4 shrink-0 text-primary" aria-label="Writing your plan" />
			{:else if status === 'paused'}
				<PauseIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			{:else}
				<TriangleAlertIcon class="size-4 shrink-0 text-destructive" aria-hidden="true" />
			{/if}
			<div class="flex min-w-0 flex-col">
				<p class="text-sm font-medium" aria-live="polite">{label}</p>
				{#if status === 'failed' && error}
					<p class="{open ? '' : 'line-clamp-4'} text-caption text-destructive">{error}</p>
				{:else if status === 'paused'}
					<p class="text-caption text-muted-foreground">
						Finished blocks are saved. Resume to continue where it stopped.
					</p>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if status === 'generating'}
				<Button type="button" variant="outline" disabled={busy} onclick={onpause}>
					{#if busy}<Spinner data-icon="inline-start" />{:else}<PauseIcon aria-hidden="true" />{/if}
					Pause
				</Button>
			{:else}
				<Button type="button" disabled={busy} onclick={onresume}>
					{#if busy}<Spinner data-icon="inline-start" />{:else}<PlayIcon aria-hidden="true" />{/if}
					{status === 'failed' ? 'Try again' : 'Resume'}
				</Button>
			{/if}
		</div>
	</div>

	<Collapsible bind:open>
		<CollapsibleTrigger
			class="group flex min-h-11 w-full items-center justify-between gap-2 border-t px-4 text-left text-caption font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
			onkeydown={mode.onkeydown}
			onpointerdown={mode.onpointerdown}
		>
			{open ? 'Hide details' : 'Show details'}
			<ChevronDownIcon
				class="size-4 transition-transform duration-(--dur-fast) ease-(--ease-out) group-data-[state=open]:rotate-180"
				aria-hidden="true"
			/>
		</CollapsibleTrigger>
		<CollapsibleContent data-instant={mode.instant ? '' : undefined}>
			<ol class="flex max-h-72 flex-col gap-1 overflow-y-auto border-t p-3 text-sm">
				<li class="flex min-h-9 items-center gap-2.5 px-1">
					{#if outlineDone}
						<CircleCheckIcon class="size-4 shrink-0 text-success" aria-hidden="true" />
					{:else if status === 'generating'}
						<Spinner class="size-4 shrink-0" aria-label="Planning" />
					{:else}
						<CircleIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					{/if}
					<span>Outline</span>
				</li>
				{#each blocks as block (block.idx)}
					<li class="flex min-h-9 flex-col justify-center gap-0.5 px-1">
						<div class="flex items-center gap-2.5">
							{#if block.status === 'ready' || block.status === 'stale'}
								<CircleCheckIcon class="size-4 shrink-0 text-success" aria-hidden="true" />
							{:else if block.status === 'writing'}
								<Spinner class="size-4 shrink-0" aria-label="Writing" />
							{:else if block.status === 'failed'}
								<TriangleAlertIcon class="size-4 shrink-0 text-destructive" aria-hidden="true" />
							{:else}
								<CircleIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
							{/if}
							<span class={block.status === 'pending' ? 'text-muted-foreground' : ''}>
								Block {block.idx + 1} · {block.theme}
							</span>
						</div>
						{#if block.status === 'failed' && block.error}
							<p class="pl-6.5 text-caption text-destructive">
								{block.error}
							</p>
						{/if}
					</li>
				{/each}
			</ol>
		</CollapsibleContent>
	</Collapsible>
</section>
