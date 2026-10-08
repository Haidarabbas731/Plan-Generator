<script lang="ts">
	import { page } from '$app/state';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import { isCurrentPath, showsBackLink } from '#lib/nav.js';
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

	const backLink = $derived(Boolean(user) && showsBackLink(page.url.pathname));

	let scrolled = $state(false);

	$effect(() => {
		const update = () => (scrolled = window.scrollY > 4);
		update();
		window.addEventListener('scroll', update, { passive: true });
		return () => window.removeEventListener('scroll', update);
	});
</script>

<header
	data-scrolled={scrolled ? '' : undefined}
	class="sticky top-0 z-40 border-b glass border-b-transparent transition-[border-color] duration-(--dur-fast) ease-(--ease-out) data-[scrolled]:border-b-border"
>
	<div class="frame flex h-14 items-center justify-between gap-4">
		{#if backLink}
			<a
				href="/plans"
				class="{buttonVariants({
					variant: 'ghost',
					class: '-ml-2 h-11 gap-1.5 px-2 sm:hidden'
				})} text-base"
			>
				<ArrowLeftIcon aria-hidden="true" />
				Plans
			</a>
		{/if}
		<a
			href={user ? '/plans' : '/'}
			class="inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40 {backLink
				? 'max-sm:hidden'
				: ''}"
		>
			<Logo />
		</a>
		<div class="flex items-center gap-1">
			{#if user}
				<nav aria-label="Main" class="mr-2 hidden items-center gap-1 sm:flex">
					{#each links as link (link.href)}
						<a
							href={link.href}
							aria-current={isCurrentPath(page.url.pathname, link.href) ? 'page' : undefined}
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
				{#if page.url.pathname === '/'}
					<nav aria-label="Landing page" class="mr-1 hidden items-center gap-1 md:flex">
						<a
							href="#how-it-works"
							class={buttonVariants({ variant: 'ghost', class: 'h-11 px-4' })}
						>
							How it works
						</a>
						<a href="#faq" class={buttonVariants({ variant: 'ghost', class: 'h-11 px-4' })}>
							FAQ
						</a>
					</nav>
				{/if}
				<a href="/login" class={buttonVariants({ variant: 'ghost', class: 'h-11 px-4' })}>
					Sign in
				</a>
				{#if page.url.pathname === '/'}
					<a href="/signup" class={buttonVariants({ class: 'hidden h-11 px-4 sm:inline-flex' })}>
						Get started
					</a>
				{/if}
			{/if}
			<ThemeToggle />
		</div>
	</div>
</header>
