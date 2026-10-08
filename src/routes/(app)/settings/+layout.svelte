<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import PageHeader from '#lib/components/shared/page-header.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ href: '/settings/keys', label: 'AI keys' },
		{ href: '/settings/models', label: 'Model' },
		{ href: '/settings/account', label: 'Account' },
		{ href: '/settings/data', label: 'Data & privacy' }
	];

	let strip = $state<HTMLElement | null>(null);
	let indicator = $state({ x: 0, width: 0, visible: false, animate: false });

	function measure() {
		const link = strip?.querySelector<HTMLElement>('a[aria-current="page"]');
		if (!link) return;
		indicator = {
			x: link.offsetLeft,
			width: link.offsetWidth,
			visible: true,
			animate: indicator.visible
		};
	}

	$effect(() => {
		void page.url.pathname;
		untrack(measure);
		strip
			?.querySelector<HTMLElement>('a[aria-current="page"]')
			?.scrollIntoView({ inline: 'center', block: 'nearest' });
	});

	$effect(() => {
		if (!strip) return;
		const observer = new ResizeObserver(() => {
			indicator = { ...indicator, animate: false };
			measure();
		});
		observer.observe(strip);
		return () => observer.disconnect();
	});
</script>

<div class="frame py-10">
	<div class="flex column-narrow flex-col gap-8">
		<div class="flex flex-col gap-4">
			<PageHeader title="Settings" />
			<nav
				bind:this={strip}
				aria-label="Settings"
				class="relative -mx-4 flex snap-x snap-proximity gap-1 overflow-x-auto overflow-y-hidden border-b px-4 sm:mx-0 sm:px-0"
			>
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						aria-current={page.url.pathname === tab.href ? 'page' : undefined}
						class="inline-flex h-11 shrink-0 snap-start items-center px-3 text-sm font-medium text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground"
					>
						{tab.label}
					</a>
				{/each}
				<span
					aria-hidden="true"
					data-tab-indicator
					class="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-primary {indicator.animate
						? 'transition-transform duration-(--dur-fast) ease-(--ease-out)'
						: ''} {indicator.visible ? '' : 'opacity-0'}"
					style:transform="translateX({indicator.x}px) scaleX({indicator.width})"
				></span>
			</nav>
		</div>
		{@render children()}
	</div>
</div>
