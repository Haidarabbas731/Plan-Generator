<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { ChatDock } from '#lib/client/chat-dock.svelte.js';
	import { LIVE_POLL_MS, PlanStream, setPlanStream } from '#lib/client/plan-stream.svelte.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { localToday } from '#lib/format.js';
	import { liveFromData } from '#lib/plan-live.js';
	import type { PlanBlockView, PlanDayView, PlanDetail } from '#lib/plan-types.js';
	import type { Provider } from '#lib/providers.js';
	import { behindBy, dayProgress, streak as computeStreak } from '#lib/progress.js';
	import { scheduleDates, todayState as computeTodayState } from '#lib/schedule.js';
	import ActivityLine from './activity-line.svelte';
	import BlockSection from './block-section.svelte';
	import PlanChatDock from './plan-chat-dock.svelte';
	import PlanHeader from './plan-header.svelte';
	import TodayCard from './today-card.svelte';

	interface Props {
		plan: PlanDetail;
		blocks: PlanBlockView[];
		days: PlanDayView[];
		providers: { id: Provider; name: string }[];
		aiLeft: number;
	}

	let { plan, blocks, days, providers, aiLeft }: Props = $props();

	const stream = untrack(
		() =>
			new PlanStream(plan.id, liveFromData(plan, blocks), () => {
				invalidate(`plan:${plan.id}`);
			})
	);
	setPlanStream(stream);
	const dock = new ChatDock();

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
		const detachDock = dock.attach();
		today = localToday();
		const refresh = () => {
			if (document.visibilityState === 'visible') today = localToday();
		};
		document.addEventListener('visibilitychange', refresh);
		return () => {
			document.removeEventListener('visibilitychange', refresh);
			detachDock();
		};
	});

	function toggle(day: number, completed: boolean) {
		overrides = { ...overrides, [day]: completed };
		toggleDay = String(day);
		toggleCompleted = String(completed);
		queueMicrotask(() => toggleForm?.requestSubmit());
	}
</script>

<div
	class={dock.dragging
		? 'select-none'
		: 'transition-[padding] duration-(--dur-base) ease-(--ease-out)'}
	style:padding-right={dock.docked ? `${dock.width}px` : undefined}
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
			chatOpen={dock.open}
			onchat={() => dock.toggle()}
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

<PlanChatDock {dock} {plan} {status} {providers} {aiLeft} />

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
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				const data = result.data as { message?: string } | undefined;
				toast.error(data?.message ?? 'Could not resume the plan.');
			}
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
