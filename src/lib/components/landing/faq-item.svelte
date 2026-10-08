<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '#lib/components/ui/collapsible/index.js';
	import { createDisclosureMode } from '#lib/disclosure.svelte.js';
	import type { FaqEntry } from '#lib/landing-content.js';

	interface Props {
		entry: FaqEntry;
		index: number;
	}

	let { entry, index }: Props = $props();

	const mode = createDisclosureMode();
</script>

<li data-reveal-item style:--reveal-i={index + 1} style:--reveal-step="45ms">
	<Collapsible>
		<CollapsibleTrigger
			class="group flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset"
			onkeydown={mode.onkeydown}
			onpointerdown={mode.onpointerdown}
		>
			<span class="flex-1 font-medium">{entry.question}</span>
			<ChevronDownIcon
				class="size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-fast) ease-(--ease-out) group-data-[state=open]:rotate-180"
				aria-hidden="true"
			/>
		</CollapsibleTrigger>
		<CollapsibleContent data-instant={mode.instant ? '' : undefined}>
			<p class="px-5 pb-5 text-sm text-muted-foreground">{entry.answer}</p>
		</CollapsibleContent>
	</Collapsible>
</li>
