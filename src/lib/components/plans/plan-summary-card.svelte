<script lang="ts">
	import type { PlanSummary } from '#lib/plan-summary.js';

	interface Props {
		summary: PlanSummary | null;
		daysTotal: number | null;
		providerName?: string;
	}

	let { summary, daysTotal, providerName }: Props = $props();
</script>

<section
	aria-label="Plan summary"
	class="flex flex-col gap-1 rounded-lg border bg-accent/50 p-4 text-sm"
>
	{#if summary}
		<p class="font-medium text-accent-foreground">
			<span class="tabular-nums">{daysTotal}</span> sessions ·
			<span class="tabular-nums">{summary.totalHours}</span> hours in total ·
			<span class="tabular-nums">{summary.weeks}</span>
			{summary.weeks === 1 ? 'week' : 'weeks'}
		</p>
		<p class="text-muted-foreground">
			Ends {summary.end}. Written in <span class="tabular-nums">{summary.blocks}</span>
			{summary.blocks === 1 ? 'block' : 'blocks'}, about
			<span class="tabular-nums">{summary.calls}</span> calls on your {providerName ??
				'AI provider'} key.
		</p>
	{:else}
		<p class="text-muted-foreground">Fill in the numbers above to see the size of your plan.</p>
	{/if}
</section>
