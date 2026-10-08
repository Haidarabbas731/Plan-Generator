<script lang="ts">
	import AuthCard from '#lib/components/auth/auth-card.svelte';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.title} · Plan Generator</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthCard title={data.title} description={data.body}>
	<a href="/login" class={buttonVariants({ size: 'lg' })}>Back to sign in</a>
</AuthCard>
