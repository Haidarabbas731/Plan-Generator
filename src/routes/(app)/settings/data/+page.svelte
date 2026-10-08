<script lang="ts">
	import DownloadIcon from '@lucide/svelte/icons/download';
	import { toast } from 'svelte-sonner';
	import DeleteAccountDialog from '#lib/components/settings/delete-account-dialog.svelte';
	import SettingsSection from '#lib/components/settings/settings-section.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let deleteOpen = $state(false);
	let exporting = $state(false);

	const deleteError = $derived(
		form && 'field' in form
			? { field: form.field as 'phrase' | 'password' | 'general', message: String(form.message) }
			: null
	);

	async function exportData() {
		exporting = true;
		try {
			const response = await fetch('/settings/export');
			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { message?: string } | null;
				toast.error(body?.message ?? 'Could not export your data. Try again.');
				return;
			}
			const name =
				/filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ??
				'plan-generator-export.json';
			const url = URL.createObjectURL(await response.blob());
			const link = document.createElement('a');
			link.href = url;
			link.download = name;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			toast.error('Could not export your data. Try again.');
		} finally {
			exporting = false;
		}
	}
</script>

<svelte:head>
	<title>Data & privacy · Plan Generator</title>
	<meta name="description" content="Export your data or delete your account." />
</svelte:head>

<div class="flex flex-col gap-8">
	<SettingsSection id="privacy" title="What we keep">
		<ul class="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
			<li>Your account, plans, progress and chats with the plan assistant.</li>
			<li>
				Your AI keys, encrypted. A key is only used to call the provider you chose, and only when
				you generate or chat.
			</li>
			<li>
				The text of your goal, your plan and your chat messages is sent to that provider to write
				and change your plan.
			</li>
			<li>You can download everything below, or delete it all.</li>
		</ul>
	</SettingsSection>

	<SettingsSection
		id="export"
		title="Export your data"
		description="A JSON file with your profile, settings, plans, progress and chats. Saved keys are not included, only which providers you connected."
	>
		<div>
			<Button
				type="button"
				variant="outline"
				class="h-11 gap-2 px-4"
				disabled={exporting}
				onclick={exportData}
			>
				{#if exporting}<Spinner data-icon="inline-start" />{:else}<DownloadIcon
						aria-hidden="true"
					/>{/if}
				Download my data
			</Button>
		</div>
	</SettingsSection>

	<SettingsSection
		id="delete"
		title="Delete your account"
		description="Removes your account, plans, chats and saved keys. Plans still being written are stopped."
		tone="danger"
	>
		<div>
			<Button
				type="button"
				variant="destructive"
				class="h-11 px-4"
				onclick={() => (deleteOpen = true)}
			>
				Delete account
			</Button>
		</div>
	</SettingsSection>
</div>

<DeleteAccountDialog bind:open={deleteOpen} hasPassword={data.hasPassword} error={deleteError} />
