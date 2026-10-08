<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/auth/auth-card.svelte';
	import PasswordInput from '#lib/components/auth/password-input.svelte';
	import PasswordStrength from '#lib/components/auth/password-strength.svelte';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { Field, FieldError, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
	let password = $state('');
</script>

<svelte:head>
	<title>Choose a new password · Plan Generator</title>
</svelte:head>

<AuthCard title="Choose a new password" description="Pick something you have not used before.">
	{#if data.invalid}
		<div class="flex flex-col gap-4">
			<Alert variant="destructive" role="alert">
				<AlertDescription>This reset link is not valid anymore.</AlertDescription>
			</Alert>
			<a href="/forgot-password" class={buttonVariants({ size: 'lg' })}>Ask for a new link</a>
		</div>
	{:else}
		<form
			method="POST"
			novalidate
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: false });
					submitting = false;
				};
			}}
		>
			<input type="hidden" name="token" value={data.token} />
			<FieldGroup>
				<Field data-invalid={form?.error ? true : undefined}>
					<FieldLabel for="password">New password</FieldLabel>
					<PasswordInput
						id="password"
						autocomplete="new-password"
						bind:value={password}
						invalid={Boolean(form?.error)}
						describedBy={form?.error ? 'password-error' : undefined}
					/>
					{#if form?.error}<FieldError id="password-error">{form.error}</FieldError>{/if}
					<PasswordStrength {password} />
				</Field>
				<Button type="submit" size="lg" disabled={submitting}>
					{#if submitting}<Spinner data-icon="inline-start" />{/if}
					Save new password
				</Button>
			</FieldGroup>
		</form>
	{/if}
</AuthCard>
