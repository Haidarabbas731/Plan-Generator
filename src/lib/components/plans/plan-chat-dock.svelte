<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { ChatState } from '#lib/client/chat.svelte.js';
	import { CHAT_WIDTH, maxChatWidth } from '#lib/client/chat-width.js';
	import type { ChatDock } from '#lib/client/chat-dock.svelte.js';
	import ChatPanel from '#lib/components/chat/chat-panel.svelte';
	import ChatSheet from '#lib/components/chat/chat-sheet.svelte';
	import type { ChatUIMessage } from '#lib/chat-types.js';
	import type { PlanDetail, PlanStatus } from '#lib/plan-types.js';
	import type { Provider } from '#lib/providers.js';

	interface Props {
		dock: ChatDock;
		plan: PlanDetail;
		status: PlanStatus;
		providers: { id: Provider; name: string }[];
		aiLeft: number;
	}

	let { dock, plan, status, providers, aiLeft }: Props = $props();

	let chat = $state.raw<ChatState | null>(null);
	let chatLoadError = $state<string | null>(null);
	let chatPending = $state<'undo' | 'restore' | 'model' | null>(null);
	let chatActionError = $state<string | null>(null);
	let mounted = $state(false);
	let present = $state(false);
	let closing = $state(false);

	let undoForm = $state<HTMLFormElement | null>(null);
	let undoRevisionId = $state('');
	let restoreForm = $state<HTMLFormElement | null>(null);
	let restoreNumber = $state('');
	let modelForm = $state<HTMLFormElement | null>(null);
	let modelProvider = $state('');
	let modelName = $state('');

	onMount(() => {
		mounted = true;
	});

	async function loadChat() {
		chatLoadError = null;
		try {
			const response = await fetch(`/plans/${plan.id}/chat`);
			if (!response.ok) throw new Error('failed');
			const body = (await response.json()) as {
				conversationId: string | null;
				messages: ChatUIMessage[];
			};
			chat = new ChatState({
				planId: plan.id,
				conversationId: body.conversationId,
				initial: body.messages,
				onFinished: () => {
					void invalidate(`plan:${plan.id}`);
				}
			});
		} catch {
			chatLoadError = 'Could not load the conversation.';
		}
	}

	$effect(() => {
		if (dock.docked) {
			present = true;
			closing = false;
		} else if (untrack(() => present)) {
			closing = true;
		}
	});

	function finishClose(event: AnimationEvent) {
		if (!closing || event.target !== event.currentTarget) return;
		present = false;
		closing = false;
	}

	const showSheet = $derived(mounted && !dock.desktop.current && status !== 'generating');

	$effect(() => {
		if ((dock.open || showSheet) && !chat) untrack(() => void loadChat());
	});

	const chatAction =
		(kind: 'undo' | 'restore' | 'model'): SubmitFunction =>
		() => {
			chatPending = kind;
			chatActionError = null;
			return async ({ result, update }) => {
				if (result.type === 'failure') {
					const data = result.data as { message?: string } | undefined;
					chatActionError = data?.message ?? 'That did not work. Try again.';
				}
				await update({ reset: false });
				chatPending = null;
			};
		};

	function undoChange(revisionId: string) {
		undoRevisionId = revisionId;
		queueMicrotask(() => undoForm?.requestSubmit());
	}

	function restoreRevision(number: number) {
		restoreNumber = String(number);
		queueMicrotask(() => restoreForm?.requestSubmit());
	}

	function switchModel(provider: Provider, model: string) {
		modelProvider = provider;
		modelName = model;
		queueMicrotask(() => modelForm?.requestSubmit());
	}
</script>

{#snippet chatPanel(layout: 'panel' | 'sheet', compact: boolean)}
	<ChatPanel
		planId={plan.id}
		planStatus={status}
		provider={plan.provider}
		model={plan.model}
		{providers}
		{aiLeft}
		currentRevision={plan.currentRevision}
		{chat}
		loadError={chatLoadError}
		pending={chatPending}
		actionError={chatActionError}
		{layout}
		{compact}
		showClose={layout === 'panel'}
		oncollapse={() => dock.sheet.collapse()}
		oncomposerfocus={() => dock.sheet.composerFocused()}
		onclose={() => (dock.open = false)}
		onmodel={switchModel}
		onundo={undoChange}
		onrestore={restoreRevision}
		onretry={loadChat}
	/>
{/snippet}

{#if present}
	<aside
		id="plan-chat"
		class="fixed top-14 right-0 bottom-0 z-30 border-l bg-background transition-none {closing
			? 'animate-out fade-out-0 [animation-duration:var(--dur-fast)] slide-out-to-right-6'
			: 'animate-in fade-in-0 [animation-duration:var(--dur-base)] slide-in-from-right-6'}"
		style:width="{dock.width}px"
		onanimationend={finishClose}
	>
		<div
			role="slider"
			aria-orientation="horizontal"
			aria-label="Chat width"
			aria-valuetext="{dock.width} pixels wide"
			aria-valuemin={CHAT_WIDTH.min}
			aria-valuemax={maxChatWidth(dock.viewportWidth)}
			aria-valuenow={dock.width}
			tabindex="0"
			class="group absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none justify-center outline-none"
			onpointerdown={(event) => dock.startResize(event)}
			onpointermove={(event) => dock.resize(event)}
			onpointerup={(event) => dock.endResize(event)}
			onpointercancel={(event) => dock.endResize(event)}
			onkeydown={(event) => dock.resizeKey(event)}
			ondblclick={() => dock.resetWidth()}
		>
			<span
				class="w-0.5 rounded-full bg-transparent transition-colors duration-(--dur-fast) group-hover:bg-ring/60 group-focus-visible:bg-ring {dock.dragging
					? 'bg-ring'
					: ''}"
			></span>
		</div>
		{@render chatPanel('panel', false)}
	</aside>
{/if}

{#snippet sheetPanel(compact: boolean)}
	{@render chatPanel('sheet', compact)}
{/snippet}

{#if showSheet}
	<ChatSheet sheet={dock.sheet} panel={sheetPanel} />
{/if}

<form bind:this={undoForm} method="POST" action="?/undo" hidden use:enhance={chatAction('undo')}>
	<input type="hidden" name="revisionId" value={undoRevisionId} />
</form>

<form
	bind:this={restoreForm}
	method="POST"
	action="?/restore"
	hidden
	use:enhance={chatAction('restore')}
>
	<input type="hidden" name="number" value={restoreNumber} />
</form>

<form bind:this={modelForm} method="POST" action="?/model" hidden use:enhance={chatAction('model')}>
	<input type="hidden" name="provider" value={modelProvider} />
	<input type="hidden" name="model" value={modelName} />
</form>
