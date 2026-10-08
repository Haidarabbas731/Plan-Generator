<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import { getPasswordStrength, PASSWORD_REQUIREMENTS, STRENGTH_LABELS } from '#lib/password.js';

	interface Props {
		password: string;
	}

	let { password }: Props = $props();

	let last = '';

	const empty = $derived(password === '');
	const shown = $derived.by(() => {
		if (password) last = password;
		return last;
	});
	const strength = $derived(getPasswordStrength(shown));
	const fill = $derived(
		strength >= 3 ? 'bg-success' : strength === 2 ? 'bg-warning' : 'bg-destructive'
	);
</script>

<div
	class="grid transition-[grid-template-rows,opacity] duration-(--dur-base) ease-(--ease-out) {empty
		? 'grid-rows-[0fr] opacity-0'
		: 'grid-rows-[1fr] opacity-100'}"
	inert={empty}
	aria-hidden={empty}
>
	<div class="min-h-0 overflow-hidden">
		<div class="mt-3 flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
			<div class="flex items-center gap-3">
				<div class="flex flex-1 gap-1" aria-hidden="true">
					{#each [1, 2, 3, 4] as level (level)}
						<div
							class="h-1.5 flex-1 rounded-full bg-border transition-colors duration-(--dur-fast) ease-(--ease-out) {level <=
							strength
								? fill
								: ''}"
						></div>
					{/each}
				</div>
				<span role="status" class="text-caption font-medium">{STRENGTH_LABELS[strength]}</span>
			</div>
			<ul class="grid gap-1.5 sm:grid-cols-2">
				{#each PASSWORD_REQUIREMENTS as requirement (requirement.id)}
					{@const met = requirement.test(shown)}
					<li
						class="flex items-center gap-2 text-caption transition-colors duration-(--dur-fast) ease-(--ease-out) {met
							? 'text-success'
							: 'text-muted-foreground'}"
					>
						{#if met}
							<CheckIcon class="size-3.5 shrink-0" aria-hidden="true" />
						{:else}
							<XIcon class="size-3.5 shrink-0" aria-hidden="true" />
						{/if}
						{requirement.label}
						<span class="sr-only">{met ? 'met' : 'not met'}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
