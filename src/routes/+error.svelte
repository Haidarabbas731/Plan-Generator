<script lang="ts">
	import { page } from '$app/state';
	import { buttonVariants } from '#lib/components/ui/button/index.js';

	const notFound = $derived(page.status === 404);
	const title = $derived(notFound ? 'Page not found' : 'Something went wrong');
	const detail = $derived(
		notFound
			? 'That page does not exist or has moved.'
			: page.status >= 500
				? 'This is on our side. Try again in a moment.'
				: (page.error?.message ?? 'The request could not be completed.')
	);
</script>

<svelte:head>
	<title>{page.status} · {title}</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-md flex-col items-start gap-4 px-4 py-24 sm:px-6">
	<p class="text-caption font-medium text-muted-foreground">Error {page.status}</p>
	<h1 class="text-title">{title}</h1>
	<p class="text-body text-muted-foreground">{detail}</p>
	<a href="/" class={buttonVariants({ size: 'lg' })}>Back to home</a>
</div>
