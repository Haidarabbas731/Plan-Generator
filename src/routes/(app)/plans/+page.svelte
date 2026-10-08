<script lang="ts">
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { toast } from 'svelte-sonner';
	import DeletePlanDialog from '#lib/components/plans/delete-plan-dialog.svelte';
	import PlanCard from '#lib/components/plans/plan-card.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import {
		Empty,
		EmptyContent,
		EmptyDescription,
		EmptyHeader,
		EmptyMedia,
		EmptyTitle
	} from '#lib/components/ui/empty/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let query = $state('');
	let pendingDelete = $state<{ id: string; title: string } | null>(null);
	let deleteOpen = $state(false);

	const NEAR_LIMIT_RATIO = 0.8;
	const nearLimit = $derived(data.plans.length >= data.planLimit * NEAR_LIMIT_RATIO);

	const filtered = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return data.plans;
		return data.plans.filter((plan) =>
			[plan.title, plan.topicTag ?? '', plan.model].some((text) =>
				text.toLowerCase().includes(needle)
			)
		);
	});
</script>

<svelte:head>
	<title>Your plans · Plan Generator</title>
	<meta name="description" content="Your saved study plans and progress." />
</svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-title">Your plans</h1>
			{#if nearLimit}
				<p class="text-sm text-muted-foreground" role="status">
					<span class="tabular-nums">{data.plans.length}</span> of
					<span class="tabular-nums">{data.planLimit}</span> plans. Delete one you no longer need to make
					room.
				</p>
			{/if}
		</div>
		<a href="/plans/new" class={buttonVariants({ class: 'h-11 px-4' })}>
			<PlusIcon aria-hidden="true" />
			New plan
		</a>
	</div>

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

	{#if data.plans.length === 0}
		<Empty class="reveal border">
			<EmptyHeader>
				<EmptyMedia variant="icon"><InboxIcon /></EmptyMedia>
				<EmptyTitle>No plans yet</EmptyTitle>
				<EmptyDescription>
					Describe a goal and get a day-by-day plan you can follow.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<a href="/plans/new" class={buttonVariants({ class: 'h-11 px-4' })}>
					Create your first plan
				</a>
			</EmptyContent>
		</Empty>
	{:else}
		<div class="relative">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<Input
				type="search"
				bind:value={query}
				placeholder="Search your plans"
				aria-label="Search your plans"
				class="h-11 pl-9"
			/>
		</div>

		{#if filtered.length === 0}
			<p class="py-8 text-center text-muted-foreground">No plans match “{query.trim()}”.</p>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each filtered as plan, i (plan.id)}
					<li class="reveal" style="--reveal-i: {Math.min(i, 5)}">
						<PlanCard
							{plan}
							ondelete={() => {
								pendingDelete = { id: plan.id, title: plan.title };
								deleteOpen = true;
							}}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

{#if pendingDelete}
	<DeletePlanDialog
		bind:open={deleteOpen}
		title={pendingDelete.title}
		planId={pendingDelete.id}
		ondeleted={() => toast.success('Plan deleted')}
	/>
{/if}
