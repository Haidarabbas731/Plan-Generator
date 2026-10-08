<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { describePricing, isFreeModel, type ModelOption } from '#lib/model-options.js';

	interface Props {
		option: ModelOption;
		selected?: boolean;
	}

	let { option, selected = false }: Props = $props();

	const free = $derived(isFreeModel(option));
	const price = $derived(free ? null : describePricing(option));
</script>

<span class="flex min-w-0 flex-1 flex-col">
	<span class="truncate">{option.name}</span>
	{#if option.name !== option.id}
		<span class="truncate text-caption text-muted-foreground">{option.id}</span>
	{/if}
	{#if price}
		<span class="truncate text-caption text-muted-foreground tabular-nums">{price}</span>
	{/if}
</span>
{#if free}
	<Badge variant="secondary">Free</Badge>
{/if}
{#if selected}
	<CheckIcon class="ml-auto size-4 text-primary" aria-hidden="true" />
{/if}
