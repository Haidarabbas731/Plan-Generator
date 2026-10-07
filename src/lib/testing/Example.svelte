<script lang="ts">
	interface Props {
		label: string;
	}

	let { label }: Props = $props();
	let count = $state(0);
</script>

<button onclick={() => count++}>{label}: {count}</button>
