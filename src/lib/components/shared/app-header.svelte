<script lang="ts">
	import type { Snippet } from 'svelte';
	import Logo from './logo.svelte';
	import ThemeToggle from './theme-toggle.svelte';

	interface Props {
		actions?: Snippet;
	}

	let { actions }: Props = $props();
</script>

<header class="sticky top-0 z-40 border-b glass">
	<div class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
		<a href="/" class="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
			<Logo />
		</a>
		<div class="flex items-center gap-1">
			{@render actions?.()}
			<ThemeToggle />
		</div>
	</div>
</header>
