<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { ChatState } from '#lib/client/chat.svelte.js';
	import { CHAT_WIDTH, maxChatWidth } from '#lib/client/chat-width.js';
	import type { ChatDock } from '#lib/client/chat-dock.svelte.js';
	import { dragToDismiss } from '#lib/client/drag-dismiss.js';
	import ChatPanel from '#lib/components/chat/chat-panel.svelte';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import type { ChatUIMessage } from '#lib/chat-types.js';
	import type { PlanDetail, PlanStatus } from '#lib/plan-types.js';
	import type { Provider } from '#lib/providers.js';

	interface Props {
		dock: ChatDock;
		plan: PlanDetail;
		status: PlanStatus;
		providers: { id: Provider; name: string }[];
	}

	let { dock, plan, status, providers }: Props = $props();

	let chat = $state.raw<ChatState | null>(null);
	let chatLoadError = $state<string | null>(null);
	let chatPending = $state<'undo' | 'restore' | 'model' | null>(null);
	let chatActionError = $state<string | null>(null);
	let sheetElement = $state<HTMLElement | null>(null);

	let undoForm = $state<HTMLFormElement | null>(null);
	let undoRevisionId = $state('');
	let restoreForm = $state<HTMLFormElement | null>(null);
	let restoreNumber = $state('');
	let modelForm = $state<HTMLFormElement | null>(null);
	let modelProvider = $state('');
	let modelName = $state('');

	async function loadChat() {
		chatLoadError = null;
		try {
			const response = await fetch(`/plans/${plan.id}/chat`);
			if (!response.ok) throw new Error('failed');
			const body = (await response.json()) as { messages: ChatUIMessage[] };
			chat = new ChatState({
				planId: plan.id,
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
		if (dock.open && !chat) untrack(() => void loadChat());
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

{#snippet chatPanel()}
	<ChatPanel
		planId={plan.id}
		planStatus={status}
		provider={plan.provider}
		model={plan.model}
		{providers}
		currentRevision={plan.currentRevision}
		{chat}
		loadError={chatLoadError}
		pending={chatPending}
		actionError={chatActionError}
		showClose
		onclose={() => (dock.open = false)}
		onmodel={switchModel}
		onundo={undoChange}
		onrestore={restoreRevision}
		onretry={loadChat}
	/>
{/snippet}

{#if dock.docked}
	<aside
		id="plan-chat"
		class="fixed top-14 right-0 bottom-0 z-30 animate-in border-l bg-background transition-none fade-in-0 [animation-duration:var(--dur-base)] slide-in-from-right-6"
		style:width="{dock.width}px"
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
		{@render chatPanel()}
	</aside>
{/if}

<Sheet.Root bind:open={() => dock.sheetOpen, (value) => (dock.open = value)}>
	<Sheet.Content
		bind:ref={sheetElement}
		id="plan-chat"
		side="bottom"
		showCloseButton={false}
		class="gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)] data-[side=bottom]:h-[85dvh]"
	>
		<Sheet.Title class="sr-only">Chat about this plan</Sheet.Title>
		<div
			class="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
			{@attach dragToDismiss({
				target: () => sheetElement,
				ondismiss: () => (dock.open = false)
			})}
			aria-hidden="true"
		>
			<span class="h-1.5 w-10 rounded-full bg-muted-foreground/30"></span>
		</div>
		<div class="min-h-0 flex-1">
			{@render chatPanel()}
		</div>
	</Sheet.Content>
</Sheet.Root>

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
