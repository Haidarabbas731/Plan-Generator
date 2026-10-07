<script lang="ts">
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import ProviderKeyCard from '#lib/components/settings/provider-key-card.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>AI keys · Plan Generator</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if data.welcome && !data.hasKeys}
		<Alert>
			<KeyRoundIcon aria-hidden="true" />
			<AlertTitle>Connect your AI key to start</AlertTitle>
			<AlertDescription>
				Plans are written by the AI provider you choose, using your own key. Add one below. It is
				stored encrypted and never shown again.
			</AlertDescription>
		</Alert>
	{/if}

	<div class="flex flex-col gap-1">
		<h2 class="text-heading">AI keys</h2>
		<p class="text-sm text-muted-foreground">
			Add a key for each provider you want to use. You can switch between them any time.
		</p>
	</div>

	<div class="flex flex-col gap-4">
		{#each data.providers as provider (provider.id)}
			<ProviderKeyCard
				{provider}
				error={form?.provider === provider.id && 'error' in form ? form.error : undefined}
			/>
		{/each}
	</div>
</div>
