<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import { page } from '$app/state';
	import AppHeader from '#lib/components/shared/app-header.svelte';
	import BottomNav from '#lib/components/shared/bottom-nav.svelte';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { showsTabBar } from '#lib/nav.js';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const tabBar = $derived(Boolean(data.user) && showsTabBar(page.url.pathname));
	const onAuthPage = $derived(page.route.id?.startsWith('/(auth)') ?? false);

	$effect(() => {
		document.documentElement.setAttribute('data-hydrated', '');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher themeColors={{ light: '#f2fbf9', dark: '#0a1d1c' }} />
<Toaster position="bottom-right" />

<a
	href="#main"
	class="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
>
	Skip to content
</a>

<Tooltip.Provider delayDuration={400}>
	{#if !onAuthPage}
		<AppHeader user={data.user} />
	{/if}

	<main
		id="main"
		class={tabBar ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0' : undefined}
	>
		{@render children()}
	</main>

	{#if tabBar}
		<BottomNav />
	{/if}
</Tooltip.Provider>
