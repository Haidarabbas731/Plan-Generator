<script lang="ts">
	import ClipboardPasteIcon from '@lucide/svelte/icons/clipboard-paste';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import MailSearchIcon from '@lucide/svelte/icons/mail-search';
	import { MediaQuery } from 'svelte/reactivity';
	import { runTimeline } from '#lib/client/timeline.js';
	import Logo from '#lib/components/shared/logo.svelte';
	import ReplayButton from '#lib/components/shared/replay-button.svelte';

	interface Props {
		minutes: number;
	}

	let { minutes }: Props = $props();

	const CODE = '482913';
	const DIGIT_STAGGER_MS = 70;
	const reduced = new MediaQuery('(prefers-reduced-motion: reduce)');

	const points = $derived([
		{ icon: ClockIcon, text: `The code works for ${minutes} minutes.` },
		{ icon: MailSearchIcon, text: 'Not there yet? Check your spam folder.' },
		{ icon: ClipboardPasteIcon, text: 'You can paste it, spaces and dashes included.' }
	]);

	let run = $state(0);
	let arrived = $state(true);
	let finished = $state(true);

	$effect(() => {
		void run;
		if (reduced.current) {
			arrived = true;
			finished = true;
			return;
		}
		arrived = false;
		finished = false;
		return runTimeline([
			{ at: 250, run: () => (arrived = true) },
			{ at: 250 + 350 + 400 + CODE.length * DIGIT_STAGGER_MS, run: () => (finished = true) }
		]);
	});
</script>

<div class="flex flex-col gap-3">
	<h2 class="text-display">Check your inbox.</h2>
	<p class="text-body text-muted-foreground">
		We sent a 6-digit code. It usually arrives within a few seconds.
	</p>
</div>

<div class="flex flex-col gap-2">
	<p class="sr-only">
		Example: an email from Plan Generator with the subject "Your Plan Generator code is 482 913" and
		the code 482913 in large type.
	</p>

	<div
		aria-hidden="true"
		class="rounded-xl p-4 surface-raised transition-[opacity,transform] duration-(--dur-sheet) ease-(--ease-out) {arrived
			? 'translate-y-0 opacity-100'
			: 'translate-y-2 opacity-0'}"
	>
		<div class="flex items-center gap-2">
			<Logo />
			<span class="ml-auto text-caption text-muted-foreground">Example</span>
		</div>
		<p class="mt-3 font-medium">Your Plan Generator code is 482 913</p>
		<div
			class="mt-3 flex min-h-[3.25rem] items-center justify-center gap-3 rounded-lg bg-muted px-3 py-3 text-2xl font-semibold tabular-nums"
		>
			{#if arrived}
				{#each CODE.split('') as digit, index (`${run}-${index}`)}
					<span
						class="keycap-glyph"
						style:--keycap-delay="{reduced.current ? 0 : 350 + index * DIGIT_STAGGER_MS}ms"
					>
						{digit}
					</span>
				{/each}
			{/if}
		</div>
		<p class="mt-3 text-caption text-muted-foreground">
			Enter this code in Plan Generator to finish creating your account.
		</p>
	</div>

	{#if !reduced.current}
		<ReplayButton visible={finished} onclick={() => run++} />
	{/if}
</div>

<ul class="flex flex-col gap-4">
	{#each points as point (point.text)}
		<li class="flex items-center gap-4">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
				<point.icon class="size-5" aria-hidden="true" />
			</span>
			<span class="text-body text-muted-foreground">{point.text}</span>
		</li>
	{/each}
</ul>
