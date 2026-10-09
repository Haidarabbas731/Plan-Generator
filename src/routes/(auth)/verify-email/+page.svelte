<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import { toast } from 'svelte-sonner';
	import { authClient } from '#lib/auth-client.js';
	import AuthCard from '#lib/components/auth/auth-card.svelte';
	import OtpInput, { type OtpStatus } from '#lib/components/auth/otp-input.svelte';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { ResendCountdown } from '#lib/client/resend-countdown.svelte.js';
	import type { PageProps } from './$types';

	const SUCCESS_BEAT_MS = 650;
	const ERROR_BEAT_MS = 450;

	let { data }: PageProps = $props();

	const countdown = new ResendCountdown();

	let code = $state('');
	let status = $state<OtpStatus>('idle');
	let message = $state<string | null>(null);
	let locked = $state(false);
	let resending = $state(false);
	let focusToken = $state(0);
	const timers: ReturnType<typeof setTimeout>[] = [];

	onMount(() => {
		countdown.start(data.wait);
		return () => {
			countdown.destroy();
			for (const timer of timers) clearTimeout(timer);
		};
	});

	const later = (ms: number, run: () => void) => void timers.push(setTimeout(run, ms));

	const MESSAGES: Record<string, string> = {
		INVALID_OTP: "That code isn't right. Check the email and try again.",
		OTP_EXPIRED: 'That code has expired. Send a new one.',
		TOO_MANY_ATTEMPTS: 'Too many wrong codes. Send a new code to try again.'
	};

	async function verify(entered: string) {
		status = 'verifying';
		message = null;
		const { error } = await authClient.emailOtp.verifyEmail({ email: data.email, otp: entered });
		if (!error) {
			status = 'success';
			later(SUCCESS_BEAT_MS, () => void goto(data.next, { invalidateAll: true }));
			return;
		}
		message = MESSAGES[error.code ?? ''] ?? "We couldn't check that code. Try again.";
		if (error.code === 'TOO_MANY_ATTEMPTS' || error.code === 'OTP_EXPIRED') locked = true;
		status = 'error';
		later(ERROR_BEAT_MS, () => {
			code = '';
			status = 'idle';
			focusToken += 1;
		});
	}

	function onChange() {
		if (message && !locked && status === 'idle') message = null;
	}
</script>

<svelte:head>
	<title>Check your email · Plan Generator</title>
	<meta name="description" content="Enter the code we emailed you to finish signing up." />
</svelte:head>

<AuthCard
	title="Check your email"
	description="Enter the 6-digit code we sent to {data.email}."
	align="center"
>
	<div class="flex flex-col items-center gap-3">
		<div oninput={onChange} role="presentation" class="w-full">
			<OtpInput
				bind:value={code}
				onComplete={verify}
				{status}
				{locked}
				{focusToken}
				describedBy="otp-message"
			/>
		</div>

		<div
			id="otp-message"
			aria-live="polite"
			class="flex min-h-6 items-center justify-center text-sm"
		>
			{#if status === 'success'}
				<p class="flex items-center gap-2 text-success">
					<CircleCheckIcon class="size-4" aria-hidden="true" />
					Email verified. Opening Plan Generator…
				</p>
			{:else if status === 'verifying'}
				<p class="flex items-center gap-2 text-muted-foreground">
					<Spinner class="size-4" /> Checking your code…
				</p>
			{:else if message}
				<p role="alert" class="text-destructive">{message}</p>
			{/if}
		</div>
	</div>

	<div class="flex flex-col items-center gap-2 text-sm text-muted-foreground">
		<form
			method="POST"
			action="?/resend&email={encodeURIComponent(data.email)}&next={encodeURIComponent(data.next)}"
			use:enhance={() => {
				resending = true;
				return async ({ result, update }) => {
					if (result.type === 'success') {
						const retry = (result.data as { retryAfter?: number } | undefined)?.retryAfter;
						countdown.start(retry ?? 60);
						code = '';
						locked = false;
						message = null;
						status = 'idle';
						focusToken += 1;
						toast.success('New code sent');
					} else if (result.type === 'failure') {
						const failure = result.data as { message?: string; retryAfter?: number } | undefined;
						if (failure?.retryAfter) countdown.start(failure.retryAfter);
						toast.error(failure?.message ?? 'We could not send a new code. Try again.');
					}
					await update({ reset: false, invalidateAll: false });
					resending = false;
				};
			}}
		>
			<input type="hidden" name="email" value={data.email} />
			{#if countdown.remaining > 0}
				<p>
					Send a new code in
					<span class="text-foreground tabular-nums">{countdown.remaining}</span> seconds
				</p>
			{:else}
				<p>
					Didn't get it?
					<button
						type="submit"
						disabled={resending || status === 'success'}
						class="font-medium text-primary underline underline-offset-4 disabled:opacity-60"
					>
						{resending ? 'Sending…' : 'Send a new code'}
					</button>
				</p>
			{/if}
		</form>
	</div>

	{#snippet footer()}
		Wrong address?
		<a href="/signup" class="font-medium text-primary underline-offset-4 hover:underline">
			Start again
		</a>
	{/snippet}
</AuthCard>
