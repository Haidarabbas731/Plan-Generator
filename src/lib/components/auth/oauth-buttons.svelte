<script lang="ts">
	import { authClient } from '#lib/auth-client.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';

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
	<div class="flex flex-col gap-3">
		{#if google}
			<Button
				variant="outline"
				size="lg"
				disabled={pending !== null}
				onclick={() => start('google')}
			>
				Continue with Google
			</Button>
		{/if}
		{#if github}
			<Button
				variant="outline"
				size="lg"
				disabled={pending !== null}
				onclick={() => start('github')}
			>
				Continue with GitHub
			</Button>
		{/if}
	</div>
	<div class="flex items-center gap-3 text-caption text-muted-foreground">
		<Separator class="flex-1" />
		or
		<Separator class="flex-1" />
	</div>
{/if}
