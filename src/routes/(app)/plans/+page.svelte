<script lang="ts">
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import {
		Empty,
		EmptyDescription,
		EmptyHeader,
		EmptyMedia,
		EmptyTitle
	} from '#lib/components/ui/empty/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Your plans · Plan Generator</title>
	<meta name="description" content="Your saved study plans and progress." />
</svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
	<h1 class="text-title">Your plans</h1>
	{#if !data.hasKeys}
		<Alert>
			<KeyRoundIcon aria-hidden="true" />
			<AlertTitle>Connect your AI key</AlertTitle>
			<AlertDescription>
				Plans are written with your own AI key.
				<a
					href="/settings/keys"
					class="font-medium text-primary underline-offset-4 hover:underline"
				>
					Add a key
				</a>
			</AlertDescription>
		</Alert>
	{/if}
	<Empty class="border">
		<EmptyHeader>
			<EmptyMedia variant="icon"><InboxIcon /></EmptyMedia>
			<EmptyTitle>No plans yet</EmptyTitle>
			<EmptyDescription>
				Hi {data.user?.name}. Plan creation arrives in the next phase.
			</EmptyDescription>
		</EmptyHeader>
	</Empty>
</div>
