<script lang="ts">
	import { authClient } from '#lib/auth-client.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import GithubIcon from './provider-icons/github-icon.svelte';
	import GoogleIcon from './provider-icons/google-icon.svelte';

	interface Props {
		google: boolean;
		github: boolean;
		callbackURL: string;
	}

	let { google, github, callbackURL }: Props = $props();

	let pending = $state<'google' | 'github' | null>(null);

	async function start(provider: 'google' | 'github') {
		pending = provider;
		await authClient.signIn.social({ provider, callbackURL });
		pending = null;
	}
</script>

{#if google || github}
	<div class="flex items-center gap-3 text-caption text-muted-foreground">
		<Separator class="flex-1" />
		or continue with
		<Separator class="flex-1" />
	</div>
	<div class="grid gap-3 {google && github ? 'grid-cols-2' : 'grid-cols-1'}">
		{#if google}
			<Button
				variant="outline"
				size="lg"
				class="gap-2.5"
				aria-label="Continue with Google"
				disabled={pending !== null}
				onclick={() => start('google')}
			>
				{#if pending === 'google'}<Spinner class="size-5" />{:else}<GoogleIcon />{/if}
				Google
			</Button>
		{/if}
		{#if github}
			<Button
				variant="outline"
				size="lg"
				class="gap-2.5"
				aria-label="Continue with GitHub"
				disabled={pending !== null}
				onclick={() => start('github')}
			>
				{#if pending === 'github'}<Spinner class="size-5" />{:else}<GithubIcon />{/if}
				GitHub
			</Button>
		{/if}
	</div>
{/if}
