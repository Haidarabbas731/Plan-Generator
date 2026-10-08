<script lang="ts">
	import type { Component } from 'svelte';
	import type { Benefit } from '#lib/landing-content.js';

	interface Props {
		benefit: Benefit;
		index: number;
		icon: Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
	}

	let { benefit, index, icon: Icon }: Props = $props();
</script>

<li
	data-reveal-item
	style:--reveal-i={index + 1}
	class="flex flex-col gap-3 rounded-xl p-6 surface-flat"
>
	<span
		class="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"
	>
		<Icon class="size-5" aria-hidden="true" />
	</span>
	<h3 class="text-heading">{benefit.title}</h3>
	<p class="text-sm text-muted-foreground">{benefit.text}</p>
</li>
