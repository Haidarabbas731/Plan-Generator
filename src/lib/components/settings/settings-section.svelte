<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id: string;
		title: string;
		description?: string;
		tone?: 'default' | 'danger';
		panel?: boolean;
		children: Snippet;
	}

	let { id, title, description, tone = 'default', panel = true, children }: Props = $props();
</script>

<section aria-labelledby="{id}-heading" class="flex flex-col gap-3">
	<div class="flex flex-col gap-1">
		<h2 id="{id}-heading" class="text-heading">{title}</h2>
		{#if description}
			<p class="text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if panel}
		<div
			class="flex flex-col gap-4 rounded-xl p-5 {tone === 'danger'
				? 'border border-destructive/30 bg-card'
				: 'surface-flat'}"
		>
			{@render children()}
		</div>
	{:else}
		{@render children()}
	{/if}
</section>
