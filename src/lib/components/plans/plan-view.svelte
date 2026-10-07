<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { ChatState } from '#lib/client/chat.svelte.js';
	import {
		CHAT_WIDTH,
		CHAT_WIDTH_STORAGE_KEY,
		clampChatWidth,
		maxChatWidth,
		parseStoredWidth,
		widthFromKey,
		widthFromPointer
	} from '#lib/client/chat-width.js';
	import { dragToDismiss } from '#lib/client/drag-dismiss.js';
	import { LIVE_POLL_MS, PlanStream, setPlanStream } from '#lib/client/plan-stream.svelte.js';
	import ChatPanel from '#lib/components/chat/chat-panel.svelte';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import type { ChatUIMessage } from '#lib/chat-types.js';
	import { localToday } from '#lib/format.js';
	import { liveFromData } from '#lib/plan-live.js';
	import type { PlanBlockView, PlanDayView, PlanDetail } from '#lib/plan-types.js';
	import type { Provider } from '#lib/providers.js';
	import { behindBy, dayProgress, streak as computeStreak } from '#lib/progress.js';
	import { scheduleDates, todayState as computeTodayState } from '#lib/schedule.js';
	import ActivityLine from './activity-line.svelte';
	import BlockSection from './block-section.svelte';
	import PlanHeader from './plan-header.svelte';
	import TodayCard from './today-card.svelte';

	interface Props {
		plan: PlanDetail;
		blocks: PlanBlockView[];
		days: PlanDayView[];
		providers: { id: Provider; name: string }[];
	}

	let { plan, blocks, days, providers }: Props = $props();

	const stream = untrack(
		() =>
			new PlanStream(plan.id, liveFromData(plan, blocks), () => {
				invalidate(`plan:${plan.id}`);
			})
	);
	setPlanStream(stream);

	let today = $state<string | null>(null);
	let overrides = $state<Record<number, boolean>>({});
	let openBlocks = $state<Record<number, boolean>>({});
	let autoOpened = false;
	let busy = $state<'resume' | 'cancel' | null>(null);

	let toggleForm = $state<HTMLFormElement | null>(null);
	let toggleDay = $state('');
	let toggleCompleted = $state('');
	let resumeForm = $state<HTMLFormElement | null>(null);
	let cancelForm = $state<HTMLFormElement | null>(null);

	const studyDays = $derived(plan.inputs.studyDays);
	const daysTotal = $derived(plan.inputs.daysTotal);
	const dates = $derived(scheduleDates(plan.startDate, studyDays, daysTotal));

	const daysView = $derived(
		days.map((day) => ({ ...day, completed: overrides[day.day] ?? day.completed }))
	);
	const progress = $derived(dayProgress(daysView));
	const todayInfo = $derived(
		today ? computeTodayState(plan.startDate, studyDays, daysTotal, today) : null
	);
	const todayDay = $derived(todayInfo?.kind === 'session' ? todayInfo.day : null);
	const todayView = $derived(daysView.find((day) => day.day === todayDay) ?? null);
	const streak = $derived(today ? computeStreak(plan.startDate, studyDays, daysView, today) : 0);
	const behind = $derived(
		today ? behindBy(plan.startDate, studyDays, daysTotal, daysView, today) : 0
	);
	const allDone = $derived(daysView.length === daysTotal && progress.done === daysTotal);

	const status = $derived(stream.live.status);

	const blockViews = $derived(
		blocks.map((block) => {
			const live = stream.live.blocks[block.idx];
			const blockDays = daysView.filter((day) => day.blockId === block.id);
			let blockStatus = live?.status ?? block.status;
			if (blockStatus === 'ready' && blockDays.length === 0) blockStatus = 'writing';
			if (blockStatus === 'writing' && status !== 'generating') blockStatus = 'pending';
			return {
				block: { ...block, status: blockStatus, error: live?.error ?? block.error },
				days: blockDays
			};
		})
	);

	$effect(() => {
		stream.sync(liveFromData(plan, blocks), blocks.length);
	});

	$effect(() => {
		if (plan.status === 'ready') return;
		return stream.open();
	});

	$effect(() => {
		if (status === 'ready' || stream.connected) return;
		const timer = setInterval(() => invalidate(`plan:${plan.id}`), LIVE_POLL_MS);
		return () => clearInterval(timer);
	});

	$effect(() => {
		const server = new Map(days.map((day) => [day.day, day.completed]));
		untrack(() => {
			const kept = Object.entries(overrides).filter(
				([day, value]) => server.get(Number(day)) !== value
			);
			if (kept.length !== Object.keys(overrides).length) overrides = Object.fromEntries(kept);
		});
	});

	$effect(() => {
		if (autoOpened || today === null || blockViews.length === 0) return;
		const withToday = blockViews.find(
			({ block }) => todayDay !== null && todayDay >= block.startDay && todayDay <= block.endDay
		);
		const firstOpen = blockViews.find(({ days: list }) => list.some((day) => !day.completed));
		const pick = withToday ?? firstOpen ?? blockViews[0];
		openBlocks = { [pick.block.idx]: true };
		autoOpened = true;
	});

	onMount(() => {
		viewportWidth = window.innerWidth;
		try {
			const saved = parseStoredWidth(
				localStorage.getItem(CHAT_WIDTH_STORAGE_KEY),
				window.innerWidth
			);
			if (saved !== null) chatWidth = saved;
		} catch {
			// storage can be blocked
		}
		const onResize = () => {
			viewportWidth = window.innerWidth;
			chatWidth = clampChatWidth(chatWidth, window.innerWidth);
		};
		window.addEventListener('resize', onResize);
		today = localToday();
		const refresh = () => {
			if (document.visibilityState === 'visible') today = localToday();
		};
		document.addEventListener('visibilitychange', refresh);
		return () => {
			document.removeEventListener('visibilitychange', refresh);
			window.removeEventListener('resize', onResize);
		};
	});

	const desktop = new MediaQuery('(min-width: 1024px)');
	let chatWidth = $state<number>(CHAT_WIDTH.initial);
	let viewportWidth = $state(1280);
	let dragging = $state(false);

	function saveWidth() {
		try {
			localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(chatWidth));
		} catch {
			// storage can be blocked; the width then lasts for this visit only
		}
	}

	function setWidth(value: number) {
		chatWidth = clampChatWidth(value, window.innerWidth);
		saveWidth();
	}

	function startResize(event: PointerEvent) {
		if (!event.isPrimary) return;
		dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function resize(event: PointerEvent) {
		if (dragging) chatWidth = widthFromPointer(event.clientX, window.innerWidth);
	}

	function endResize(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		saveWidth();
	}

	function resizeKey(event: KeyboardEvent) {
		const next = widthFromKey(event.key, chatWidth, window.innerWidth, event.shiftKey);
		if (next === null) return;
		event.preventDefault();
		setWidth(next);
	}
	let chatOpen = $state(false);
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

	function toggleChat() {
		chatOpen = !chatOpen;
		if (chatOpen && !chat) void loadChat();
	}

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

	function toggle(day: number, completed: boolean) {
		overrides = { ...overrides, [day]: completed };
		toggleDay = String(day);
		toggleCompleted = String(completed);
		queueMicrotask(() => toggleForm?.requestSubmit());
	}
</script>

<div
	class={dragging ? 'select-none' : 'transition-[padding] duration-(--dur-base) ease-(--ease-out)'}
	style:padding-right={chatOpen && desktop.current ? `${chatWidth}px` : undefined}
>
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
		<PlanHeader
			id={plan.id}
			title={plan.title}
			goal={plan.goal}
			topicTag={plan.topicTag}
			provider={plan.provider}
			model={plan.model}
			startDate={plan.startDate}
			done={progress.done}
			total={daysTotal}
			{streak}
			{chatOpen}
			onchat={toggleChat}
		/>

		{#if status !== 'ready'}
			<ActivityLine
				{status}
				error={stream.live.error}
				label={stream.label}
				blocks={blockViews.map(({ block }) => ({
					idx: block.idx,
					theme: block.theme,
					status: block.status,
					error: block.error
				}))}
				busy={busy !== null}
				onresume={() => resumeForm?.requestSubmit()}
				onpause={() => cancelForm?.requestSubmit()}
			/>
		{/if}

		<TodayCard today={todayInfo} day={todayView} {allDone} ontoggle={toggle} />

		{#if behind > 0}
			<p class="text-sm text-muted-foreground" role="status">
				You are <span class="font-medium text-foreground tabular-nums">{behind}</span>
				{behind === 1 ? 'session' : 'sessions'} behind. There is no rush; finish them at your own pace.
			</p>
		{/if}

		{#if plan.overview || plan.finalOutcome}
			<section aria-label="About this plan" class="flex flex-col gap-3 text-sm">
				{#if plan.overview}<p class="whitespace-pre-line text-foreground/85">
						{plan.overview}
					</p>{/if}
				{#if plan.finalOutcome}
					<p>
						<span class="font-medium">By the end:</span>
						<span class="whitespace-pre-line text-foreground/85">{plan.finalOutcome}</span>
					</p>
				{/if}
			</section>
		{/if}

		{#if blockViews.length === 0}
			<div class="flex flex-col gap-3" aria-hidden="true">
				{#each [0, 1, 2] as key (key)}
					<Skeleton class="h-20 w-full rounded-lg" />
				{/each}
			</div>
		{:else}
			<ol class="flex flex-col gap-3">
				{#each blockViews as view, i (view.block.id)}
					<li class="reveal" style="--reveal-i: {Math.min(i, 5)}">
						<BlockSection
							block={view.block}
							days={view.days}
							{dates}
							{todayDay}
							bind:open={
								() => openBlocks[view.block.idx] ?? false,
								(value) => (openBlocks[view.block.idx] = value)
							}
							retrying={busy === 'resume'}
							ontoggle={toggle}
							onretry={() => resumeForm?.requestSubmit()}
						/>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>

{#snippet chatPanel(showClose: boolean)}
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
		{showClose}
		onclose={() => (chatOpen = false)}
		onmodel={switchModel}
		onundo={undoChange}
		onrestore={restoreRevision}
		onretry={loadChat}
	/>
{/snippet}

{#if chatOpen && desktop.current}
	<aside
		id="plan-chat"
		class="fixed top-14 right-0 bottom-0 z-30 animate-in border-l bg-background transition-none fade-in-0 [animation-duration:var(--dur-base)] slide-in-from-right-6"
		style:width="{chatWidth}px"
	>
		<div
			role="slider"
			aria-orientation="horizontal"
			aria-label="Chat width"
			aria-valuetext="{chatWidth} pixels wide"
			aria-valuemin={CHAT_WIDTH.min}
			aria-valuemax={maxChatWidth(viewportWidth)}
			aria-valuenow={chatWidth}
			tabindex="0"
			class="group absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none justify-center outline-none"
			onpointerdown={startResize}
			onpointermove={resize}
			onpointerup={endResize}
			onpointercancel={endResize}
			onkeydown={resizeKey}
			ondblclick={() => setWidth(CHAT_WIDTH.initial)}
		>
			<span
				class="w-0.5 rounded-full bg-transparent transition-colors duration-(--dur-fast) group-hover:bg-ring/60 group-focus-visible:bg-ring {dragging
					? 'bg-ring'
					: ''}"
			></span>
		</div>
		{@render chatPanel(true)}
	</aside>
{/if}

<Sheet.Root bind:open={() => chatOpen && !desktop.current, (value) => (chatOpen = value)}>
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
				ondismiss: () => (chatOpen = false)
			})}
			aria-hidden="true"
		>
			<span class="h-1.5 w-10 rounded-full bg-muted-foreground/30"></span>
		</div>
		<div class="min-h-0 flex-1">
			{@render chatPanel(true)}
		</div>
	</Sheet.Content>
</Sheet.Root>

<form
	bind:this={toggleForm}
	method="POST"
	action="?/toggle"
	hidden
	use:enhance={({ formData }) => {
		const day = Number(formData.get('day'));
		const completed = formData.get('completed') === 'true';
		return async ({ result }) => {
			if (result.type === 'success') return;
			overrides = { ...overrides, [day]: !completed };
			toast.error('Could not save that day. Try again.');
		};
	}}
>
	<input type="hidden" name="day" value={toggleDay} />
	<input type="hidden" name="completed" value={toggleCompleted} />
</form>

<form
	bind:this={resumeForm}
	method="POST"
	action="?/resume"
	hidden
	use:enhance={() => {
		busy = 'resume';
		return async ({ update }) => {
			await update({ reset: false });
			busy = null;
		};
	}}
></form>

<form
	bind:this={cancelForm}
	method="POST"
	action="?/cancel"
	hidden
	use:enhance={() => {
		busy = 'cancel';
		return async ({ result, update }) => {
			if (result.type === 'failure') toast.error('The plan is not being written right now.');
			await update({ reset: false });
			busy = null;
		};
	}}
></form>

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
