<script lang="ts">
	import { createDisclosureMode } from '#lib/disclosure.svelte.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import FlagIcon from '@lucide/svelte/icons/flag';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '#lib/components/ui/collapsible/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { PlanBlockView, PlanDayView } from '#lib/plan-types.js';
	import DayRow from './day-row.svelte';

	interface Props {
		block: PlanBlockView;
		days: PlanDayView[];
		dates: string[];
		todayDay?: number | null;
		open?: boolean;
		retrying?: boolean;
		ontoggle: (day: number, completed: boolean) => void;
		onretry: () => void;
	}

	let {
		block,
		days,
		dates,
		todayDay = null,
		open = $bindable(false),
		retrying = false,
		ontoggle,
		onretry
	}: Props = $props();

	const mode = createDisclosureMode();

	const span = $derived(block.endDay - block.startDay + 1);
	const done = $derived(days.filter((day) => day.completed).length);
	const isWritten = $derived(block.status === 'ready' || block.status === 'stale');
	const skeletonKeys = $derived(Array.from({ length: Math.min(span, 5) }, (_, i) => i));
	const dayRange = $derived(
		block.startDay === block.endDay
			? `Day ${block.startDay}`
			: `Days ${block.startDay}–${block.endDay}`
	);
</script>

<section aria-label="Block {block.idx + 1}: {block.theme}" class="rounded-lg border bg-card">
	<Collapsible bind:open>
		<CollapsibleTrigger
			class="group flex min-h-16 w-full items-center gap-3 rounded-lg p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
			onkeydown={mode.onkeydown}
			onpointerdown={mode.onpointerdown}
		>
			<span class="flex min-w-0 flex-1 flex-col gap-0.5">
				<span class="text-caption text-muted-foreground">Block {block.idx + 1}</span>
				<span class="text-heading">{block.theme}</span>
				<span class="text-caption text-muted-foreground">
					{dayRange}
					{#if isWritten}
						· <span class="tabular-nums">{done} of {days.length}</span> done
					{/if}
				</span>
			</span>
			{#if block.status === 'writing'}
				<Badge variant="outline" class="gap-1.5">
					<Spinner class="size-3" aria-label="Writing this block" />
					Writing
				</Badge>
			{:else if block.status === 'pending'}
				<Badge variant="outline">Waiting</Badge>
			{:else if block.status === 'failed'}
				<Badge variant="destructive">Needs attention</Badge>
			{:else if block.status === 'stale'}
				<Badge variant="secondary">May be out of date</Badge>
			{/if}
			<ChevronDownIcon
				class="size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-fast) ease-(--ease-out) group-data-[state=open]:rotate-180"
				aria-hidden="true"
			/>
		</CollapsibleTrigger>

		<CollapsibleContent data-instant={mode.instant ? '' : undefined}>
			<div class="flex flex-col gap-4 px-4 pt-1 pb-4">
				<p class="text-sm text-muted-foreground">{block.objective}</p>

				{#if isWritten}
					<ul class="flex flex-col">
						{#each days as day (day.day)}
							<DayRow
								day={day.day}
								title={day.title}
								learn={day.learn}
								practice={day.practice}
								review={day.review}
								minutes={day.minutes}
								completed={day.completed}
								date={dates[day.day - 1] ?? null}
								isToday={day.day === todayDay}
								{ontoggle}
							/>
						{/each}
					</ul>
				{:else if block.status === 'failed'}
					<div
						role="alert"
						class="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
					>
						<p class="flex items-start gap-2.5">
							<TriangleAlertIcon
								class="mt-0.5 size-4 shrink-0 text-destructive"
								aria-hidden="true"
							/>
							<span>{block.error ?? 'This block could not be written.'}</span>
						</p>
						<div>
							<Button type="button" variant="outline" disabled={retrying} onclick={onretry}>
								{#if retrying}<Spinner data-icon="inline-start" />{/if}
								Try again
							</Button>
						</div>
					</div>
				{:else}
					<div class="flex flex-col gap-3" aria-hidden="true">
						{#each skeletonKeys as key (key)}
							<div class="flex items-center gap-3">
								<Skeleton class="size-5 rounded-[5px]" />
								<Skeleton class="h-4 flex-1" />
							</div>
						{/each}
					</div>
					<p class="text-caption text-muted-foreground">
						{block.status === 'writing'
							? 'Writing this block now.'
							: 'Waiting for the blocks before it.'}
					</p>
				{/if}

				{#if isWritten}
					<div
						class="flex items-start gap-3 rounded-lg border border-highlight/30 bg-highlight/5 p-4 text-sm"
					>
						<FlagIcon class="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden="true" />
						<div class="flex flex-col gap-1">
							<p class="font-medium">Day {block.endDay} milestone · {block.milestone.title}</p>
							<p class="text-foreground/85">{block.milestone.description}</p>
							<p class="text-muted-foreground">
								You are done when: {block.milestone.successCriteria}
							</p>
						</div>
					</div>
				{/if}
			</div>
		</CollapsibleContent>
	</Collapsible>
</section>
