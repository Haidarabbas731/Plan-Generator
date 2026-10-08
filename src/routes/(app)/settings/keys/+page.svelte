<script lang="ts">
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import ProviderKeyCard from '#lib/components/settings/provider-key-card.svelte';
	import SettingsSection from '#lib/components/settings/settings-section.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>AI keys · Plan Generator</title>
	<meta
		name="description"
		content="Add and manage the AI provider keys used to write your plans."
	/>
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

	<SettingsSection
		id="keys"
		title="AI keys"
		description="Add a key for each provider you want to use. You can switch between them any time."
		panel={false}
	>
		<div class="flex flex-col gap-4">
			{#each data.providers as provider (provider.id)}
				<ProviderKeyCard
					{provider}
					error={form?.provider === provider.id && 'error' in form ? form.error : undefined}
				/>
			{/each}
		</div>
	</SettingsSection>
</div>
