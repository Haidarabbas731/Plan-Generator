<script lang="ts">
	import InboxIcon from '@lucide/svelte/icons/inbox';
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
</svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
	<h1 class="text-title">Your plans</h1>
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
