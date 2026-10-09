<script lang="ts" module>
	import { LIMITS } from '#lib/limits.js';

	export const OTP_LENGTH = LIMITS.emailCodeLength;
	export type OtpStatus = 'idle' | 'verifying' | 'success' | 'error';
	const PASTE_STAGGER_MS = 30;
</script>

<script lang="ts">
	import { PinInput, REGEXP_ONLY_DIGITS } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	interface Props {
		value?: string;
		onComplete: (code: string) => void;
		status: OtpStatus;
		locked?: boolean;
		focusToken?: number;
		describedBy?: string;
	}

	let {
		value = $bindable(''),
		onComplete,
		status,
		locked = false,
		focusToken = 0,
		describedBy
	}: Props = $props();

	let inputRef = $state<HTMLInputElement | null>(null);
	let lastLength = 0;
	let batch = { from: 0, added: 0 };

	$effect(() => {
		void focusToken;
		inputRef?.focus();
	});

	$effect.pre(() => {
		const length = value.length;
		if (length > lastLength) batch = { from: lastLength, added: length - lastLength };
		lastLength = length;
	});

	const delayFor = (index: number) => {
		const { from, added } = batch;
		if (added < 2 || index < from || index >= from + added) return 0;
		return (index - from) * PASTE_STAGGER_MS;
	};
</script>

<div class={cn('flex justify-center', status === 'error' && 'shake-x')}>
	<PinInput.Root
		bind:value
		bind:inputRef
		maxlength={OTP_LENGTH}
		{onComplete}
		pattern={REGEXP_ONLY_DIGITS}
		pasteTransformer={(pasted) => pasted.replace(/\D/g, '')}
		readonly={status === 'verifying'}
		disabled={status === 'success' || locked}
		aria-label="{OTP_LENGTH}-digit verification code"
		aria-describedby={describedBy}
		aria-invalid={status === 'error'}
		class="flex items-center justify-center"
	>
		{#snippet children({ cells })}
			<div class="flex gap-1.5 min-[360px]:gap-2 sm:gap-3" aria-hidden="true">
				{#each cells as cell, index (index)}
					<PinInput.Cell {cell}>
						{#snippet child({ props })}
							<div
								{...props}
								data-active={cell.isActive}
								class={cn(
									'keycap relative flex h-14 w-10 items-center justify-center rounded-xl border bg-card text-2xl font-semibold tabular-nums min-[360px]:w-11 sm:h-16 sm:w-12',
									status === 'success'
										? 'border-success/60 text-success'
										: status === 'error'
											? 'border-destructive/60 text-destructive'
											: [
													'text-foreground',
													cell.isActive
														? 'border-foreground/40 ring-2 ring-ring/25'
														: 'border-border'
												],
									(status === 'verifying' || locked) && 'opacity-70'
								)}
							>
								{#if cell.char}
									{#key cell.char}
										<span class="keycap-glyph" style:--keycap-delay="{delayFor(index)}ms">
											{cell.char}
										</span>
									{/key}
								{/if}
								{#if cell.hasFakeCaret}
									<span class="keycap-caret absolute h-6 w-px bg-foreground"></span>
								{/if}
							</div>
						{/snippet}
					</PinInput.Cell>
				{/each}
			</div>
		{/snippet}
	</PinInput.Root>
</div>
