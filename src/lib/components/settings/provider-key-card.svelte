<script lang="ts">
	import { enhance } from '$app/forms';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { toast } from 'svelte-sonner';
	import type { Provider } from '#lib/providers.js';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Field, FieldDescription, FieldLabel } from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';

	interface Props {
		provider: {
			id: Provider;
			name: string;
			keyUrl: string;
			key: { last4: string; updatedAt: Date } | null;
		};
		error?: string;
	}

	let { provider, error }: Props = $props();

	type Action = 'save' | 'test' | 'remove';

	let pending = $state<Action | null>(null);
	let removeOpen = $state(false);

	const connected = $derived(provider.key !== null);
	const saved = $derived(
		provider.key
			? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(provider.key.updatedAt)
			: ''
	);

	function submit(action: Action) {
		return () => {
			pending = action;
			return async ({
				result,
				update
			}: {
				result: { type: string; data?: Record<string, unknown> };
				update: (options?: { reset?: boolean }) => Promise<void>;
			}) => {
				await update({ reset: action === 'save' && result.type === 'success' });
				pending = null;
				if (action === 'remove') removeOpen = false;
				if (result.type === 'success' && typeof result.data?.message === 'string') {
					toast.success(result.data.message);
				}
			};
		};
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex flex-col gap-1">
			<Card.Title class="text-heading"><h3>{provider.name}</h3></Card.Title>
			<a
				href={provider.keyUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="-my-3 inline-flex w-fit items-center gap-1 py-3 text-caption text-primary underline-offset-4 hover:underline"
			>
				Get a key
				<ExternalLinkIcon class="size-3" aria-hidden="true" />
				<span class="sr-only">(opens in a new tab)</span>
			</a>
		</div>
		<Card.Action>
			{#if provider.key}
				<Badge variant="secondary">
					<CheckIcon class="text-success" data-icon="inline-start" aria-hidden="true" />
					Connected · ••••{provider.key.last4}
				</Badge>
			{:else}
				<Badge variant="outline">Not connected</Badge>
			{/if}
		</Card.Action>
	</Card.Header>

	<Card.Content class="flex flex-col gap-4">
		<form method="POST" action="?/save" use:enhance={submit('save')}>
			<input type="hidden" name="provider" value={provider.id} />
			<Field data-invalid={error ? true : undefined}>
				<FieldLabel for="key-{provider.id}">
					{connected ? 'Replace key' : 'API key'}<span class="sr-only"
						>{` for ${provider.name}`}</span
					>
				</FieldLabel>
				<div class="flex gap-2">
					<Input
						id="key-{provider.id}"
						name="apiKey"
						type="password"
						autocomplete="off"
						spellcheck={false}
						placeholder={connected ? 'Paste a new key' : 'Paste your key'}
						aria-invalid={error ? true : undefined}
						aria-describedby="key-{provider.id}-hint{error ? ` key-${provider.id}-error` : ''}"
					/>
					<Button type="submit" disabled={pending !== null}>
						{#if pending === 'save'}<Spinner data-icon="inline-start" />{/if}
						{connected ? 'Replace' : 'Save'}
					</Button>
				</div>
				<FieldDescription id="key-{provider.id}-hint">
					{#if connected}
						Saved {saved}. The key is never shown again.
					{:else}
						Stored encrypted. Only the last four characters are ever shown.
					{/if}
				</FieldDescription>
				{#if error}
					<p id="key-{provider.id}-error" role="alert" class="text-sm text-destructive">
						{error}
					</p>
				{/if}
			</Field>
		</form>

		{#if connected}
			<div class="flex flex-wrap gap-2">
				<form method="POST" action="?/test" use:enhance={submit('test')}>
					<input type="hidden" name="provider" value={provider.id} />
					<Button type="submit" variant="outline" disabled={pending !== null}>
						{#if pending === 'test'}<Spinner data-icon="inline-start" />{/if}
						Test key
					</Button>
				</form>

				<form
					id="remove-{provider.id}"
					method="POST"
					action="?/remove"
					use:enhance={submit('remove')}
				>
					<input type="hidden" name="provider" value={provider.id} />
				</form>
				<AlertDialog.Root bind:open={removeOpen}>
					<AlertDialog.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" disabled={pending !== null}>Remove</Button>
						{/snippet}
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>Remove your {provider.name} key?</AlertDialog.Title>
							<AlertDialog.Description>
								Plans that use {provider.name} stop generating until you add a key again. Your saved plans
								are not affected.
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel>Keep key</AlertDialog.Cancel>
							<AlertDialog.Action type="submit" form="remove-{provider.id}">
								{#if pending === 'remove'}<Spinner data-icon="inline-start" />{/if}
								Remove key
							</AlertDialog.Action>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
