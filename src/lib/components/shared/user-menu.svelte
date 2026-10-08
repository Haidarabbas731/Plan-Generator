<script lang="ts">
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';

	interface Props {
		name: string;
		email: string;
	}

	let { name, email }: Props = $props();

	let signOutForm = $state<HTMLFormElement>();
	const initial = $derived((name.trim()[0] ?? email[0] ?? '?').toUpperCase());
</script>

<form bind:this={signOutForm} method="POST" action="/logout" class="hidden"></form>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
		aria-label="Account menu"
	>
		<span
			class="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
			aria-hidden="true"
		>
			{initial}
		</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-60">
		<DropdownMenu.Label class="flex flex-col gap-0.5 font-normal">
			<span class="truncate text-sm font-medium">{name}</span>
			<span class="truncate text-caption text-muted-foreground">{email}</span>
		</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onSelect={() => signOutForm?.requestSubmit()}>Sign out</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
