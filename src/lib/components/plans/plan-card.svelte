<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { PROVIDER_INFO } from '#lib/providers.js';
	import type { PlanSummary } from '#lib/plan-types.js';
	import ProgressRing from './progress-ring.svelte';

	interface Props {
		plan: Pick<
			PlanSummary,
			| 'id'
			| 'title'
			| 'topicTag'
			| 'status'
			| 'provider'
			| 'model'
			| 'updatedAt'
			| 'daysDone'
			| 'daysTotal'
		>;
	}

	let { plan }: Props = $props();

	const ratio = $derived(plan.daysTotal === 0 ? 0 : plan.daysDone / plan.daysTotal);
	const updated = $derived(
		new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(plan.updatedAt)
	);
	const statusLabel = $derived(
		plan.status === 'generating'
			? 'Writing'
			: plan.status === 'paused'
				? 'Paused'
				: plan.status === 'failed'
					? 'Needs attention'
					: null
	);
</script>

<a
	href="/plans/{plan.id}"
	class="flex min-h-11 pressable items-center gap-4 rounded-lg border bg-card p-4 text-card-foreground outline-none hover:border-ring/50 focus-visible:ring-3 focus-visible:ring-ring/40"
>
	<ProgressRing value={ratio} label="{plan.title} progress" />
	<div class="flex min-w-0 flex-1 flex-col gap-1.5">
		<h2 class="truncate text-heading">{plan.title}</h2>
		<p class="truncate text-caption text-muted-foreground">
			<span class="tabular-nums">{plan.daysDone} of {plan.daysTotal} days</span>
			· {PROVIDER_INFO[plan.provider].name} · {plan.model} · {updated}
		</p>
		{#if plan.topicTag || statusLabel}
			<div class="flex flex-wrap items-center gap-1.5">
				{#if plan.topicTag}
					<Badge variant="secondary">{plan.topicTag}</Badge>
				{/if}
				{#if statusLabel}
					<Badge variant={plan.status === 'failed' ? 'destructive' : 'outline'}>
						{statusLabel}
					</Badge>
				{/if}
			</div>
		{/if}
	</div>
</a>
