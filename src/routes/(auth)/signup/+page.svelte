<script lang="ts">
	import { enhance } from '$app/forms';
	import { LIMITS } from '#lib/limits.js';
	import AuthCard from '#lib/components/auth/auth-card.svelte';
	import OauthButtons from '#lib/components/auth/oauth-buttons.svelte';
	import PasswordInput from '#lib/components/auth/password-input.svelte';
	import PasswordStrength from '#lib/components/auth/password-strength.svelte';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldGroup,
		FieldLabel
	} from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
	let password = $state('');
</script>

<svelte:head>
	<title>Create an account · Plan Generator</title>
	<meta
		name="description"
		content="Create a Plan Generator account and bring your own AI key to write day-by-day plans."
	/>
</svelte:head>

<AuthCard
	title="Create an account"
	description="Then connect your own AI key and write your first plan."
>
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
		<FieldGroup>
			{#if form?.message}
				<Alert variant="destructive" role="alert">
					<AlertDescription>{form.message}</AlertDescription>
				</Alert>
			{/if}
			<Field data-invalid={form?.errors?.name ? true : undefined}>
				<FieldLabel for="name">Name</FieldLabel>
				<Input
					id="name"
					name="name"
					autocomplete="name"
					required
					value={form?.values?.name ?? ''}
					aria-invalid={form?.errors?.name ? true : undefined}
					aria-describedby={form?.errors?.name ? 'name-error' : undefined}
				/>
				{#if form?.errors?.name}
					<FieldError id="name-error">{form.errors.name}</FieldError>
				{/if}
			</Field>
			<Field data-invalid={form?.errors?.email ? true : undefined}>
				<FieldLabel for="email">Email</FieldLabel>
				<Input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.values?.email ?? ''}
					aria-invalid={form?.errors?.email ? true : undefined}
					aria-describedby={form?.errors?.email ? 'email-error' : undefined}
				/>
				{#if form?.errors?.email}
					<FieldError id="email-error">{form.errors.email}</FieldError>
				{/if}
			</Field>
			<Field data-invalid={form?.errors?.password ? true : undefined}>
				<FieldLabel for="password">Password</FieldLabel>
				<PasswordInput
					id="password"
					autocomplete="new-password"
					bind:value={password}
					invalid={Boolean(form?.errors?.password)}
					describedBy="password-hint{form?.errors?.password ? ' password-error' : ''}"
				/>
				<FieldDescription id="password-hint">
					Use {LIMITS.passwordMin} or more characters with an uppercase letter, a number and a special
					character.
				</FieldDescription>
				<PasswordStrength {password} />
				{#if form?.errors?.password}
					<FieldError id="password-error">{form.errors.password}</FieldError>
				{/if}
			</Field>
			<Button type="submit" size="lg" disabled={submitting}>
				{#if submitting}<Spinner data-icon="inline-start" />{/if}
				Create account
			</Button>
		</FieldGroup>
	</form>

	<OauthButtons {...data.oauth} callbackURL={data.callbackURL} />

	{#snippet footer()}
		Already have an account?
		<a href="/login" class="font-medium text-primary underline-offset-4 hover:underline">
			Sign in
		</a>
	{/snippet}
</AuthCard>
