<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		eyebrow?: string;
		actions?: Snippet;
	}

	let { title, description, eyebrow, actions }: Props = $props();
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="flex min-w-0 flex-col gap-1">
		{#if eyebrow}
			<p class="text-caption text-muted-foreground">{eyebrow}</p>
		{/if}
		<h1 class="text-title">{title}</h1>
		{#if description}
			<p class="text-body text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex items-center gap-2">{@render actions()}</div>
	{/if}
</header>
