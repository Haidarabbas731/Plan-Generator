<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { formatDate } from '#lib/format.js';
	import { PROVIDER_INFO, type Provider } from '#lib/providers.js';
	import DeletePlanDialog from './delete-plan-dialog.svelte';
	import ProgressRing from './progress-ring.svelte';

	interface Props {
		id: string;
		title: string;
		goal: string;
		topicTag: string | null;
		provider: Provider;
		model: string;
		startDate: string;
		done: number;
		total: number;
		streak: number;
		chatOpen?: boolean;
		onchat?: () => void;
	}

	let {
		id,
		title,
		goal,
		topicTag,
		provider,
		model,
		startDate,
		done,
		total,
		streak,
		chatOpen = false,
		onchat
	}: Props = $props();

	let deleteOpen = $state(false);

	const ratio = $derived(total === 0 ? 0 : done / total);
</script>

<header class="flex flex-col gap-4 sm:flex-row sm:items-start">
	<div class="flex items-center justify-between sm:contents">
		<ProgressRing value={ratio} size={64} label="{title} progress" />
		<div class="flex items-center gap-1 sm:order-last">
			{#if onchat}
				<Button
					type="button"
					variant={chatOpen ? 'secondary' : 'outline'}
					class="h-11 shrink-0 pressable gap-2 px-3.5"
					aria-expanded={chatOpen}
					aria-controls="plan-chat"
					onclick={onchat}
				>
					<MessageSquareIcon aria-hidden="true" />
					Ask
				</Button>
			{/if}

			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					aria-label="Plan actions"
					class={buttonVariants({ variant: 'ghost', size: 'icon', class: 'size-11 shrink-0' })}
				>
					<EllipsisIcon aria-hidden="true" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="min-w-56">
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<a {...props} href="/plans/{id}/export/markdown" download>
								<DownloadIcon aria-hidden="true" />
								Export Markdown
							</a>
						{/snippet}
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<a {...props} href="/plans/{id}/export/ics" download>
								<CalendarIcon aria-hidden="true" />
								Export calendar (ICS)
							</a>
						{/snippet}
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item variant="destructive" onSelect={() => (deleteOpen = true)}>
						<TrashIcon aria-hidden="true" />
						Delete plan
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
	<div class="flex min-w-0 flex-1 flex-col gap-2">
		<h1 class="text-title">{title}</h1>
		<p class="text-muted-foreground">{goal}</p>
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground">
			<span class="tabular-nums">{done} of {total} days done</span>
			{#if streak > 0}
				<span class="inline-flex items-center gap-1 font-medium text-highlight">
					<FlameIcon class="size-3.5" aria-hidden="true" />
					<span class="tabular-nums">{streak}</span>
					{streak === 1 ? 'day' : 'days'} in a row
				</span>
			{/if}
			<span class="inline-flex items-center gap-1">
				<CalendarIcon class="size-3.5" aria-hidden="true" />
				Starts {formatDate(startDate, 'date')}
			</span>
			<Badge variant="outline" class="max-w-full min-w-0 justify-start">
				<span class="truncate">{PROVIDER_INFO[provider].name} · {model}</span>
			</Badge>
			{#if topicTag}<Badge variant="secondary">{topicTag}</Badge>{/if}
		</div>
	</div>
</header>

<DeletePlanDialog bind:open={deleteOpen} {title} />
