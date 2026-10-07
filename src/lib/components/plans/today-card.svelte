<script lang="ts">
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { formatDate } from '#lib/format.js';
	import type { PlanDayView } from '#lib/plan-types.js';
	import type { TodayState } from '#lib/schedule.js';

	interface Props {
		today: TodayState | null;
		day: PlanDayView | null;
		allDone: boolean;
		ontoggle: (day: number, completed: boolean) => void;
	}

	let { today, day, allDone, ontoggle }: Props = $props();

	let touched = $state(false);

	const tasks = $derived(
		day
			? [
					{ label: 'Learn', text: day.learn },
					{ label: 'Practice', text: day.practice },
					{ label: 'Review', text: day.review }
				]
			: []
	);
</script>

<section
	aria-label="Today"
	class="flex flex-col gap-3 rounded-lg border border-highlight/30 bg-accent p-4"
>
	{#if today === null}
		<Skeleton class="h-5 w-40" />
		<Skeleton class="h-4 w-full" />
		<Skeleton class="h-4 w-2/3" />
	{:else if today.kind === 'session'}
		{#if day}
			<div class="flex items-start gap-3">
				<div class="flex size-11 shrink-0 items-center justify-center">
					<Checkbox
						checked={day.completed}
						data-animate={touched ? '' : undefined}
						aria-label="Mark today done: Day {day.day}, {day.title}"
						class="size-6"
						onCheckedChange={(value) => {
							touched = true;
							ontoggle(day.day, value);
						}}
					/>
				</div>
				<div class="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
					<p class="text-caption font-semibold text-highlight">Today</p>
					<h2 class="text-heading text-accent-foreground">Day {day.day} · {day.title}</h2>
					<p class="text-caption text-muted-foreground">
						<span class="tabular-nums">{day.minutes}</span> min
						{#if day.completed}· Done{/if}
					</p>
				</div>
			</div>
			<dl class="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-3 text-sm sm:pl-14">
				{#each tasks as task (task.label)}
					<dt class="font-medium text-accent-foreground">{task.label}</dt>
					<dd class="whitespace-pre-line text-foreground/85">{task.text}</dd>
				{/each}
			</dl>
		{:else}
			<p class="text-caption font-semibold text-highlight">Today</p>
			<h2 class="text-heading text-accent-foreground">Day {today.day}</h2>
			<p class="text-sm text-muted-foreground">This day is still being written.</p>
		{/if}
	{:else if today.kind === 'rest'}
		<div class="flex items-start gap-3">
			<MoonIcon class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<div class="flex flex-col gap-0.5">
				<p class="text-caption font-semibold text-highlight">Today</p>
				<h2 class="text-heading text-accent-foreground">Rest day</h2>
				<p class="text-sm text-muted-foreground">
					Next session: {formatDate(today.nextDate, 'long')}, Day {today.nextDay}.
				</p>
			</div>
		</div>
	{:else if today.kind === 'before'}
		<div class="flex items-start gap-3">
			<CalendarClockIcon class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<div class="flex flex-col gap-0.5">
				<p class="text-caption font-semibold text-highlight">Not started</p>
				<h2 class="text-heading text-accent-foreground">
					Starts {formatDate(today.startsOn, 'long')}
				</h2>
				<p class="text-sm text-muted-foreground">Day {today.firstDay} is your first session.</p>
			</div>
		</div>
	{:else}
		<div class="flex items-start gap-3">
			<CircleCheckIcon class="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
			<div class="flex flex-col gap-0.5">
				<p class="text-caption font-semibold text-highlight">Plan period over</p>
				<h2 class="text-heading text-accent-foreground">
					{allDone ? 'You finished every day' : 'The last session has passed'}
				</h2>
				<p class="text-sm text-muted-foreground">
					{allDone
						? 'Well done. Your plan is complete.'
						: 'Days you skipped are still open below if you want to finish them.'}
				</p>
			</div>
		</div>
	{/if}
</section>
