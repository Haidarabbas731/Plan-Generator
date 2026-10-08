<script lang="ts">
	import { createDisclosureMode } from '#lib/disclosure.svelte.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
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
	const isCurrent = $derived(
		todayDay !== null && todayDay >= block.startDay && todayDay <= block.endDay
	);
	const complete = $derived(isWritten && days.length > 0 && done === days.length);
	const ratio = $derived(days.length === 0 ? 0 : done / days.length);
	const skeletonKeys = $derived(Array.from({ length: Math.min(span, 5) }, (_, i) => i));
	const dayRange = $derived(
		block.startDay === block.endDay
			? `Day ${block.startDay}`
			: `Days ${block.startDay}–${block.endDay}`
	);
</script>

<section
	aria-label="Block {block.idx + 1}: {block.theme}"
	class="relative rounded-lg surface-flat {isCurrent
		? 'before:absolute before:inset-y-4 before:left-0 before:w-0.5 before:rounded-full before:bg-primary'
		: ''}"
>
	<Collapsible bind:open>
		<CollapsibleTrigger
			class="group flex min-h-16 w-full items-center gap-3 rounded-lg p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
			onkeydown={mode.onkeydown}
			onpointerdown={mode.onpointerdown}
		>
			<span class="flex min-w-0 flex-1 flex-col gap-0.5">
				<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
					<span>Block {block.idx + 1}</span>
					{#if isCurrent}
						<span aria-hidden="true">·</span>
						<span class="font-medium text-primary">Current block</span>
					{/if}
				</span>
				<span
					class="flex items-center gap-2 text-heading {complete ? 'text-muted-foreground' : ''}"
				>
					{block.theme}
					{#if complete}
						<CircleCheckIcon class="size-4 shrink-0 text-success" aria-label="All days done" />
					{/if}
				</span>
				<span class="text-caption text-muted-foreground">{dayRange}</span>
				{#if block.status === 'writing'}
					<Badge variant="outline" class="mt-1.5 gap-1.5 self-start">
						<Spinner class="size-3" aria-label="Writing this block" />
						Writing
					</Badge>
				{:else if block.status === 'pending'}
					<Badge variant="outline" class="mt-1.5 self-start">Waiting</Badge>
				{:else if block.status === 'failed'}
					<Badge variant="destructive" class="mt-1.5 self-start">Needs attention</Badge>
				{:else if block.status === 'stale'}
					<Badge variant="secondary" class="mt-1.5 self-start">May be out of date</Badge>
				{/if}
				{#if isWritten && days.length > 0}
					<span
						class="mt-2 block h-1 w-full overflow-hidden rounded-full bg-muted"
						aria-hidden="true"
					>
						<span
							class="block h-full w-full origin-left bg-primary transition-transform duration-(--dur-sheet) ease-(--ease-out)"
							style:transform="scaleX({ratio})"
						></span>
					</span>
				{/if}
			</span>
			{#if isWritten}
				<span class="text-caption text-muted-foreground tabular-nums">{done} of {days.length}</span>
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
					<ul class="flex flex-col divide-y divide-border">
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
