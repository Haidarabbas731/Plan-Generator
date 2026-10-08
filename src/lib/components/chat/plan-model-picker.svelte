<script lang="ts">
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import ModelOptionRow from '#lib/components/shared/model-option-row.svelte';
	import { filterModels, type ModelOption } from '#lib/model-options.js';
	import { PROVIDER_INFO, type Provider } from '#lib/providers.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		providers: { id: Provider; name: string }[];
		provider: Provider;
		model: string;
		disabled?: boolean;
		disabledReason?: string;
		label?: string;
		variant?: 'ghost' | 'outline';
		class?: string;
		onselect: (provider: Provider, model: string) => void;
	}

	let {
		providers,
		provider,
		model,
		disabled = false,
		disabledReason,
		label,
		variant = 'ghost',
		class: className,
		onselect
	}: Props = $props();

	let open = $state(false);
	let viewing = $state<Provider | null>(null);
	let models = $state.raw<ModelOption[]>([]);
	let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let message = $state('');
	let query = $state('');

	const shown = $derived(viewing ?? provider);
	const visible = $derived(filterModels(models, query));
	const hasPrices = $derived(models.some((option) => option.pricing !== undefined));

	$effect(() => {
		if (!open) return;
		const current = shown;
		const controller = new AbortController();
		status = 'loading';
		message = '';
		models = [];

		fetch(`/plans/new/models?provider=${encodeURIComponent(current)}`, {
			signal: controller.signal
		})
			.then(async (response) => {
				const body = (await response.json()) as
					{ ok: true; models: ModelOption[] } | { ok: false; message: string };
				if (body.ok) {
					models = body.models;
					status = 'ready';
				} else {
					message = body.message;
					status = 'error';
				}
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === 'AbortError') return;
				message = 'Could not load the model list.';
				status = 'error';
			});

		return () => controller.abort();
	});

	function choose(id: string) {
		open = false;
		viewing = null;
		if (id === model && shown === provider) return;
		onselect(shown, id);
	}

	$effect(() => {
		if (!open) query = '';
	});
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		{disabled}
		type="button"
		title={disabled ? disabledReason : undefined}
		aria-label={`Model: ${model}. Change model`}
		class={cn(buttonVariants({ variant, size: 'sm' }), 'max-w-48 gap-1.5 px-2', className)}
	>
		<span class="truncate text-caption font-medium">{label ?? model}</span>
		<ChevronsUpDownIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
	</Popover.Trigger>
	<Popover.Content class="w-80 p-0" align="end">
		{#if providers.length > 1}
			<div class="flex flex-wrap gap-1 border-b p-2" role="group" aria-label="Provider">
				{#each providers as option (option.id)}
					<button
						type="button"
						class="min-h-8 rounded-md px-2.5 text-caption font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 aria-pressed:bg-accent aria-pressed:text-accent-foreground"
						aria-pressed={shown === option.id}
						onclick={() => (viewing = option.id)}
					>
						{option.name}
					</button>
				{/each}
			</div>
		{/if}
		<Command.Root disableInitialScroll shouldFilter={false}>
			<Command.Input
				bind:value={query}
				placeholder={hasPrices
					? `Search ${PROVIDER_INFO[shown].name} models, or type free`
					: `Search ${PROVIDER_INFO[shown].name} models`}
			/>
			<Command.List class="max-h-64">
				{#if status === 'loading'}
					<div class="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
						<Spinner aria-label="Loading models" /> Loading models
					</div>
				{:else if status === 'error'}
					<p class="px-3 py-6 text-center text-sm text-muted-foreground">{message}</p>
				{:else}
					{#if visible.length === 0}
						<p class="px-3 py-6 text-center text-sm text-muted-foreground">No model found.</p>
					{/if}
					{#each visible as option (option.id)}
						<Command.Item value={`${option.name} ${option.id}`} onSelect={() => choose(option.id)}>
							<ModelOptionRow {option} selected={option.id === model && shown === provider} />
						</Command.Item>
					{/each}
				{/if}
			</Command.List>
		</Command.Root>
		<p class="border-t px-3 py-2 text-caption text-muted-foreground">
			Applies to this whole plan, including blocks still being written.
			{#if status === 'ready' && !hasPrices}
				<a
					href={PROVIDER_INFO[shown].pricingUrl}
					target="_blank"
					rel="noreferrer"
					class="underline-offset-4 hover:underline"
				>
					See {PROVIDER_INFO[shown].name} pricing
				</a>
			{/if}
		</p>
	</Popover.Content>
</Popover.Root>
