<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Step } from '#lib/landing-content.js';

	interface Props {
		step: Step;
		index: number;
		mock: Snippet;
	}

	let { step, index, mock }: Props = $props();
</script>

<li data-reveal-item style:--reveal-i={index + 1} class="flex flex-col gap-4">
	<div
		class="flex min-h-40 flex-col justify-center gap-2 rounded-xl p-4 text-sm surface-flat"
		aria-hidden="true"
	>
		{@render mock()}
	</div>
	<div class="flex flex-col gap-2">
		<span
			class="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
		>
			{index + 1}
		</span>
		<h3 class="text-heading">{step.title}</h3>
		<p class="text-sm text-muted-foreground">{step.text}</p>
	</div>
</li>
