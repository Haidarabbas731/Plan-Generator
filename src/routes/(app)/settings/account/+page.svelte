<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { authClient } from '#lib/auth-client.js';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import { toast } from 'svelte-sonner';
	import PasswordInput from '#lib/components/auth/password-input.svelte';
	import PlanField from '#lib/components/plans/plan-field.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Field, FieldError, FieldGroup, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { LIMITS } from '#lib/limits.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let pending = $state<'name' | 'password' | null>(null);
	let linking = $state<string | null>(null);

	async function connect(provider: 'google' | 'github') {
		linking = provider;
		await authClient.linkSocial({ provider, callbackURL: '/settings/account' });
		linking = null;
	}
	let name = $derived(data.profile.name);

	const nameError = $derived(form && form.section === 'name' && 'error' in form ? form.error : '');
	const passwordError = $derived(
		form && form.section === 'password' && 'error' in form ? form.error : ''
	);

	const submit =
		(section: 'name' | 'password', message: string): SubmitFunction =>
		() => {
			pending = section;
			return async ({ result, update }) => {
				if (result.type === 'success') toast.success(message);
				await update({ reset: section === 'password' && result.type === 'success' });
				pending = null;
			};
		};
</script>

<svelte:head>
	<title>Account · Plan Generator</title>
	<meta name="description" content="Manage your name and password." />
</svelte:head>

<div class="flex flex-col gap-10">
	<section class="flex flex-col gap-4" aria-labelledby="profile-heading">
		<h2 id="profile-heading" class="text-lg font-medium">Profile</h2>
		<div class="flex flex-col gap-1 text-sm">
			<span class="text-muted-foreground">Email</span>
			<span class="flex flex-wrap items-center gap-2">
				{data.profile.email}
				{#if data.emailEnabled && data.profile.verified}
					<span class="inline-flex items-center gap-1 text-caption text-success">
						<BadgeCheckIcon class="size-4" aria-hidden="true" /> Verified
					</span>
				{/if}
			</span>
		</div>
		<form
			method="POST"
			action="?/name"
			novalidate
			class="flex max-w-sm flex-col gap-4"
			use:enhance={submit('name', 'Name saved')}
		>
			<PlanField
				id="name"
				label="Name"
				maxlength={LIMITS.nameMax}
				bind:value={name}
				error={nameError}
			/>
			<div>
				<Button type="submit" class="h-11 px-5" disabled={pending !== null}>
					{#if pending === 'name'}<Spinner data-icon="inline-start" />{/if}
					Save name
				</Button>
			</div>
		</form>
	</section>

	<section class="flex flex-col gap-4" aria-labelledby="password-heading">
		<h2 id="password-heading" class="text-lg font-medium">Password</h2>
		{#if data.hasPassword}
			<form
				method="POST"
				action="?/password"
				novalidate
				class="flex max-w-sm flex-col gap-4"
				use:enhance={submit('password', 'Password changed')}
			>
				<FieldGroup>
					<Field data-invalid={passwordError ? true : undefined}>
						<FieldLabel for="currentPassword">Current password</FieldLabel>
						<PasswordInput
							id="currentPassword"
							name="currentPassword"
							autocomplete="current-password"
						/>
					</Field>
					<Field data-invalid={passwordError ? true : undefined}>
						<FieldLabel for="newPassword">New password</FieldLabel>
						<PasswordInput
							id="newPassword"
							name="newPassword"
							autocomplete="new-password"
							invalid={Boolean(passwordError)}
							describedBy={passwordError ? 'password-error' : undefined}
						/>
						{#if passwordError}<FieldError id="password-error">{passwordError}</FieldError>{/if}
					</Field>
				</FieldGroup>
				<p class="text-caption text-muted-foreground">
					Changing it signs you out on your other devices.
				</p>
				<div>
					<Button type="submit" class="h-11 px-5" disabled={pending !== null}>
						{#if pending === 'password'}<Spinner data-icon="inline-start" />{/if}
						Change password
					</Button>
				</div>
			</form>
		{:else}
			<p class="text-sm text-muted-foreground">
				You sign in with {data.connected.join(' or ') || 'a connected account'}, so there is no
				password to change here.
			</p>
		{/if}
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="connected-heading">
		<h2 id="connected-heading" class="text-lg font-medium">Connected accounts</h2>
		{#if data.connected.length > 0}
			<ul class="flex flex-col gap-2 text-sm">
				{#each data.connected as provider (provider)}
					<li class="flex items-center gap-2 rounded-lg border px-3 py-2.5">
						<BadgeCheckIcon class="size-4 text-success" aria-hidden="true" />
						{provider}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted-foreground">No Google or GitHub account is connected.</p>
		{/if}
		{#if data.connectable.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each data.connectable as option (option.id)}
					<Button
						type="button"
						variant="outline"
						class="h-11 px-4"
						disabled={linking !== null}
						onclick={() => connect(option.id)}
					>
						{#if linking === option.id}<Spinner data-icon="inline-start" />{/if}
						Connect {option.name}
					</Button>
				{/each}
			</div>
			<p class="text-caption text-muted-foreground">
				Connecting lets you sign in with that account too. It must use the same email address.
			</p>
		{/if}
	</section>

	{#if !data.emailEnabled}
		<p class="text-caption text-muted-foreground">
			Email verification and password reset emails are off because no email service is set up on
			this server.
		</p>
	{/if}
</div>
