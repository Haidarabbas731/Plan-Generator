<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldLabel
	} from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';

	interface Props extends Pick<
		HTMLInputAttributes,
		'inputmode' | 'min' | 'max' | 'step' | 'maxlength' | 'placeholder'
	> {
		id: string;
		type?: 'text' | 'number' | 'date';
		label: string;
		value?: string | number | null;
		error?: string;
		note?: string;
	}

	let { id, label, type = 'text', value = $bindable(), error, note, ...rest }: Props = $props();

	const describedBy = $derived(error ? `${id}-error` : note ? `${id}-note` : undefined);
</script>

<Field data-invalid={error ? true : undefined}>
	<FieldLabel for={id}>{label}</FieldLabel>
	<Input
		{id}
		name={id}
		{type}
		bind:value
		class="h-11 text-base sm:text-sm"
		aria-invalid={error ? true : undefined}
		aria-describedby={describedBy}
		{...rest}
	/>
	{#if error}
		<FieldError id="{id}-error">{error}</FieldError>
	{:else if note}
		<FieldDescription id="{id}-note">{note}</FieldDescription>
	{/if}
</Field>
