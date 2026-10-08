<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import type { PlanSummary } from '#lib/plan-types.js';
	import { plural } from '#lib/format.js';
	import { PROVIDER_INFO } from '#lib/providers.js';
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
		ondelete: () => void;
	}

	let { plan, ondelete }: Props = $props();

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

<div
	class="relative flex min-h-11 pressable-within items-center gap-4 rounded-lg surface-interactive p-4 text-card-foreground surface-raised"
>
	<ProgressRing value={ratio} size={52} label="{plan.title} progress" />
	<div class="flex min-w-0 flex-1 flex-col gap-1.5">
		<h2 class="line-clamp-2 text-heading">
			<a
				href="/plans/{plan.id}"
				title={plan.title}
				class="outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-ring/40"
			>
				{plan.title}
			</a>
		</h2>
		<p class="text-caption text-muted-foreground">
			<span class="tabular-nums"
				>{plan.daysDone} of {plan.daysTotal} {plural(plan.daysTotal, 'day', 'days')}</span
			>
			· Updated {updated}
		</p>
		<div
			class="flex flex-wrap items-center gap-1.5 {plan.topicTag || statusLabel
				? ''
				: 'max-sm:hidden'}"
		>
			{#if statusLabel}
				<Badge variant={plan.status === 'failed' ? 'destructive' : 'outline'}>
					{statusLabel}
				</Badge>
			{/if}
			{#if plan.topicTag}
				<Badge variant="secondary" title={plan.topicTag}>
					<span class="truncate">{plan.topicTag}</span>
				</Badge>
			{/if}
			<Badge variant="outline" class="hidden max-w-full min-w-0 justify-start sm:inline-flex">
				<span class="truncate">{PROVIDER_INFO[plan.provider].name} · {plan.model}</span>
			</Badge>
		</div>
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			aria-label="Actions for {plan.title}"
			class={buttonVariants({
				variant: 'ghost',
				size: 'icon',
				class: 'relative z-10 size-11 shrink-0'
			})}
		>
			<EllipsisIcon aria-hidden="true" />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="min-w-56">
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a {...props} href="/plans/{plan.id}/export/markdown" download>
						<DownloadIcon aria-hidden="true" />
						Export Markdown
					</a>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a {...props} href="/plans/{plan.id}/export/ics" download>
						<CalendarIcon aria-hidden="true" />
						Export calendar (ICS)
					</a>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item variant="destructive" onSelect={ondelete}>
				<TrashIcon aria-hidden="true" />
				Delete plan
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
