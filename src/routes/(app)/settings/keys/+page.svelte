<script lang="ts">
	import ProviderKeyCard from '#lib/components/settings/provider-key-card.svelte';
	import SettingsSection from '#lib/components/settings/settings-section.svelte';
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
