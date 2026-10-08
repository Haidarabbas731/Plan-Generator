<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { formatDate, plural } from '#lib/format.js';
	import { LIMITS } from '#lib/limits.js';
	import { PROVIDER_INFO, type Provider } from '#lib/providers.js';
	import DeletePlanDialog from './delete-plan-dialog.svelte';

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
	let goalOpen = $state(false);

	const goalLong = $derived(goal.length > LIMITS.goalPreviewChars);

	const percent = $derived(total === 0 ? 0 : Math.round((done / total) * 100));
</script>

<header class="flex flex-col gap-4">
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 flex-col gap-2">
			{#if topicTag}
				<Badge variant="secondary" class="w-fit" title={topicTag}>
					<span class="truncate">{topicTag}</span>
				</Badge>
			{/if}
			<h1 class="line-clamp-4 text-title max-sm:text-[1.5rem]" {title}>{title}</h1>
		</div>
		<div class="flex shrink-0 items-center gap-1">
			{#if onchat}
				<Button
					type="button"
					variant={chatOpen ? 'secondary' : 'outline'}
					class="h-11 shrink-0 gap-2 px-3.5 max-lg:hidden"
					aria-expanded={chatOpen}
					aria-controls="plan-chat"
					onclick={onchat}
				>
					<SparklesIcon aria-hidden="true" />
					Ask AI
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
					<DropdownMenu.Label class="flex flex-col gap-0.5 font-normal">
						<span class="text-caption text-muted-foreground">Written by</span>
						<span class="truncate text-sm font-medium">
							{PROVIDER_INFO[provider].name} · {model}
						</span>
					</DropdownMenu.Label>
					<DropdownMenu.Separator />
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

	<div class="flex flex-col gap-1">
		<p id="plan-goal" class="text-muted-foreground {goalLong && !goalOpen ? 'line-clamp-3' : ''}">
			{goal}
		</p>
		{#if goalLong}
			<button
				type="button"
				class="min-h-11 self-start text-caption font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
				aria-expanded={goalOpen}
				aria-controls="plan-goal"
				onclick={() => (goalOpen = !goalOpen)}
			>
				{goalOpen ? 'Show less' : 'Show more'}
			</button>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground">
			<span class="tabular-nums">{done} of {total} {plural(total, 'day', 'days')} done</span>
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
		</div>
		<div class="flex items-center gap-3">
			<Progress
				value={percent}
				class="h-1.5 min-w-0 flex-1"
				aria-label="Plan progress, {percent} percent"
			/>
			<span class="shrink-0 text-caption font-medium tabular-nums" aria-hidden="true"
				>{percent}%</span
			>
		</div>
	</div>
</header>

<DeletePlanDialog bind:open={deleteOpen} {title} />
