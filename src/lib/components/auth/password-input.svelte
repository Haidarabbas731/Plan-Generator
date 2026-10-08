<script lang="ts">
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import {
		InputGroup,
		InputGroupAddon,
		InputGroupButton,
		InputGroupInput
	} from '#lib/components/ui/input-group/index.js';

	interface Props {
		id: string;
		name?: string;
		autocomplete: 'current-password' | 'new-password';
		invalid?: boolean;
		describedBy?: string;
	}

	let { id, name = 'password', autocomplete, invalid = false, describedBy }: Props = $props();

	let visible = $state(false);
</script>

<InputGroup>
	<InputGroupInput
		{id}
		{name}
		{autocomplete}
		type={visible ? 'text' : 'password'}
		required
		aria-invalid={invalid}
		aria-describedby={describedBy}
	/>
	<InputGroupAddon align="inline-end">
		<InputGroupButton
			size="icon-xs"
			class="relative after:absolute after:-inset-3 after:content-['']"
			aria-label={visible ? 'Hide password' : 'Show password'}
			aria-pressed={visible}
			onclick={() => (visible = !visible)}
		>
			{#if visible}
				<EyeOffIcon aria-hidden="true" />
			{:else}
				<EyeIcon aria-hidden="true" />
			{/if}
		</InputGroupButton>
	</InputGroupAddon>
</InputGroup>
