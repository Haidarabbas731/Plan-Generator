<script lang="ts">
	import { page } from '$app/state';
	import AuthShell from '#lib/components/auth/auth-shell.svelte';
	import GettingStartedPanel from '#lib/components/auth/panels/getting-started-panel.svelte';
	import RecoveryPanel from '#lib/components/auth/panels/recovery-panel.svelte';
	import VerifyPanel from '#lib/components/auth/panels/verify-panel.svelte';
	import WelcomeBackPanel from '#lib/components/auth/panels/welcome-back-panel.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const panelKey = $derived(
		page.route.id === '/(auth)/login'
			? 'welcome'
			: page.route.id === '/(auth)/signup'
				? 'start'
				: page.route.id === '/(auth)/verify-email'
					? 'verify'
					: 'recovery'
	);
</script>

<AuthShell {panelKey}>
	{#snippet panel()}
		{#if panelKey === 'welcome'}
			<WelcomeBackPanel />
		{:else if panelKey === 'start'}
			<GettingStartedPanel />
		{:else if panelKey === 'verify'}
			<VerifyPanel minutes={data.codeMinutes} />
		{:else}
			<RecoveryPanel minutes={data.resetMinutes} />
		{/if}
	{/snippet}
	{@render children()}
</AuthShell>
