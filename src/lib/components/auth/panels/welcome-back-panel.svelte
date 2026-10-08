<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import { MediaQuery } from 'svelte/reactivity';
	import { runTimeline } from '#lib/client/timeline.js';
	import ReplayButton from '#lib/components/shared/replay-button.svelte';

	const reduced = new MediaQuery('(prefers-reduced-motion: reduce)');

	const tasks = [
		{ label: 'Learn', text: 'Why a struct that holds a reference needs a lifetime.' },
		{ label: 'Practice', text: "Write a Parser<'a> that borrows a &str." },
		{ label: 'Review', text: 'Redo the Day 6 move exercise without clone().' }
	];

	let run = $state(0);
	let cardIn = $state(true);
	let learnDone = $state(true);
	let streak = $state(5);
	let finished = $state(true);

	$effect(() => {
		void run;
		if (reduced.current) {
			cardIn = true;
			learnDone = true;
			streak = 5;
			finished = true;
			return;
		}
		cardIn = false;
		learnDone = false;
		streak = 4;
		finished = false;
		return runTimeline([
			{ at: 250, run: () => (cardIn = true) },
			{ at: 1000, run: () => (learnDone = true) },
			{ at: 1400, run: () => (streak = 5) },
			{ at: 1900, run: () => (finished = true) }
		]);
	});
</script>

<div class="flex flex-col gap-3">
	<h2 class="text-display">Welcome back.</h2>
	<p class="text-body text-muted-foreground">Pick up where your plan left off.</p>
</div>

<div class="flex flex-col gap-2">
	<p class="sr-only">
		Example: today is Day 8, Lifetimes in structs, with a Learn, a Practice and a Review task, and a
		streak of five days in a row.
	</p>

	<div
		aria-hidden="true"
		class="rounded-xl p-5 surface-raised transition-[opacity,transform] duration-(--dur-sheet) ease-(--ease-out) {cardIn
			? 'translate-y-0 opacity-100'
			: 'translate-y-2 opacity-0'}"
	>
		<p class="text-caption font-semibold text-highlight">Today</p>
		<p class="text-lg font-semibold tracking-tight">Day 8 · Lifetimes in structs</p>
		<dl class="mt-4 flex flex-col gap-3 text-sm">
			{#each tasks as task, i (task.label)}
				<div class="flex items-start gap-3">
					<span
						class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-(--dur-fast) ease-(--ease-out) {i ===
							0 && learnDone
							? 'border-success bg-success/15 text-success'
							: 'border-border text-transparent'}"
					>
						<CheckIcon class="size-3" />
					</span>
					<div>
						<dt class="font-medium">{task.label}</dt>
						<dd class="text-muted-foreground">{task.text}</dd>
					</div>
				</div>
			{/each}
		</dl>
		<p class="mt-5 flex items-center gap-2 border-t pt-4 text-sm font-medium text-highlight">
			<FlameIcon class="size-4" />
			<span>
				{#key streak}<span class="inline-block reveal tabular-nums">{streak}</span>{/key}
				days in a row
			</span>
		</p>
	</div>

	{#if !reduced.current}
		<ReplayButton visible={finished} onclick={() => run++} />
	{/if}
</div>
