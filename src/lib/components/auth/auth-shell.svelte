<script lang="ts">
	import type { Snippet } from 'svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { page } from '$app/state';
	import Logo from '#lib/components/shared/logo.svelte';
	import ThemeToggle from '#lib/components/shared/theme-toggle.svelte';
	import { buttonVariants } from '#lib/components/ui/button/index.js';

	interface Props {
		panelKey: string;
		panel: Snippet;
		children: Snippet;
	}

	let { panelKey, panel, children }: Props = $props();
</script>

<svelte:head>
	<style>
		html {
			scrollbar-gutter: stable;
		}
	</style>
</svelte:head>

<div class="grid min-h-dvh bg-background lg:grid-cols-[5fr_6fr]">
	<aside
		class="hidden flex-col justify-between border-r bg-card p-12 lg:sticky lg:top-0 lg:flex lg:h-dvh"
	>
		<a
			href="/"
			class="inline-flex w-fit rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
			aria-label="Plan Generator home"
		>
			<Logo />
		</a>
		{#key panelKey}
			<div
				class="flex w-full max-w-lg [animation:fade-in_180ms_var(--ease-out)_both] flex-col gap-8"
			>
				{@render panel()}
			</div>
		{/key}
		<span aria-hidden="true"></span>
	</aside>

	<div class="flex min-w-0 flex-col px-6 py-6 sm:px-10">
		<div class="flex items-center justify-between">
			<a
				href="/"
				class={buttonVariants({
					variant: 'ghost',
					size: 'sm',
					class: '-ml-3 h-11 gap-1.5 px-3 text-muted-foreground'
				})}
			>
				<ArrowLeftIcon aria-hidden="true" />
				Back to home
			</a>
			<ThemeToggle />
		</div>

		<div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
			<div class="lg:hidden">
				<Logo />
			</div>
			{#key page.url.pathname}
				<div class="reveal">
					{@render children()}
				</div>
			{/key}
		</div>
	</div>
</div>
