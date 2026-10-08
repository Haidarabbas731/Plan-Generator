<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ href: '/settings/keys', label: 'AI keys' },
		{ href: '/settings/models', label: 'Model' },
		{ href: '/settings/account', label: 'Account' },
		{ href: '/settings/data', label: 'Data & privacy' }
	];
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
	<div class="flex flex-col gap-4">
		<h1 class="text-title">Settings</h1>
		<nav
			aria-label="Settings"
			class="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={page.url.pathname === tab.href ? 'page' : undefined}
					class="-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground"
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	</div>
	{@render children()}
</div>
