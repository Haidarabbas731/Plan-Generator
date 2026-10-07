<script lang="ts">
	import HistoryIcon from '@lucide/svelte/icons/history';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import type { RevisionSource } from '#lib/plan-types.js';
	import { cn } from '#lib/utils.js';

	interface RevisionItem {
		id: string;
		number: number;
		source: RevisionSource;
		summary: string | null;
		createdAt: string;
	}

	interface Props {
		planId: string;
		currentRevision: number;
		disabled?: boolean;
		restoring?: boolean;
		class?: string;
		onrestore: (number: number) => void;
	}

	let {
		planId,
		currentRevision,
		disabled = false,
		restoring = false,
		class: className,
		onrestore
	}: Props = $props();

	const SOURCE_LABEL: Record<RevisionSource, string> = {
		generation: 'Generated',
		chat: 'Chat edit',
		restore: 'Restored'
	};

	let open = $state(false);
	let items = $state.raw<RevisionItem[]>([]);
	let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let confirming = $state<number | null>(null);

	const time = new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});

	$effect(() => {
		if (!open) {
			confirming = null;
			return;
		}
		void currentRevision;
		const controller = new AbortController();
		status = 'loading';
		fetch(`/plans/${planId}/revisions`, { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error('failed');
				const body = (await response.json()) as { revisions: RevisionItem[] };
				items = body.revisions;
				status = 'ready';
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === 'AbortError') return;
				status = 'error';
			});
		return () => controller.abort();
	});

	function restore(number: number) {
		if (confirming !== number) {
			confirming = number;
			return;
		}
		confirming = null;
		open = false;
		onrestore(number);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		{disabled}
		type="button"
		aria-label="Revision history"
		class={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'size-9', className)}
	>
		<HistoryIcon aria-hidden="true" />
	</Popover.Trigger>
	<Popover.Content class="w-80 p-0" align="end">
		<div class="border-b px-3 py-2.5">
			<p class="text-sm font-medium">History</p>
			<p class="text-caption text-muted-foreground">Every change to the plan, newest first.</p>
		</div>
		<div class="max-h-72 overflow-y-auto p-1.5">
			{#if status === 'loading'}
				<div class="flex flex-col gap-2 p-1.5" aria-hidden="true">
					<Skeleton class="h-10 w-full" />
					<Skeleton class="h-10 w-full" />
				</div>
			{:else if status === 'error'}
				<p class="px-3 py-6 text-center text-sm text-muted-foreground">
					Could not load the history.
				</p>
			{:else}
				<ul class="flex flex-col">
					{#each items as item (item.id)}
						<li class="flex items-start gap-2 rounded-md px-2 py-2">
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="truncate text-sm font-medium">
									{item.summary ?? SOURCE_LABEL[item.source]}
								</span>
								<span class="text-caption text-muted-foreground">
									<span class="tabular-nums">#{item.number}</span> · {SOURCE_LABEL[item.source]} ·
									{time.format(new Date(item.createdAt))}
								</span>
							</div>
							{#if item.number === currentRevision}
								<span class="mt-1 shrink-0 text-caption font-medium text-muted-foreground"
									>Current</span
								>
							{:else}
								<Button
									type="button"
									variant={confirming === item.number ? 'destructive' : 'ghost'}
									size="sm"
									class="h-8 shrink-0 px-2.5"
									disabled={restoring}
									onclick={() => restore(item.number)}
								>
									{confirming === item.number ? 'Confirm' : 'Restore'}
								</Button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<p class="border-t px-3 py-2 text-caption text-muted-foreground">
			Restoring keeps the days you have completed.
		</p>
	</Popover.Content>
</Popover.Root>
