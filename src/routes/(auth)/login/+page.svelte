<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/auth/auth-card.svelte';
	import OauthButtons from '#lib/components/auth/oauth-buttons.svelte';
	import PasswordInput from '#lib/components/auth/password-input.svelte';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Field, FieldError, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Sign in · Plan Generator</title>
	<meta name="description" content="Sign in to Plan Generator to continue your plans." />
</svelte:head>

<AuthCard title="Sign in" description="Welcome back. Pick up where your plan left off.">
	<OauthButtons {...data.oauth} callbackURL={data.redirectTo} />

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
			{#if data.passwordReset && !form?.message}
				<Alert role="status">
					<AlertDescription>Your password was changed. Sign in with the new one.</AlertDescription>
				</Alert>
			{/if}
			{#if form?.message}
				<Alert variant="destructive" role="alert">
					<AlertDescription>{form.message}</AlertDescription>
				</Alert>
			{/if}
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
				<div class="flex items-center justify-between gap-2">
					<FieldLabel for="password">Password</FieldLabel>
					{#if data.emailEnabled}
						<a
							href="/forgot-password"
							class="text-caption font-medium text-primary underline-offset-4 hover:underline"
						>
							Forgot password?
						</a>
					{/if}
				</div>
				<PasswordInput
					id="password"
					autocomplete="current-password"
					invalid={Boolean(form?.errors?.password)}
					describedBy={form?.errors?.password ? 'password-error' : undefined}
				/>
				{#if form?.errors?.password}
					<FieldError id="password-error">{form.errors.password}</FieldError>
				{/if}
			</Field>
			<Button type="submit" size="lg" disabled={submitting}>
				{#if submitting}<Spinner data-icon="inline-start" />{/if}
				Sign in
			</Button>
		</FieldGroup>
	</form>

	<p class="text-sm text-muted-foreground">
		New here?
		<a href="/signup" class="font-medium text-primary underline-offset-4 hover:underline">
			Create an account
		</a>
	</p>
</AuthCard>
