<script lang="ts">
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import { Button } from '#lib/components/ui/button/index.js';

	interface Props {
		visible: boolean;
		onclick: () => void;
	}

	let { visible, onclick }: Props = $props();
</script>

<div
	class="transition-opacity duration-(--dur-base) ease-(--ease-out) {visible
		? 'opacity-100'
		: 'pointer-events-none opacity-0'}"
	inert={!visible}
>
	<Button
		type="button"
		variant="ghost"
		size="sm"
		class="-ml-2 h-11 gap-1.5 px-2 text-muted-foreground"
		{onclick}
	>
		<RotateCcwIcon aria-hidden="true" />
		Replay
	</Button>
</div>
