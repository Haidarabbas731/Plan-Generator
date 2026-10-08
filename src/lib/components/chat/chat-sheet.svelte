<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ChatSheet } from '#lib/client/chat-sheet.svelte.js';

	interface Props {
		sheet: ChatSheet;
		panel: Snippet<[boolean]>;
	}

	let { sheet, panel }: Props = $props();
</script>

<aside
	id="plan-chat"
	{@attach sheet.attach}
	class="fixed inset-x-0 z-40 flex flex-col overflow-hidden rounded-t-2xl pb-[env(safe-area-inset-bottom)] surface-floating lg:hidden"
	style:height="{sheet.height}px"
	style:bottom="{sheet.bottomOffset}px"
	style:border-bottom-width="0"
	style="contain: layout paint style"
>
	<div
		role="slider"
		aria-orientation="vertical"
		aria-label="Resize chat"
		aria-valuetext={sheet.label}
		aria-valuemin={Math.round(sheet.stops.peek)}
		aria-valuemax={Math.round(sheet.stops.large)}
		aria-valuenow={Math.round(sheet.height)}
		tabindex="0"
		class="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset active:cursor-grabbing"
		onpointerdown={(event) => sheet.down(event)}
		onpointermove={(event) => sheet.move(event)}
		onpointerup={(event) => sheet.up(event)}
		onpointercancel={(event) => sheet.up(event)}
		onkeydown={(event) => sheet.keydown(event)}
	>
		<span class="h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true"></span>
	</div>
	<div class="min-h-0 flex-1">
		{@render panel(sheet.compact)}
	</div>
</aside>
