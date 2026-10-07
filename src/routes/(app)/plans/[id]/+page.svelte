<script lang="ts">
	import PlanView from '#lib/components/plans/plan-view.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.plan.title} · Plan Generator</title>
	<meta name="description" content="Your study plan, day by day." />
</svelte:head>

{#key data.plan.id}
	<PlanView plan={data.plan} blocks={data.blocks} days={data.days} />
{/key}
