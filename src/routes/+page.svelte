<script lang="ts">
	import LockIcon from '@lucide/svelte/icons/lock';
	import SamplePlan from '#lib/components/landing/sample-plan.svelte';
	import { buttonVariants } from '#lib/components/ui/button/index.js';

	const steps = [
		{
			title: 'Describe your goal',
			text: 'Write the goal in your own words, choose how many days and hours you have, and pick a start date.'
		},
		{
			title: 'Read the plan as it is written',
			text: 'The plan is written block by block, so you can start on the first days while the rest is still coming. No day repeats an earlier one.'
		},
		{
			title: 'Follow it and adjust',
			text: 'Tick days off and keep a streak. Ask the chat to make a week easier or to reschedule when your week changes. Every change can be undone.'
		}
	];
</script>

<svelte:head>
	<title>Plan Generator: turn a goal into a day-by-day plan</title>
	<meta
		name="description"
		content="Describe what you want to learn and get a plan with a task for every day, checkpoints along the way, and a chat to adjust it."
	/>
</svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 sm:px-6">
	<section class="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
		<div class="flex flex-col items-start gap-6">
			<h1 class="text-display">Turn a goal into a day-by-day plan</h1>
			<p class="max-w-prose text-body text-muted-foreground">
				Say what you want to learn and how much time you have. You get a task for every day, a
				checkpoint every few days, and a chat to adjust the plan as your week changes.
			</p>
			<div class="flex flex-wrap items-center gap-3">
				<a href="/signup" class={buttonVariants({ size: 'lg' })}>Get started</a>
				<a href="#how-it-works" class={buttonVariants({ variant: 'ghost', size: 'lg' })}>
					How it works
				</a>
			</div>
		</div>

		<div class="flex justify-center lg:justify-end">
			<SamplePlan />
		</div>
	</section>

	<section id="how-it-works" class="scroll-mt-20 border-t py-14 sm:py-20">
		<h2 class="text-title">How it works</h2>
		<ol class="mt-10 grid gap-8 md:grid-cols-3">
			{#each steps as step, i (step.title)}
				<li class="flex flex-col gap-3">
					<span
						class="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
					>
						{i + 1}
					</span>
					<h3 class="text-heading">{step.title}</h3>
					<p class="text-sm text-muted-foreground">{step.text}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="pb-16 sm:pb-24">
		<div class="flex items-start gap-4 rounded-xl bg-muted/60 p-6 ring-1 ring-foreground/5">
			<LockIcon class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
			<div class="flex flex-col gap-1.5">
				<h2 class="text-heading">You bring your own AI key</h2>
				<p class="max-w-prose text-sm text-muted-foreground">
					Add a key from Gemini, OpenRouter, Anthropic or OpenAI in your settings. It is stored
					encrypted, only its last four characters are ever shown, and it is used only to write your
					plans.
				</p>
			</div>
		</div>
	</section>
</div>

<footer class="border-t">
	<p class="mx-auto w-full max-w-5xl px-4 py-8 text-caption text-muted-foreground sm:px-6">
		Plan Generator. Your plans and chats live in your account, and you can export or delete them at
		any time.
	</p>
</footer>
