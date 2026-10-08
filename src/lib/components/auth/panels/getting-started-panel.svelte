<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import { MediaQuery } from 'svelte/reactivity';
	import { runTimeline, type TimelineStep } from '#lib/client/timeline.js';
	import ReplayButton from '#lib/components/shared/replay-button.svelte';
	import { Spinner } from '#lib/components/ui/spinner/index.js';

	const GOAL = 'Learn Rust well enough to build a CLI';
	const reduced = new MediaQuery('(prefers-reduced-motion: reduce)');

	let run = $state(0);
	let step = $state(3);
	let typed = $state(GOAL.length);
	let blocksReady = $state(2);
	let dayDone = $state(true);
	let finished = $state(true);

	const nodes = $derived([
		{ title: 'Describe your goal', done: step >= 2, active: step === 1 },
		{ title: 'The plan is written block by block', done: step >= 3, active: step === 2 },
		{ title: 'Follow it and adjust', done: finished, active: step === 3 }
	]);

	$effect(() => {
		void run;
		if (reduced.current) {
			step = 3;
			typed = GOAL.length;
			blocksReady = 2;
			dayDone = true;
			finished = true;
			return;
		}
		step = 0;
		typed = 0;
		blocksReady = 0;
		dayDone = false;
		finished = false;

		const steps: TimelineStep[] = [{ at: 300, run: () => (step = 1) }];
		let elapsed = 500;
		for (let i = 1; i <= GOAL.length; i++) {
			elapsed += i % 6 === 0 ? 55 : 28;
			const count = i;
			steps.push({ at: elapsed, run: () => (typed = count) });
		}
		steps.push(
			{ at: elapsed + 400, run: () => (step = 2) },
			{ at: elapsed + 900, run: () => (blocksReady = 1) },
			{ at: elapsed + 1800, run: () => (blocksReady = 2) },
			{ at: elapsed + 2200, run: () => (step = 3) },
			{ at: elapsed + 2700, run: () => (dayDone = true) },
			{ at: elapsed + 3200, run: () => (finished = true) }
		);
		return runTimeline(steps);
	});
</script>

<div class="flex flex-col gap-3">
	<h2 class="text-display">From a goal to a plan for every day.</h2>
	<p class="text-body text-muted-foreground">
		Say what you want to learn, read the plan as it is written, then follow it.
	</p>
</div>

<div class="flex flex-col gap-2">
	<p class="sr-only">
		Example: the goal "Learn Rust well enough to build a CLI" is typed, the plan is written block by
		block, and Day 1 is ticked off.
	</p>

	<ol aria-hidden="true">
		{#each nodes as node, index (node.title)}
			<li class="flex gap-4">
				<div class="flex flex-col items-center">
					<span
						class="flex size-8 shrink-0 items-center justify-center rounded-full border text-caption font-semibold transition-[background-color,border-color,color] duration-(--dur-base) ease-(--ease-out) {node.done
							? 'border-primary bg-primary text-primary-foreground'
							: node.active
								? 'border-primary text-primary'
								: 'border-border text-muted-foreground'}"
					>
						{#if node.done}
							<CheckIcon class="size-4" />
						{:else}
							{index + 1}
						{/if}
					</span>
					{#if index < nodes.length - 1}
						<span class="my-1 w-px flex-1 bg-border">
							<span
								class="block h-full w-full origin-top bg-primary transition-transform duration-500 ease-(--ease-out) {node.done
									? 'scale-y-100'
									: 'scale-y-0'}"
							></span>
						</span>
					{/if}
				</div>

				<div class="min-w-0 flex-1 pb-6 last:pb-0">
					<p class="pt-1 font-semibold">{node.title}</p>

					{#if index === 0}
						<div
							class="mt-3 rounded-xl p-3 text-sm surface-raised transition-opacity duration-(--dur-base) ease-(--ease-out) {step >=
							1
								? 'opacity-100'
								: 'opacity-0'}"
						>
							<p class="min-h-5">
								{GOAL.slice(0, typed)}{#if step === 1 && typed < GOAL.length}<span
										class="keycap-caret ml-px inline-block h-[1.1em] w-px translate-y-[0.2em] bg-current"
									></span>{/if}
							</p>
						</div>
					{:else if index === 1}
						<ul
							class="mt-3 flex flex-col gap-2 text-sm transition-opacity duration-(--dur-base) ease-(--ease-out) {step >=
							2
								? 'opacity-100'
								: 'opacity-0'}"
						>
							{#each ['Block 1 · Getting started', 'Block 2 · Ownership and borrowing'] as block, b (block)}
								<li class="flex items-center gap-2">
									{#if blocksReady > b}
										<span
											class="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
										>
											<CheckIcon class="size-3" />
										</span>
									{:else}
										<span class="flex size-5 shrink-0 items-center justify-center">
											<Spinner class="size-4 text-primary" />
										</span>
									{/if}
									<span class={blocksReady > b ? '' : 'text-muted-foreground'}>{block}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<div
							class="mt-3 flex flex-col gap-3 rounded-xl p-3 text-sm surface-raised transition-opacity duration-(--dur-base) ease-(--ease-out) {step >=
							3
								? 'opacity-100'
								: 'opacity-0'}"
						>
							<p class="flex items-center gap-2">
								<span
									class="flex size-5 shrink-0 items-center justify-center rounded-[5px] border transition-[background-color,border-color,color] duration-(--dur-fast) ease-(--ease-out) {dayDone
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-input text-transparent'}"
								>
									<CheckIcon class="size-3.5" />
								</span>
								Day 1 · Hello, Cargo
							</p>
							<span class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
								<span
									class="block h-full w-full origin-left bg-primary transition-transform duration-(--dur-sheet) ease-(--ease-out) {dayDone
										? 'scale-x-[0.08]'
										: 'scale-x-0'}"
								></span>
							</span>
						</div>
					{/if}
				</div>
			</li>
		{/each}
	</ol>

	{#if !reduced.current}
		<ReplayButton visible={finished} onclick={() => run++} />
	{/if}
</div>
