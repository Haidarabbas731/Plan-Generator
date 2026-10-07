<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description: string;
		children: Snippet;
	}

	let { title, description, children }: Props = $props();
</script>

<div class="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-14 sm:py-20">
	<div class="flex flex-col gap-1.5">
		<h1 class="text-title">{title}</h1>
		<p class="text-sm text-muted-foreground">{description}</p>
	</div>
	{@render children()}
</div>
