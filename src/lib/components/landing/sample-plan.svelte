<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import FlagIcon from '@lucide/svelte/icons/flag';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';

	const TOTAL_DAYS = 30;
	const START_DONE = 7;

	const titles: Record<number, string> = {
		6: 'Move semantics in practice',
		7: 'References and borrowing',
		8: 'Lifetimes in structs'
	};

	const tasks = [
		{
			label: 'Learn',
			text: 'Why a struct that holds a reference needs a lifetime parameter.'
		},
		{
			label: 'Practice',
			text: "Write a Parser<'a> that borrows a &str and returns tokens. Five tests pass."
		},
		{ label: 'Review', text: 'Redo the Day 6 move exercise without calling clone().' }
	];

	let ticked = $state(false);
	let touched = $state(false);

	const done = $derived(START_DONE + (ticked ? 1 : 0));
	const percent = $derived(Math.round((done / TOTAL_DAYS) * 100));
	const finished = $derived(ticked ? [7, 8] : [6, 7]);
</script>

<Card.Root class="w-full max-w-md" aria-label="Example plan">
	<Card.Header>
		<p class="text-caption text-muted-foreground">Example plan</p>
		<Card.Title class="text-xl font-bold tracking-tight">
			Learn Rust well enough to build a CLI
		</Card.Title>
		<Card.Description>30 days · 90 minutes a day</Card.Description>
	</Card.Header>

	<Card.Content class="flex flex-col gap-5">
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between text-caption">
				<span class="font-medium tabular-nums">{done} of {TOTAL_DAYS} days done</span>
				<span class="text-muted-foreground">Block 2 · Ownership and borrowing</span>
			</div>
			<Progress value={percent} aria-label="Plan progress, {percent} percent" />
		</div>

		<ul class="flex flex-col gap-2">
			{#each finished as day (day)}
				<li class="flex items-center gap-2.5 text-sm text-muted-foreground">
					<span
						class="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
					>
						<CheckIcon class="size-3" aria-hidden="true" />
					</span>
					Day {day} · {titles[day]}
				</li>
			{/each}
		</ul>

		<section class="rounded-lg bg-accent p-4">
			<div class="flex items-start justify-between gap-3">
				<p class="text-sm font-semibold text-accent-foreground">Today · Day 8 · {titles[8]}</p>
				<label
					class="-my-2 -mr-2 flex min-h-11 shrink-0 cursor-pointer items-center gap-2 pr-2 pl-2 text-caption font-medium text-accent-foreground select-none"
				>
					<Checkbox
						checked={ticked}
						data-animate={touched ? '' : undefined}
						aria-label="Mark Day 8 done in the example"
						onCheckedChange={(value) => {
							touched = true;
							ticked = value;
						}}
					/>
					{ticked ? 'Done' : 'Mark done'}
				</label>
			</div>
			<dl class="mt-3 grid grid-cols-[4.25rem_1fr] gap-x-3 gap-y-2.5 text-sm">
				{#each tasks as task (task.label)}
					<dt class="font-medium text-accent-foreground">{task.label}</dt>
					<dd class="text-foreground/80">{task.text}</dd>
				{/each}
			</dl>
		</section>

		<p class="flex items-start gap-2.5 text-sm">
			<FlagIcon class="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden="true" />
			<span>
				<span class="font-medium">Day 10 milestone.</span>
				<span class="text-muted-foreground">
					Build a word counter that reads a file without copying it.
				</span>
			</span>
		</p>

		<div class={ticked ? undefined : 'invisible'} inert={!ticked}>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				class="-ml-2 h-11 gap-1.5 px-2 text-muted-foreground"
				onclick={() => {
					ticked = false;
					touched = false;
				}}
			>
				<RotateCcwIcon aria-hidden="true" />
				Reset example
			</Button>
		</div>
	</Card.Content>
</Card.Root>
