<script lang="ts">
	interface Props {
		value: number;
		size?: number;
		label: string;
		class?: string;
	}

	let { value, size = 44, label, class: className }: Props = $props();

	const stroke = 4;
	const radius = $derived((size - stroke) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const clamped = $derived(Math.min(1, Math.max(0, value)));
	const percent = $derived(Math.round(clamped * 100));
</script>

<span
	class="relative inline-flex shrink-0 items-center justify-center {className ?? ''}"
	style="width: {size}px; height: {size}px"
	role="img"
	aria-label="{label}, {percent} percent"
>
	<svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90" aria-hidden="true">
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="currentColor"
			stroke-width={stroke}
			class="text-muted"
		/>
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="currentColor"
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={circumference * (1 - clamped)}
			class="text-primary transition-[stroke-dashoffset] duration-(--dur-sheet) ease-(--ease-out)"
		/>
	</svg>
	<span class="absolute text-caption font-semibold tabular-nums" aria-hidden="true">
		{percent}
	</span>
</span>
