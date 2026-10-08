<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';

	const notFound = $derived(page.status === 404);
	const title = $derived(notFound ? 'Page not found' : 'Something went wrong');
	const detail = $derived(
		notFound
			? 'That page does not exist or has moved.'
			: page.status >= 500
				? 'This is on our side. Try again in a moment.'
				: (page.error?.message ?? 'The request could not be completed.')
	);

	let canGoBack = $state(false);

	onMount(() => {
		canGoBack = history.length > 1;
	});
</script>

<svelte:head>
	<title>{page.status} · {title}</title>
</svelte:head>

<div class="frame flex flex-col items-center gap-4 py-24 text-center">
	<p class="sr-only">Error {page.status}</p>
	<p class="text-display text-muted-foreground/40 tabular-nums" aria-hidden="true">
		{page.status}
	</p>
	<h1 class="text-title">{title}</h1>
	<p class="max-w-md text-body text-muted-foreground">{detail}</p>
	<div class="mt-2 flex flex-wrap items-center justify-center gap-3">
		<a href="/" class={buttonVariants({ size: 'lg' })}>Back to home</a>
		{#if canGoBack}
			<Button type="button" variant="ghost" size="lg" onclick={() => history.back()}>Go back</Button
			>
		{/if}
	</div>
</div>
