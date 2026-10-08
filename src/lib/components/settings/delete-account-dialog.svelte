<script lang="ts">
	import { enhance } from '$app/forms';
	import PasswordInput from '#lib/components/auth/password-input.svelte';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Field, FieldError, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { DELETE_ACCOUNT_PHRASE } from '#lib/privacy.js';

	interface Props {
		open: boolean;
		hasPassword: boolean;
		error?: { field: 'phrase' | 'password' | 'general'; message: string } | null;
	}

	let { open = $bindable(false), hasPassword, error = null }: Props = $props();

	let phrase = $state('');
	let deleting = $state(false);

	const ready = $derived(phrase.trim().toLowerCase() === DELETE_ACCOUNT_PHRASE);
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete your account?</AlertDialog.Title>
			<AlertDialog.Description>
				Your plans, chats, saved AI keys and settings are removed for good. Plans being written are
				stopped. This cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form
			method="POST"
			action="?/deleteAccount"
			novalidate
			class="flex flex-col gap-4"
			use:enhance={() => {
				deleting = true;
				return async ({ update }) => {
					await update({ reset: false });
					deleting = false;
				};
			}}
		>
			<Field data-invalid={error?.field === 'phrase' ? true : undefined}>
				<FieldLabel for="delete-phrase">Type “{DELETE_ACCOUNT_PHRASE}” to confirm</FieldLabel>
				<Input
					id="delete-phrase"
					name="phrase"
					bind:value={phrase}
					autocomplete="off"
					class="h-11 text-base sm:text-sm"
					aria-invalid={error?.field === 'phrase' ? true : undefined}
				/>
				{#if error?.field === 'phrase'}<FieldError>{error.message}</FieldError>{/if}
			</Field>
			{#if hasPassword}
				<Field data-invalid={error?.field === 'password' ? true : undefined}>
					<FieldLabel for="delete-password">Your password</FieldLabel>
					<PasswordInput
						id="delete-password"
						autocomplete="current-password"
						invalid={error?.field === 'password'}
					/>
					{#if error?.field === 'password'}<FieldError>{error.message}</FieldError>{/if}
				</Field>
			{/if}
			{#if error?.field === 'general'}
				<p class="text-sm text-destructive" role="alert">{error.message}</p>
			{/if}
			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button" disabled={deleting}>Keep my account</AlertDialog.Cancel>
				<Button type="submit" variant="destructive" disabled={!ready || deleting}>
					{#if deleting}<Spinner data-icon="inline-start" />{/if}
					Delete account
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>
