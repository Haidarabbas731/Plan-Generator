<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/auth/auth-card.svelte';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Field, FieldError, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Reset your password · Plan Generator</title>
</svelte:head>

<AuthCard title="Reset your password" description="We will email you a link to choose a new one.">
	{#if form && 'sent' in form}
		<Alert role="status">
			<AlertDescription>
				If an account exists for {form.email}, a reset link is on its way. It can take a minute.
			</AlertDescription>
		</Alert>
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
			<FieldGroup>
				<Field data-invalid={form && 'error' in form ? true : undefined}>
					<FieldLabel for="email">Email</FieldLabel>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value={form && 'email' in form ? form.email : ''}
						aria-invalid={form && 'error' in form ? true : undefined}
						aria-describedby={form && 'error' in form ? 'email-error' : undefined}
					/>
					{#if form && 'error' in form}<FieldError id="email-error">{form.error}</FieldError>{/if}
				</Field>
				<Button type="submit" size="lg" disabled={submitting}>
					{#if submitting}<Spinner data-icon="inline-start" />{/if}
					Send reset link
				</Button>
			</FieldGroup>
		</form>
	{/if}

	<p class="text-sm text-muted-foreground">
		<a href="/login" class="font-medium text-primary underline-offset-4 hover:underline">
			Back to sign in
		</a>
	</p>
</AuthCard>
