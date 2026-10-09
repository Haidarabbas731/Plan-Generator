<script lang="ts">
	import { tick } from 'svelte';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
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
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import type { ChatState } from '#lib/client/chat.svelte.js';
	import { isCoarsePointer } from '#lib/client/pointer.js';
	import type { PlanStatus } from '#lib/plan-types.js';
	import type { Provider } from '#lib/providers.js';
	import ChatMessage from './chat-message.svelte';
	import ChatSwitcher from './chat-switcher.svelte';
	import PlanModelPicker from './plan-model-picker.svelte';
	import RevisionHistory from './revision-history.svelte';
	import { LIMITS } from '#lib/limits.js';
	import { chatSuggestions } from '#lib/chat-suggestions.js';

	const DEFAULT_SUGGESTIONS = chatSuggestions({ daysTotal: 30, blockSize: 5 });

	interface Props {
		planId: string;
		planStatus: PlanStatus;
		provider: Provider;
		model: string;
		providers: { id: Provider; name: string }[];
		aiLeft?: number | null;
		suggestions?: string[];
		currentRevision: number;
		chat: ChatState | null;
		loadError?: string | null;
		pending?: 'undo' | 'restore' | 'model' | null;
		actionError?: string | null;
		layout?: 'panel' | 'sheet';
		compact?: boolean;
		oncomposerfocus?: () => void;
		showClose?: boolean;
		onclose?: () => void;
		oncollapse?: () => void;
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
		suggestions = DEFAULT_SUGGESTIONS,
		currentRevision,
		chat,
		loadError = null,
		pending = null,
		actionError = null,
		layout = 'panel',
		compact = false,
		oncomposerfocus,
		showClose = false,
		onclose,
		oncollapse,
		onmodel,
		onundo,
		onrestore,
		onretry
	}: Props = $props();

	const blockedReason = $derived(
		planStatus === 'generating'
			? 'The plan is still being written. Chat opens when it is done or paused.'
			: providers.length === 0
				? 'Add an AI key in Settings to chat about this plan.'
				: null
	);
	const aiHint = $derived(
		aiLeft === null || aiLeft > LIMITS.lowAiLeft
			? null
			: aiLeft === 0
				? 'No AI requests left this hour.'
				: `${aiLeft} AI ${aiLeft === 1 ? 'request' : 'requests'} left this hour.`
	);
	const lastMessage = $derived(chat?.messages[chat.messages.length - 1] ?? null);
	const waiting = $derived(
		chat?.busy === true &&
			(lastMessage?.role === 'user' ||
				lastMessage?.parts.every((part) =>
					part.type === 'text' ? !part.text : !part.type.startsWith('tool-')
				))
	);
	const empty = $derived(chat !== null && chat.messages.length === 0);
	let composer = $state<HTMLTextAreaElement | null>(null);

	function newChat() {
		if (!chat?.startNew()) return;
		if (!isCoarsePointer()) void tick().then(() => composer?.focus());
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (blockedReason) return;
		chat?.send();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		if (isCoarsePointer()) return;
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

{#snippet sendControl()}
	{#if chat?.busy}
		<Button
			type="button"
			size="icon"
			class="size-11 shrink-0 rounded-full"
			aria-label="Stop"
			onclick={() => chat.stop()}
		>
			<SquareIcon aria-hidden="true" />
		</Button>
	{:else}
		<Button
			type="submit"
			size="icon"
			class="size-11 shrink-0 rounded-full"
			aria-label="Send"
			disabled={!chat?.canSend || blockedReason !== null}
		>
			<ArrowUpIcon aria-hidden="true" />
		</Button>
	{/if}
{/snippet}

<section aria-label="Chat about this plan" class="flex h-full min-h-0 flex-col bg-background">
	<header
		class="items-center gap-1 px-3 py-2 {compact ? 'hidden' : 'flex'} {layout === 'panel'
			? 'border-b'
			: ''}"
	>
		{#if chat}
			<h2 class="sr-only">Ask about this plan</h2>
			<ChatSwitcher {chat} />
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class="size-9 shrink-0"
				aria-label="New chat"
				title={chat.busy ? 'Wait for the reply to finish' : undefined}
				disabled={!chat.canSwitch || chat.fresh}
				onclick={newChat}
			>
				<PlusIcon aria-hidden="true" />
			</Button>
		{:else}
			<h2 class="min-w-0 flex-1 truncate text-sm font-semibold">Ask about this plan</h2>
		{/if}
		<RevisionHistory
			{planId}
			{currentRevision}
			disabled={planStatus === 'generating'}
			restoring={pending === 'restore'}
			{onrestore}
		/>
		{#if layout === 'sheet' && oncollapse}
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				class="size-9"
				aria-label="Collapse chat"
				onclick={oncollapse}
			>
				<ChevronDownIcon aria-hidden="true" />
			</Button>
		{:else if showClose}
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

	<div class="flex min-h-0 flex-1 flex-col {compact ? 'hidden' : ''}">
		{#if loadError}
			<div class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
				<p class="text-sm text-muted-foreground">{loadError}</p>
				{#if onretry}<Button type="button" variant="outline" onclick={onretry}>Try again</Button
					>{/if}
			</div>
		{:else if chat === null}
			<div class="flex flex-1 flex-col gap-4 p-4" aria-hidden="true">
				<Skeleton class="h-10 w-2/3" />
				<Skeleton class="ml-auto h-10 w-1/2" />
				<Skeleton class="h-16 w-4/5" />
			</div>
		{:else}
			{#key chat.conversationId}
				<Conversation
					class="min-h-0 flex-1 animate-in fade-in-0 [animation-duration:var(--dur-fast)]"
					aria-label="Conversation"
					aria-busy={chat?.busy ?? false}
				>
					<ConversationContent class="flex-1 gap-5 overflow-y-auto overscroll-contain">
						{#if empty}
							<div class="flex flex-col gap-4 py-2">
								<div class="flex items-start gap-3">
									<span
										class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"
									>
										<SparklesIcon class="size-4" aria-hidden="true" />
									</span>
									<p class="pt-1.5 text-sm text-muted-foreground">
										Ask a question, or ask for a change. Every change can be undone.
									</p>
								</div>
								{#if layout === 'panel'}
									<div class="flex flex-col gap-2">
										{#each suggestions as suggestion (suggestion)}
											<button
												type="button"
												class="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm outline-none surface-flat hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
												disabled={blockedReason !== null || chat.busy}
												onclick={() => chat.send(suggestion)}
											>
												<SparklesIcon class="size-4 shrink-0 text-primary" aria-hidden="true" />
												{suggestion}
											</button>
										{/each}
									</div>
								{/if}
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
						{#if waiting}
							<div class="flex items-center gap-1.5 py-1" role="status">
								<span class="sr-only">Thinking</span>
								{#each [0, 1, 2] as dot (dot)}
									<span
										class="typing-dot size-1.5 rounded-full bg-muted-foreground"
										style="--i: {dot}"
										aria-hidden="true"
									></span>
								{/each}
							</div>
						{/if}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>
			{/key}
		{/if}
	</div>

	<div
		class="flex flex-col gap-2 p-3 {compact ? 'pt-0' : ''} {layout === 'panel' ? 'border-t' : ''}"
	>
		{#if !compact}
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
			{#if layout === 'sheet' && empty && chat}
				<div class="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
					{#each suggestions as suggestion (suggestion)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							class="h-9 shrink-0 rounded-full"
							disabled={blockedReason !== null || chat.busy}
							onclick={() => chat.send(suggestion)}
						>
							{suggestion}
						</Button>
					{/each}
				</div>
			{/if}
		{/if}
		<form
			class="rounded-2xl border border-input bg-card p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 {compact
				? 'flex items-center gap-1'
				: ''}"
			onsubmit={submit}
		>
			<Textarea
				bind:ref={composer}
				bind:value={() => chat?.input ?? '', (value) => chat && (chat.input = value)}
				{onkeydown}
				onfocus={oncomposerfocus}
				rows={1}
				disabled={chat === null || blockedReason !== null}
				placeholder={blockedReason ? 'Chat is unavailable' : 'Ask or request a change'}
				name="message"
				aria-label="Message"
				class="max-h-32 min-h-11 border-0 bg-transparent px-2 py-2.5 text-base shadow-none focus-visible:ring-0 sm:text-sm dark:bg-transparent {compact
					? 'flex-1'
					: ''}"
			/>
			{#if compact}
				{@render sendControl()}
			{:else}
				<div class="flex items-center justify-between gap-2 pt-1">
					<PlanModelPicker
						{providers}
						{provider}
						{model}
						disabled={planStatus === 'generating' || chat?.busy === true || providers.length === 0}
						disabledReason="Pause the plan or wait for the reply before switching the model"
						onselect={onmodel}
						class="h-9 rounded-full border border-input bg-background px-3"
					/>
					{@render sendControl()}
				</div>
			{/if}
		</form>
	</div>
</section>
