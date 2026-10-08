<script lang="ts">
	import { createDisclosureMode } from '#lib/disclosure.svelte.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '#lib/components/ui/collapsible/index.js';
	import { formatDate } from '#lib/format.js';

	interface Props {
		day: number;
		title: string;
		learn: string;
		practice: string;
		review: string;
		minutes: number;
		date: string | null;
		completed: boolean;
		isToday?: boolean;
		changed?: boolean;
		ontoggle: (day: number, completed: boolean) => void;
	}

	let {
		day,
		title,
		learn,
		practice,
		review,
		minutes,
		date,
		completed,
		isToday = false,
		changed = false,
		ontoggle
	}: Props = $props();

	let open = $state(false);
	const mode = createDisclosureMode();
	let touched = $state(false);

	const dateLabel = $derived(date ? formatDate(date) : null);

	const tasks = $derived([
		{ label: 'Learn', text: learn },
		{ label: 'Practice', text: practice },
		{ label: 'Review', text: review }
	]);
</script>

<li
	class="flex flex-col rounded-md transition-[background-color] duration-1000 ease-(--ease-out) {changed
		? 'bg-accent'
		: isToday
			? 'bg-accent/50'
			: ''}"
	data-today={isToday ? '' : undefined}
>
	<Collapsible bind:open>
		<div class="flex min-h-11 items-start gap-1">
			<div class="flex size-11 shrink-0 items-center justify-center">
				<Checkbox
					checked={completed}
					data-animate={touched ? '' : undefined}
					aria-label="Day {day} done: {title}"
					class="size-5"
					onCheckedChange={(value) => {
						touched = true;
						ontoggle(day, value);
					}}
				/>
			</div>
			<CollapsibleTrigger
				class="group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md py-2 pr-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
				onkeydown={mode.onkeydown}
				onpointerdown={mode.onpointerdown}
			>
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="truncate text-sm font-medium {completed ? 'text-muted-foreground' : ''}">
						Day {day} · {title}
					</span>
					<span class="flex flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground">
						{#if isToday}
							<span class="font-semibold text-highlight">Today</span>
							<span aria-hidden="true">·</span>
						{/if}
						{#if dateLabel}
							<span>{dateLabel}</span>
							<span aria-hidden="true">·</span>
						{/if}
						<span><span class="tabular-nums">{minutes}</span> min</span>
					</span>
				</span>
				<ChevronDownIcon
					class="size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-fast) ease-(--ease-out) group-data-[state=open]:rotate-180"
					aria-hidden="true"
				/>
			</CollapsibleTrigger>
		</div>
		<CollapsibleContent data-instant={mode.instant ? '' : undefined}>
			<dl class="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-3 py-2 pr-2 pl-12 text-sm">
				{#each tasks as task (task.label)}
					<dt class="font-medium text-accent-foreground">{task.label}</dt>
					<dd class="whitespace-pre-line text-foreground/85">{task.text}</dd>
				{/each}
			</dl>
		</CollapsibleContent>
	</Collapsible>
</li>
