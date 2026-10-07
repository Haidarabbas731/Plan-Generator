<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import type { Provider } from '#lib/providers.js';
	import { cn } from '#lib/utils.js';

	interface ProviderOption {
		id: Provider;
		name: string;
	}

	interface ModelOption {
		id: string;
		name: string;
	}

	interface Props {
		providers: ProviderOption[];
		provider: string;
		model: string;
		providerError?: string;
		modelError?: string;
	}

	let {
		providers,
		provider = $bindable(),
		model = $bindable(),
		providerError,
		modelError
	}: Props = $props();

	let open = $state(false);
	let models = $state.raw<ModelOption[]>([]);
	let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let message = $state('');
	let reloads = $state(0);

	const providerName = $derived(providers.find((option) => option.id === provider)?.name);
	const selectedName = $derived(models.find((option) => option.id === model)?.name ?? model);

	$effect(() => {
		const current = provider;
		const refresh = reloads > 0;
		if (!current) return;

		const controller = new AbortController();
		status = 'loading';
		message = '';
		models = [];

		const url = `/plans/new/models?provider=${encodeURIComponent(current)}${refresh ? '&refresh=1' : ''}`;

		fetch(url, { signal: controller.signal })
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
		model = id;
		open = false;
	}
</script>

<div class="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
	<div class="flex flex-col gap-2">
		<label for="provider-trigger" class="text-sm font-medium">Provider</label>
		<Select.Root
			type="single"
			name="provider"
			bind:value={provider}
			onValueChange={() => (model = '')}
		>
			<Select.Trigger
				id="provider-trigger"
				class="h-11 w-full text-base sm:text-sm"
				aria-invalid={providerError ? true : undefined}
				aria-describedby={providerError ? 'provider-error' : undefined}
			>
				{providerName ?? 'Choose a provider'}
			</Select.Trigger>
			<Select.Content>
				{#each providers as option (option.id)}
					<Select.Item value={option.id} label={option.name}>{option.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		{#if providerError}
			<p id="provider-error" role="alert" class="text-sm text-destructive">{providerError}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="model-trigger" class="text-sm font-medium">Model</label>
		{#if status === 'error'}
			<Input
				id="model-trigger"
				name="model"
				bind:value={model}
				placeholder="Type a model id"
				autocomplete="off"
				spellcheck="false"
				class="h-11"
				aria-invalid={modelError ? true : undefined}
				aria-describedby="model-note"
			/>
			<p id="model-note" class="text-sm text-muted-foreground">
				{message} Type the model id yourself, or
				<button
					type="button"
					class="font-medium text-primary underline-offset-4 hover:underline"
					onclick={() => reloads++}
				>
					try again
				</button>.
			</p>
		{:else}
			<input type="hidden" name="model" value={model} />
			<Popover.Root bind:open>
				<Popover.Trigger
					id="model-trigger"
					type="button"
					disabled={!provider || status === 'loading'}
					aria-invalid={modelError ? true : undefined}
					aria-describedby={modelError ? 'model-error' : undefined}
					class={cn(
						buttonVariants({ variant: 'outline' }),
						'h-11 w-full justify-between bg-card px-3 text-base font-normal sm:text-sm',
						!model && 'text-muted-foreground'
					)}
				>
					<span class="flex min-w-0 items-center gap-2">
						{#if status === 'loading'}<Spinner aria-label="Loading models" />{/if}
						<span class="truncate">
							{status === 'loading'
								? 'Loading models'
								: model
									? selectedName
									: provider
										? 'Choose a model'
										: 'Choose a provider first'}
						</span>
					</span>
					<ChevronsUpDownIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
				</Popover.Trigger>
				<Popover.Content class="w-(--bits-popover-anchor-width) min-w-72 p-0" align="start">
					<Command.Root>
						<Command.Input placeholder="Search models" />
						<Command.List class="max-h-64">
							<Command.Empty>No model found.</Command.Empty>
							{#each models as option (option.id)}
								<Command.Item
									value={`${option.name} ${option.id}`}
									onSelect={() => choose(option.id)}
								>
									<span class="flex min-w-0 flex-col">
										<span class="truncate">{option.name}</span>
										{#if option.name !== option.id}
											<span class="truncate text-caption text-muted-foreground">{option.id}</span>
										{/if}
									</span>
									{#if model === option.id}
										<CheckIcon class="ml-auto size-4 text-primary" aria-hidden="true" />
									{/if}
								</Command.Item>
							{/each}
						</Command.List>
					</Command.Root>
					<div class="flex items-center justify-between border-t px-3 py-2">
						<p class="text-caption text-muted-foreground">{models.length} models</p>
						<button
							type="button"
							class="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-caption font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
							onclick={() => reloads++}
						>
							<RefreshCwIcon class="size-3.5" aria-hidden="true" />
							Refresh
						</button>
					</div>
				</Popover.Content>
			</Popover.Root>
		{/if}
		{#if modelError}
			<p id="model-error" role="alert" class="text-sm text-destructive">{modelError}</p>
		{/if}
	</div>
</div>
