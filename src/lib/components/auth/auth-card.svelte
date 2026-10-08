<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	interface Props {
		title: string;
		description: string;
		align?: 'start' | 'center';
		children: Snippet;
		footer?: Snippet;
	}

	let { title, description, align = 'start', children, footer }: Props = $props();
</script>

<div class={cn('flex flex-col gap-8', align === 'center' && 'text-center')}>
	<div class="flex flex-col gap-2">
		<h1 class="text-title">{title}</h1>
		<p class="text-sm text-muted-foreground">{description}</p>
	</div>
	{@render children()}
	{#if footer}
		<div class="border-t pt-6 text-center text-sm text-muted-foreground">
			{@render footer()}
		</div>
	{/if}
</div>
