<script lang="ts">
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import SquareIcon from '@lucide/svelte/icons/square';
	import XIcon from '@lucide/svelte/icons/x';
	import {
		Conversation,
		ConversationContent,
		ConversationScrollButton
	} from '#lib/components/ai-elements/conversation/index.js';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import type { ChatState } from '#lib/client/chat.svelte.js';
	import type { PlanStatus } from '#lib/plan-types.js';
	import type { Provider } from '#lib/providers.js';
	import ChatMessage from './chat-message.svelte';
	import PlanModelPicker from './plan-model-picker.svelte';
	import RevisionHistory from './revision-history.svelte';

	interface Props {
		planId: string;
		planStatus: PlanStatus;
		provider: Provider;
		model: string;
		providers: { id: Provider; name: string }[];
		aiLeft?: number | null;
		currentRevision: number;
		chat: ChatState | null;
		loadError?: string | null;
		pending?: 'undo' | 'restore' | 'model' | null;
		actionError?: string | null;
		showClose?: boolean;
		onclose?: () => void;
		onmodel: (provider: Provider, model: string) => void;
		onundo: (revisionId: string) => void;
		onrestore: (number: number) => void;
		onretry?: () => void;
	}

	let {
		planId,
		planStatus,
		provider,
		model,
		providers,
		aiLeft = null,
		currentRevision,
		chat,
		loadError = null,
		pending = null,
		actionError = null,
		showClose = false,
		onclose,
		onmodel,
		onundo,
		onrestore,
		onretry
	}: Props = $props();

	const SUGGESTIONS = ['Make block 2 easier', 'I only have weekends now', 'Explain day 4'];

	const blockedReason = $derived(
		planStatus === 'generating'
			? 'The plan is still being written. Chat opens when it is done or paused.'
			: providers.length === 0
				? 'Add an AI key in Settings to chat about this plan.'
				: null
	);
	const LOW_AI_LEFT = 5;
	const aiHint = $derived(
		aiLeft === null || aiLeft > LOW_AI_LEFT
			? null
			: aiLeft === 0
				? 'No AI requests left this hour.'
				: `${aiLeft} AI ${aiLeft === 1 ? 'request' : 'requests'} left this hour.`
	);
	const lastMessage = $derived(chat?.messages[chat.messages.length - 1] ?? null);
	const waiting = $derived(chat?.status === 'submitted');
	const empty = $derived(chat !== null && chat.messages.length === 0);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (blockedReason) return;
		chat?.send();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		event.preventDefault();
		if (!blockedReason) chat?.send();
	}

	function updateBlocks(blocks: number[]) {
		if (blockedReason || blocks.length === 0) return;
		const range =
			blocks.length === 1
				? `block ${blocks[0]}`
				: `blocks ${blocks[0]}–${blocks[blocks.length - 1]}`;
		chat?.send(`Update ${range} so they fit the change you just made.`);
	}
</script>

<section aria-label="Chat about this plan" class="flex h-full min-h-0 flex-col bg-background">
	<header class="flex items-center gap-1 border-b px-3 py-2">
		<h2 class="min-w-0 flex-1 truncate text-sm font-semibold">Ask about this plan</h2>
		<RevisionHistory
			{planId}
			{currentRevision}
			disabled={planStatus === 'generating'}
			restoring={pending === 'restore'}
			{onrestore}
		/>
		<PlanModelPicker
			{providers}
			{provider}
			{model}
			disabled={planStatus === 'generating' || chat?.busy === true || providers.length === 0}
			disabledReason="Pause the plan or wait for the reply before switching the model"
			onselect={onmodel}
		/>
		{#if showClose}
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class="size-9"
				aria-label="Close chat"
				onclick={onclose}
			>
				<XIcon aria-hidden="true" />
			</Button>
		{/if}
	</header>

	{#if loadError}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
			<p class="text-sm text-muted-foreground">{loadError}</p>
			{#if onretry}<Button type="button" variant="outline" onclick={onretry}>Try again</Button>{/if}
		</div>
	{:else if chat === null}
		<div class="flex flex-1 flex-col gap-4 p-4" aria-hidden="true">
			<Skeleton class="h-10 w-2/3" />
			<Skeleton class="ml-auto h-10 w-1/2" />
			<Skeleton class="h-16 w-4/5" />
		</div>
	{:else}
		<Conversation class="min-h-0 flex-1" aria-label="Conversation" aria-busy={chat?.busy ?? false}>
			<ConversationContent class="flex-1 gap-5 overflow-y-auto overscroll-contain">
				{#if empty}
					<div class="flex flex-col gap-3 py-2">
						<p class="text-sm text-muted-foreground">
							Ask a question, or ask for a change. Every change can be undone.
						</p>
						<div class="flex flex-wrap gap-2">
							{#each SUGGESTIONS as suggestion (suggestion)}
								<Button
									type="button"
									variant="outline"
									size="sm"
									class="h-9"
									disabled={blockedReason !== null || chat.busy}
									onclick={() => chat.send(suggestion)}
								>
									{suggestion}
								</Button>
							{/each}
						</div>
					</div>
				{/if}
				{#each chat.messages as message, i (message.id)}
					<ChatMessage
						{message}
						streaming={chat.busy && i === chat.messages.length - 1}
						undoableRevisionId={planStatus !== 'generating' &&
						chat.lastRevisionNumber === currentRevision
							? chat.lastRevisionId
							: null}
						undoing={pending === 'undo'}
						{onundo}
						onupdate={updateBlocks}
					/>
				{/each}
				{#if waiting && lastMessage?.role === 'user'}
					<div class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
						<Spinner class="size-4" aria-label="Thinking" /> Thinking
					</div>
				{/if}
			</ConversationContent>
			<ConversationScrollButton />
		</Conversation>
	{/if}

	<div class="flex flex-col gap-2 border-t p-3">
		{#if blockedReason}
			<p class="text-caption text-muted-foreground" role="status">{blockedReason}</p>
		{/if}
		{#if aiHint && !blockedReason}
			<p class="text-caption text-muted-foreground" role="status">{aiHint}</p>
		{/if}
		{#if chat?.error}
			<Alert variant="destructive" role="alert">
				<AlertDescription class="flex items-start justify-between gap-2">
					<span>{chat.error}</span>
					<button
						type="button"
						class="shrink-0 text-caption font-medium underline-offset-4 hover:underline"
						onclick={() => chat.dismissError()}
					>
						Dismiss
					</button>
				</AlertDescription>
			</Alert>
		{/if}
		{#if actionError}
			<p class="text-caption text-destructive" role="alert">{actionError}</p>
		{/if}
		<form class="flex items-end gap-2" onsubmit={submit}>
			<Textarea
				bind:value={() => chat?.input ?? '', (value) => chat && (chat.input = value)}
				{onkeydown}
				rows={1}
				disabled={chat === null || blockedReason !== null}
				placeholder={blockedReason ? 'Chat is unavailable' : 'Ask or request a change'}
				name="message"
				aria-label="Message"
				class="max-h-32 min-h-11 flex-1 resize-none text-base sm:text-sm"
			/>
			{#if chat?.busy}
				<Button
					type="button"
					size="icon"
					class="size-11 shrink-0"
					aria-label="Stop"
					onclick={() => chat.stop()}
				>
					<SquareIcon aria-hidden="true" />
				</Button>
			{:else}
				<Button
					type="submit"
					size="icon"
					class="size-11 shrink-0"
					aria-label="Send"
					disabled={!chat?.canSend || blockedReason !== null}
				>
					<ArrowUpIcon aria-hidden="true" />
				</Button>
			{/if}
		</form>
	</div>
</section>
