<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	interface Props {
		title: string;
		description: string;
		align?: 'start' | 'center';
		children: Snippet;
	}

	let { title, description, align = 'start', children }: Props = $props();
</script>

<div
	class={cn(
		'mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-14 sm:py-20',
		align === 'center' && 'text-center'
	)}
>
	<div class="flex flex-col gap-1.5">
		<h1 class="text-title">{title}</h1>
		<p class="text-sm text-muted-foreground">{description}</p>
	</div>
	{@render children()}
</div>
