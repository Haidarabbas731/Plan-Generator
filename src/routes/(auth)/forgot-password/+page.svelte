<script lang="ts">
	import MailCheckIcon from '@lucide/svelte/icons/mail-check';
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/auth/auth-card.svelte';
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
		<div class="flex flex-col gap-4 rounded-xl p-4 text-left surface-flat" role="status">
			<div class="flex items-start gap-3">
				<MailCheckIcon class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
				<p class="text-sm text-muted-foreground">
					If an account exists for <span class="font-medium text-foreground">{form.email}</span>, a
					reset link is on its way. It can take a minute. Check your spam folder too.
				</p>
			</div>
			<a
				href="/forgot-password"
				class="text-sm font-medium text-primary underline-offset-4 hover:underline"
			>
				Use a different email
			</a>
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

	{#snippet footer()}
		<a href="/login" class="font-medium text-primary underline-offset-4 hover:underline">
			Back to sign in
		</a>
	{/snippet}
</AuthCard>
