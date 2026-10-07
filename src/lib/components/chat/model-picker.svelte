<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { cn } from '#lib/utils.js';

	interface ProviderGroup {
		provider: string;
		models: string[];
	}

	interface Props {
		value: string;
		disabled?: boolean;
		class?: string;
	}

	let { value = $bindable(), disabled = false, class: className }: Props = $props();

	let open = $state(false);

	const groups: ProviderGroup[] = [
		{
			provider: 'Google Gemini',
			models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
		},
		{
			provider: 'OpenRouter',
			models: ['anthropic/claude-sonnet-5-5', 'openai/gpt-5', 'deepseek/deepseek-v3.2']
		},
		{ provider: 'Anthropic', models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5'] }
	];

	function choose(model: string) {
		value = model;
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		{disabled}
		aria-label={`Model: ${value}. Change model`}
		class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'max-w-52 gap-1.5 px-2', className)}
	>
		<span class="truncate text-caption font-medium">{value}</span>
		<ChevronsUpDownIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
	</Popover.Trigger>
	<Popover.Content class="w-80 p-0" align="start" side="top">
		<Command.Root>
			<Command.Input placeholder="Search models" />
			<Command.List class="max-h-64">
				<Command.Empty>No model found.</Command.Empty>
				{#each groups as group (group.provider)}
					<Command.Group heading={group.provider}>
						{#each group.models as model (model)}
							<Command.Item value={`${group.provider} ${model}`} onSelect={() => choose(model)}>
								<span class="truncate">{model}</span>
								{#if value === model}
									<CheckIcon class="ml-auto size-4 text-primary" aria-hidden="true" />
								{/if}
							</Command.Item>
						{/each}
					</Command.Group>
				{/each}
				<Command.Group heading="OpenAI">
					<Command.Item value="openai add key" disabled class="text-muted-foreground">
						<KeyRoundIcon aria-hidden="true" /> Add an OpenAI key in settings
					</Command.Item>
				</Command.Group>
			</Command.List>
		</Command.Root>
		<p class="border-t px-3 py-2 text-caption text-muted-foreground">
			Applies to this whole plan, including blocks still being written.
		</p>
	</Popover.Content>
</Popover.Root>
