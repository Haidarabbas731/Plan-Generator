<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import FlagIcon from '@lucide/svelte/icons/flag';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { ChatDock } from '#lib/client/chat-dock.svelte.js';
	import { LIVE_POLL_MS, PlanStream, setPlanStream } from '#lib/client/plan-stream.svelte.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { localToday } from '#lib/format.js';
	import { LIMITS } from '#lib/limits.js';
	import { liveFromData } from '#lib/plan-live.js';
	import type { PlanBlockView, PlanDayView, PlanDetail } from '#lib/plan-types.js';
	import type { Provider } from '#lib/providers.js';
	import { behindBy, dayProgress, streak as computeStreak } from '#lib/progress.js';
	import { scheduleDates, todayState as computeTodayState } from '#lib/schedule.js';
	import ActivityLine from './activity-line.svelte';
	import BlockSection from './block-section.svelte';
	import PlanChatDock from './plan-chat-dock.svelte';
	import PlanHeader from './plan-header.svelte';
	import PlanOutline, { type OutlineItem } from './plan-outline.svelte';
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
	let busy = $state<'resume' | 'cancel' | 'model' | null>(null);
	let aboutOpen = $state(false);
	let flashing = $state<ReadonlySet<number>>(new Set());
	let writtenNow = $state<ReadonlySet<number>>(new Set());
	let celebrate = $state(false);
	let wasAllDone: boolean | null = null;
	const seenStatus: Record<number, string> = {};
	const seenDays: Record<number, string> = {};

	let toggleForm = $state<HTMLFormElement | null>(null);
	let toggleDay = $state('');
	let toggleCompleted = $state('');
	let resumeForm = $state<HTMLFormElement | null>(null);
	let cancelForm = $state<HTMLFormElement | null>(null);
	let modelForm = $state<HTMLFormElement | null>(null);
	let modelProvider = $state('');
	let modelName = $state('');

	function switchModelAndResume(provider: string, model: string) {
		modelProvider = provider;
		modelName = model;
		queueMicrotask(() => modelForm?.requestSubmit());
	}

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
	const liveDaysView = $derived(
		blocks.flatMap((block) =>
			(stream.live.blocks[block.idx]?.days ?? []).map((day) => ({
				...day,
				blockId: block.id,
				completed: false
			}))
		)
	);
	const todaySaved = $derived(daysView.find((day) => day.day === todayDay) ?? null);
	const todayLive = $derived(
		todaySaved ? null : (liveDaysView.find((day) => day.day === todayDay) ?? null)
	);
	const todayView = $derived(todaySaved ?? todayLive);
	const todayBlock = $derived(
		blocks.find(
			(block) => todayDay !== null && todayDay >= block.startDay && todayDay <= block.endDay
		) ?? null
	);
	const streak = $derived(today ? computeStreak(plan.startDate, studyDays, daysView, today) : 0);
	const behind = $derived(
		today ? behindBy(plan.startDate, studyDays, daysTotal, daysView, today) : 0
	);
	const allDone = $derived(daysView.length === daysTotal && progress.done === daysTotal);

	const status = $derived(stream.live.status);

	const FLASH_MS = 1200;
	const WRITTEN_MS = 1500;

	const aboutLong = $derived((plan.overview ?? '').length > LIMITS.goalPreviewChars);

	const blockViews = $derived(
		blocks.map((block) => {
			const live = stream.live.blocks[block.idx];
			const savedDays = daysView.filter((day) => day.blockId === block.id);
			const previewDays =
				savedDays.length === 0 ? liveDaysView.filter((day) => day.blockId === block.id) : [];
			const blockDays = savedDays.length > 0 ? savedDays : previewDays;
			let blockStatus = live?.status ?? block.status;
			if (blockStatus === 'ready' && blockDays.length === 0) blockStatus = 'writing';
			if (blockStatus === 'writing' && status !== 'generating') blockStatus = 'pending';
			return {
				block: { ...block, status: blockStatus, error: live?.error ?? block.error },
				days: blockDays,
				preview: previewDays.length > 0
			};
		})
	);

	const phoneInset = $derived(
		today !== null && !dock.desktop.current && status !== 'generating' ? dock.sheet.restInset : 0
	);

	$effect(() => {
		const changed: number[] = [];
		for (const day of days) {
			const key = [day.title, day.learn, day.practice, day.review].join('\u0001');
			const before = seenDays[day.day];
			if (before !== undefined && before !== key) changed.push(day.day);
			seenDays[day.day] = key;
		}
		if (changed.length === 0) return;
		flashing = new Set([...untrack(() => flashing), ...changed]);
		setTimeout(() => {
			flashing = new Set([...untrack(() => flashing)].filter((day) => !changed.includes(day)));
		}, FLASH_MS);
	});

	$effect(() => {
		const now = allDone;
		if (wasAllDone === false && now) celebrate = true;
		wasAllDone = now;
	});

	$effect(() => {
		const fresh: number[] = [];
		for (const { block } of blockViews) {
			const before = seenStatus[block.idx];
			const ready = block.status === 'ready';
			if (before !== undefined && before !== 'ready' && before !== 'stale' && ready) {
				fresh.push(block.idx);
			}
			seenStatus[block.idx] = block.status;
		}
		if (fresh.length === 0) return;
		writtenNow = new Set([...untrack(() => writtenNow), ...fresh]);
		setTimeout(() => {
			writtenNow = new Set([...untrack(() => writtenNow)].filter((idx) => !fresh.includes(idx)));
		}, WRITTEN_MS);
	});

	const outline = $derived<OutlineItem[]>(
		blockViews.map(({ block, days: blockDays }) => ({
			idx: block.idx,
			theme: block.theme,
			startDay: block.startDay,
			endDay: block.endDay,
			done: blockDays.filter((day) => day.completed).length,
			total: blockDays.length,
			written: block.status === 'ready' || block.status === 'stale',
			current: todayDay !== null && todayDay >= block.startDay && todayDay <= block.endDay
		}))
	);
	const railOn = $derived(!dock.docked && blockViews.length > 1);

	async function showBlock(idx: number) {
		openBlocks = { ...openBlocks, [idx]: true };
		await tick();
		document.getElementById(`block-${idx}`)?.scrollIntoView({ block: 'start' });
	}

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
	class={dock.dragging ? 'select-none' : ''}
	style:padding-right={dock.docked ? `${dock.width}px` : undefined}
	style:padding-bottom={phoneInset > 0 ? `${phoneInset}px` : undefined}
>
	<div class="frame py-10 {railOn ? 'xl:grid xl:grid-cols-[48rem_minmax(0,1fr)] xl:gap-10' : ''}">
		<div class="flex column-narrow flex-col gap-6">
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
					{providers}
					provider={plan.provider}
					model={plan.model}
					onmodel={switchModelAndResume}
					onresume={() => resumeForm?.requestSubmit()}
					onpause={() => cancelForm?.requestSubmit()}
				/>
			{/if}

			<TodayCard
				{status}
				today={todayInfo}
				day={todayView}
				preview={todayLive !== null}
				upNext={todayBlock ? { theme: todayBlock.theme, objective: todayBlock.objective } : null}
				{allDone}
				{celebrate}
				ontoggle={toggle}
			/>

			{#if behind > 0}
				<p class="text-sm text-muted-foreground" role="status">
					You are <span class="font-medium text-foreground tabular-nums">{behind}</span>
					{behind === 1 ? 'session' : 'sessions'} behind. There is no rush; finish them at your own pace.
				</p>
			{/if}

			{#if blockViews.length === 0 && status !== 'generating'}
				<p class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
					The outline was not written yet, so there are no blocks to show.
				</p>
			{:else if blockViews.length === 0}
				<div class="flex flex-col gap-3" aria-hidden="true">
					{#each [0, 1, 2] as key (key)}
						<Skeleton class="h-20 w-full rounded-lg" />
					{/each}
				</div>
			{:else}
				<ol class="flex flex-col gap-3">
					{#each blockViews as view, i (view.block.id)}
						<li
							id="block-{view.block.idx}"
							class="reveal scroll-mt-20"
							style="--reveal-i: {Math.min(i, 5)}"
						>
							<BlockSection
								block={view.block}
								days={view.days}
								preview={view.preview}
								{dates}
								{todayDay}
								changed={flashing}
								justWritten={writtenNow.has(view.block.idx)}
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

			{#if plan.overview || plan.finalOutcome}
				<section
					aria-label="About this plan"
					class="flex flex-col gap-3 rounded-lg p-4 text-sm surface-flat"
				>
					<p class="text-caption font-semibold text-muted-foreground">About this plan</p>
					{#if plan.overview}
						<p
							id="plan-about"
							class="whitespace-pre-line text-foreground/85 {aboutLong && !aboutOpen
								? 'line-clamp-3'
								: ''}"
						>
							{plan.overview}
						</p>
						{#if aboutLong}
							<button
								type="button"
								class="-mt-2 min-h-11 self-start text-caption font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
								aria-expanded={aboutOpen}
								aria-controls="plan-about"
								onclick={() => (aboutOpen = !aboutOpen)}
							>
								{aboutOpen ? 'Show less' : 'Show more'}
							</button>
						{/if}
					{/if}
					{#if plan.finalOutcome}
						<p class="flex items-start gap-2.5">
							<FlagIcon class="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden="true" />
							<span>
								<span class="font-medium">By the end:</span>
								<span class="whitespace-pre-line text-foreground/85">{plan.finalOutcome}</span>
							</span>
						</p>
					{/if}
				</section>
			{/if}
		</div>

		{#if railOn}
			<PlanOutline items={outline} onselect={showBlock} />
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
	bind:this={modelForm}
	method="POST"
	action="?/model"
	hidden
	use:enhance={() => {
		busy = 'model';
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				const data = result.data as { message?: string } | undefined;
				toast.error(data?.message ?? 'Could not switch the model.');
				await update({ reset: false });
				busy = null;
				return;
			}
			await update({ reset: false });
			busy = null;
			resumeForm?.requestSubmit();
		};
	}}
>
	<input type="hidden" name="provider" value={modelProvider} />
	<input type="hidden" name="model" value={modelName} />
</form>

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
