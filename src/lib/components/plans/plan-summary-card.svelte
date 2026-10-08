<script lang="ts">
	import { plural } from '#lib/format.js';
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
	class="flex flex-col gap-1 rounded-xl bg-accent/50 p-4 text-sm surface-flat"
>
	{#if summary}
		<p class="font-medium text-accent-foreground">
			<span class="tabular-nums">{daysTotal}</span>
			{plural(daysTotal ?? 0, 'session', 'sessions')} ·
			<span class="tabular-nums">{summary.totalHours}</span>
			{plural(summary.totalHours, 'hour', 'hours')} in total ·
			<span class="tabular-nums">{summary.weeks}</span>
			{plural(summary.weeks, 'week', 'weeks')}
		</p>
		<p class="text-muted-foreground">
			Ends {summary.end}. Written in <span class="tabular-nums">{summary.blocks}</span>
			{plural(summary.blocks, 'block', 'blocks')}, about
			<span class="tabular-nums">{summary.calls}</span>
			{plural(summary.calls, 'call', 'calls')} on your {providerName ?? 'AI provider'} key.
		</p>
	{:else}
		<p class="text-muted-foreground">Fill in the numbers to see the size of your plan.</p>
	{/if}
</section>
