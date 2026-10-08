<script lang="ts">
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';

	export interface OutlineItem {
		idx: number;
		theme: string;
		startDay: number;
		endDay: number;
		done: number;
		total: number;
		written: boolean;
		current: boolean;
	}

	interface Props {
		items: OutlineItem[];
		onselect: (idx: number) => void;
	}

	let { items, onselect }: Props = $props();
</script>

<nav
	aria-label="Plan outline"
	class="sticky top-20 hidden max-h-[calc(100dvh-7rem)] flex-col gap-1 self-start overflow-y-auto xl:flex"
>
	<p class="px-3 pb-1 text-caption font-medium text-muted-foreground">Outline</p>
	<ol class="flex flex-col">
		{#each items as item (item.idx)}
			<li>
				<button
					type="button"
					class="relative flex min-h-11 w-full flex-col items-start justify-center gap-0.5 rounded-md px-3 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 {item.current
						? 'bg-accent/50 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary'
						: ''}"
					aria-current={item.current ? 'location' : undefined}
					onclick={() => onselect(item.idx)}
				>
					<span class="flex w-full items-center gap-2 text-sm font-medium">
						<span class="min-w-0 flex-1 truncate">{item.theme}</span>
						{#if item.written && item.total > 0 && item.done === item.total}
							<CircleCheckIcon class="size-3.5 shrink-0 text-success" aria-label="All days done" />
						{/if}
					</span>
					<span class="flex items-center gap-1.5 text-caption text-muted-foreground tabular-nums">
						<span>Days {item.startDay}–{item.endDay}</span>
						{#if item.written}
							<span aria-hidden="true">·</span>
							<span>{item.done}/{item.total}</span>
						{/if}
					</span>
				</button>
			</li>
		{/each}
	</ol>
</nav>
