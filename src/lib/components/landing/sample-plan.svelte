<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import FlagIcon from '@lucide/svelte/icons/flag';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';

	const finished = [
		{ day: 6, title: 'Move semantics in practice' },
		{ day: 7, title: 'References and borrowing' }
	];

	const today = {
		day: 8,
		title: 'Lifetimes in structs',
		tasks: [
			{
				label: 'Learn',
				text: 'Why a struct that holds a reference needs a lifetime parameter.'
			},
			{
				label: 'Practice',
				text: "Write a Parser<'a> that borrows a &str and returns tokens. Five tests pass."
			},
			{ label: 'Review', text: 'Redo the Day 6 move exercise without calling clone().' }
		]
	};
</script>

<Card.Root class="w-full max-w-md" aria-label="Example plan">
	<Card.Header class="reveal" style="--reveal-i: 0">
		<p class="text-caption text-muted-foreground">Example plan</p>
		<Card.Title class="font-serif text-xl font-medium tracking-tight">
			Learn Rust well enough to build a CLI
		</Card.Title>
		<Card.Description>30 days · 90 minutes a day</Card.Description>
	</Card.Header>

	<Card.Content class="flex flex-col gap-5">
		<div class="flex reveal flex-col gap-2" style="--reveal-i: 1">
			<div class="flex items-center justify-between text-caption">
				<span class="font-medium">Day 8 of 30</span>
				<span class="text-muted-foreground">Block 2 · Ownership and borrowing</span>
			</div>
			<Progress value={27} aria-label="Plan progress, 27 percent" />
		</div>

		<ul class="flex reveal flex-col gap-2" style="--reveal-i: 2">
			{#each finished as item (item.day)}
				<li class="flex items-center gap-2.5 text-sm text-muted-foreground">
					<span
						class="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
					>
						<CheckIcon class="size-3" aria-hidden="true" />
					</span>
					Day {item.day} · {item.title}
				</li>
			{/each}
		</ul>

		<section class="reveal rounded-lg bg-accent p-4" style="--reveal-i: 3">
			<h3 class="text-sm font-semibold text-accent-foreground">
				Today · Day {today.day} · {today.title}
			</h3>
			<dl class="mt-3 grid grid-cols-[4.25rem_1fr] gap-x-3 gap-y-2.5 text-sm">
				{#each today.tasks as task (task.label)}
					<dt class="font-medium text-accent-foreground">{task.label}</dt>
					<dd class="text-foreground/80">{task.text}</dd>
				{/each}
			</dl>
		</section>

		<p class="flex reveal items-start gap-2.5 text-sm" style="--reveal-i: 4">
			<FlagIcon class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
			<span>
				<span class="font-medium">Day 10 milestone.</span>
				<span class="text-muted-foreground">
					Build a word counter that reads a file without copying it.
				</span>
			</span>
		</p>
	</Card.Content>
</Card.Root>
