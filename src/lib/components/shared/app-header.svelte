<script lang="ts">
	import { page } from '$app/state';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import Logo from './logo.svelte';
	import ThemeToggle from './theme-toggle.svelte';
	import UserMenu from './user-menu.svelte';

	interface Props {
		user: { name: string; email: string } | null;
	}

	let { user }: Props = $props();

	const links = [
		{ href: '/plans', label: 'Plans' },
		{ href: '/settings', label: 'Settings' }
	];

	const isCurrent = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
</script>

<header class="sticky top-0 z-40 border-b glass">
	<div class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
		<a
			href={user ? '/plans' : '/'}
			class="inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
		>
			<Logo />
		</a>
		<div class="flex items-center gap-1">
			{#if user}
				<nav aria-label="Main" class="mr-2 hidden items-center gap-1 sm:flex">
					{#each links as link (link.href)}
						<a
							href={link.href}
							aria-current={isCurrent(link.href) ? 'page' : undefined}
							class="{buttonVariants({
								variant: 'ghost',
								class: 'h-11 px-4'
							})} aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
						>
							{link.label}
						</a>
					{/each}
				</nav>
				<UserMenu name={user.name} email={user.email} />
			{:else}
				<a href="/login" class={buttonVariants({ variant: 'ghost', class: 'h-11 px-4' })}>
					Sign in
				</a>
			{/if}
			<ThemeToggle />
		</div>
	</div>
</header>
