<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import AppHeader from '$lib/components/shared/app-header.svelte';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher themeColors={{ light: '#fbfaf8', dark: '#17151d' }} />
<Toaster position="bottom-right" />

<a
	href="#main"
	class="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
>
	Skip to content
</a>

<Tooltip.Provider delayDuration={400}>
	<AppHeader>
		{#snippet actions()}
			<a href="/login" class={buttonVariants({ variant: 'ghost', size: 'sm' })}>Sign in</a>
		{/snippet}
	</AppHeader>

	<main id="main">
		{@render children()}
	</main>
</Tooltip.Provider>
