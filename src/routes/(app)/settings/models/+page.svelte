<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import { toast } from 'svelte-sonner';
	import ModelField from '#lib/components/plans/model-field.svelte';
	import SettingsSection from '#lib/components/settings/settings-section.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let provider = $state<string>(untrack(() => data.defaults.provider));
	let model = $state(untrack(() => data.defaults.model));
	let saving = $state(false);

	const errors: { provider?: string; model?: string } = $derived(
		(form && 'errors' in form ? form.errors : undefined) ?? {}
	);
</script>

<svelte:head>
	<title>Model defaults · Plan Generator</title>
	<meta name="description" content="Choose the default provider and model for new plans." />
</svelte:head>

<SettingsSection
	id="defaults"
	title="Default model"
	description="New plans start with this provider and model. You can still change them for each plan."
	panel={data.providers.length > 0}
>
	{#if data.providers.length === 0}
		<Alert>
			<KeyRoundIcon aria-hidden="true" />
			<AlertTitle>Connect your AI key first</AlertTitle>
			<AlertDescription>
				Defaults are chosen from the providers you have a key for.
				<a
					href="/settings/keys"
					class="font-medium text-primary underline-offset-4 hover:underline"
				>
					Add a key
				</a>
			</AlertDescription>
		</Alert>
	{:else}
		<form
			method="POST"
			action="?/save"
			class="flex flex-col gap-6"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					if (result.type === 'success') toast.success('Default model saved');
					await update({ reset: false });
					saving = false;
				};
			}}
		>
			<ModelField
				providers={data.providers}
				bind:provider
				bind:model
				providerError={errors.provider}
				modelError={errors.model}
			/>
			<div>
				<Button type="submit" class="h-11 px-5" disabled={saving || !model}>
					{#if saving}<Spinner data-icon="inline-start" />{/if}
					Save default
				</Button>
			</div>
		</form>
	{/if}
</SettingsSection>
