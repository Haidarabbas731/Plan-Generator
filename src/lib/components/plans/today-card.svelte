<script lang="ts">
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import PenLineIcon from '@lucide/svelte/icons/pen-line';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { formatDate } from '#lib/format.js';
	import type { PlanDayView } from '#lib/plan-types.js';
	import type { TodayState } from '#lib/schedule.js';

	interface Props {
		today: TodayState | null;
		day: PlanDayView | null;
		allDone: boolean;
		celebrate?: boolean;
		ontoggle: (day: number, completed: boolean) => void;
	}

	let { today, day, allDone, celebrate = false, ontoggle }: Props = $props();

	let touched = $state(false);

	const tasks = $derived(
		day
			? [
					{ label: 'Learn', text: day.learn, icon: BookOpenIcon },
					{ label: 'Practice', text: day.practice, icon: PenLineIcon },
					{ label: 'Review', text: day.review, icon: RotateCcwIcon }
				]
			: []
	);
</script>

<section
	aria-label="Today"
	class="flex flex-col gap-4 rounded-xl border border-highlight/30 bg-accent p-5 shadow-sm"
>
	{#if today === null}
		<div class="flex flex-col gap-1.5" aria-hidden="true">
			<div class="flex items-center justify-between gap-4">
				<Skeleton class="h-3.5 w-12" />
				<Skeleton class="h-11 w-28 shrink-0 rounded-lg" />
			</div>
			<Skeleton class="h-6 w-56 max-w-full" />
			<Skeleton class="h-3.5 w-16" />
		</div>
		<div class="flex flex-col gap-3" aria-hidden="true">
			{#each [0, 1, 2] as row (row)}
				<div class="flex items-start gap-3">
					<Skeleton class="size-8 shrink-0 rounded-lg" />
					<div class="flex min-h-10 flex-1 flex-col gap-1.5">
						<Skeleton class="h-4 w-14" />
						<Skeleton class="h-4 w-full" />
					</div>
				</div>
			{/each}
		</div>
	{:else if today.kind === 'session'}
		{#if day}
			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-between gap-4">
					<p class="text-caption font-semibold text-highlight">Today</p>
					<label
						class="-my-1.5 -mr-2 flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium text-accent-foreground select-none"
					>
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
						{day.completed ? 'Done' : 'Mark done'}
					</label>
				</div>
				<h2 class="text-xl font-semibold tracking-tight text-accent-foreground">
					Day {day.day} · {day.title}
				</h2>
				<p class="text-caption text-muted-foreground">
					<span class="tabular-nums">{day.minutes}</span> min
				</p>
			</div>
			<dl class="flex flex-col gap-3 text-sm">
				{#each tasks as task (task.label)}
					<div class="flex items-start gap-3">
						<span
							class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/60 text-accent-foreground"
						>
							<task.icon class="size-4" aria-hidden="true" />
						</span>
						<div class="min-w-0 pt-0.5">
							<dt class="font-medium text-accent-foreground">{task.label}</dt>
							<dd class="whitespace-pre-line text-foreground/85">{task.text}</dd>
						</div>
					</div>
				{/each}
			</dl>
			{#if allDone}
				<p
					class="flex items-center gap-2 border-t border-border/60 pt-4 text-sm font-medium text-success"
				>
					<CircleCheckIcon
						class="size-5 shrink-0 {celebrate ? 'complete-pop' : ''}"
						aria-hidden="true"
					/>
					You finished every day. Well done.
				</p>
			{/if}
		{:else}
			<p class="text-caption font-semibold text-highlight">Today</p>
			<h2 class="text-xl font-semibold tracking-tight text-accent-foreground">Day {today.day}</h2>
			<p class="text-sm text-muted-foreground">This day is still being written.</p>
		{/if}
	{:else if today.kind === 'rest'}
		<div class="flex items-start gap-3">
			<MoonIcon class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<div class="flex flex-col gap-0.5">
				<p class="text-caption font-semibold text-highlight">Today</p>
				<h2 class="text-xl font-semibold tracking-tight text-accent-foreground">Rest day</h2>
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
				<h2 class="text-xl font-semibold tracking-tight text-accent-foreground">
					Starts {formatDate(today.startsOn, 'long')}
				</h2>
				<p class="text-sm text-muted-foreground">Day {today.firstDay} is your first session.</p>
			</div>
		</div>
	{:else}
		<div class="flex items-start gap-3">
			<CircleCheckIcon
				class="mt-0.5 size-5 shrink-0 text-success {celebrate ? 'complete-pop' : ''}"
				aria-hidden="true"
			/>
			<div class="flex flex-col gap-0.5">
				<p class="text-caption font-semibold text-highlight">Plan period over</p>
				<h2 class="text-xl font-semibold tracking-tight text-accent-foreground">
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
