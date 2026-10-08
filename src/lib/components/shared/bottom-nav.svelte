<script lang="ts">
	import { page } from '$app/state';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { isCurrentPath } from '#lib/nav.js';

	const itemClass =
		'pressable flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption font-medium text-muted-foreground outline-none focus-visible:text-foreground aria-[current=page]:text-primary';

	const pathname = $derived(page.url.pathname);
</script>

<nav
	aria-label="Main"
	class="fixed inset-x-0 bottom-0 z-40 border-t glass pb-[env(safe-area-inset-bottom)] sm:hidden"
>
	<div class="grid grid-cols-3">
		<a href="/plans" class={itemClass} aria-current={pathname === '/plans' ? 'page' : undefined}>
			<ListChecksIcon class="size-[22px]" aria-hidden="true" />
			Plans
		</a>
		<a href="/plans/new" class={itemClass}>
			<span
				class="flex size-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground"
			>
				<PlusIcon class="size-4" aria-hidden="true" />
			</span>
			New plan
		</a>
		<a
			href="/settings"
			class={itemClass}
			aria-current={isCurrentPath(pathname, '/settings') ? 'page' : undefined}
		>
			<SettingsIcon class="size-[22px]" aria-hidden="true" />
			Settings
		</a>
	</div>
</nav>
