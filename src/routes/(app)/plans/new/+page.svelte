<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import ModelField from '#lib/components/plans/model-field.svelte';
	import PlanField from '#lib/components/plans/plan-field.svelte';
	import PlanSummaryCard from '#lib/components/plans/plan-summary-card.svelte';
	import PageHeader from '#lib/components/shared/page-header.svelte';
	import StudyDaysField from '#lib/components/plans/study-days-field.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '#lib/components/ui/collapsible/index.js';
	import {
		Field,
		FieldDescription,
		FieldError,
		FieldGroup,
		FieldLabel,
		FieldLegend,
		FieldSet
	} from '#lib/components/ui/field/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { ToggleGroup, ToggleGroupItem } from '#lib/components/ui/toggle-group/index.js';
	import { createDisclosureMode } from '#lib/disclosure.svelte.js';
	import { localToday } from '#lib/format.js';
	import { summarizePlan } from '#lib/plan-summary.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const LEVELS = [
		{ id: 'beginner', label: 'Beginner' },
		{ id: 'some', label: 'Some experience' },
		{ id: 'returning', label: 'Returning' }
	];

	const initial = untrack(() => {
		const values = form?.values;
		return {
			goal: values?.goal ?? '',
			level: values?.level ?? '',
			doneLooksLike: values?.doneLooksLike ?? '',
			daysTotal: Number(values?.daysTotal || 30),
			hoursPerDay: Number(values?.hoursPerDay || 1),
			studyDays: values?.studyDays ?? ['0', '1', '2', '3', '4', '5', '6'],
			blockSize: Number(values?.blockSize || 5),
			startDate: values?.startDate || data.today,
			provider: values?.provider || data.defaults.provider || '',
			model: values?.model || data.defaults.model
		};
	});

	let goal = $state(initial.goal);
	let level = $state(initial.level);
	let doneLooksLike = $state(initial.doneLooksLike);
	let daysTotal = $state<number | null>(initial.daysTotal);
	let hoursPerDay = $state<number | null>(initial.hoursPerDay);
	let studyDays = $state<string[]>(initial.studyDays);
	let blockSize = $state<number | null>(initial.blockSize);
	let startDate = $state(initial.startDate);
	let provider = $state(initial.provider);
	let model = $state(initial.model);

	let submitting = $state(false);

	const errors = $derived(form?.errors ?? {});
	const providerName = $derived(data.providers.find((option) => option.id === provider)?.name);

	const summary = $derived(
		summarizePlan({
			daysTotal,
			hoursPerDay,
			blockSize,
			studyDays,
			startDate,
			maxPlanDays: data.limits.maxPlanDays
		})
	);

	const canSubmit = $derived(
		data.providers.length > 0 && studyDays.length > 0 && goal.trim().length > 0 && !submitting
	);

	const submitHint = $derived(
		data.providers.length === 0
			? 'Add an AI key in Settings to generate a plan.'
			: goal.trim().length === 0
				? 'Describe your goal to continue.'
				: studyDays.length === 0
					? 'Choose at least one study day.'
					: ''
	);

	const customizeMode = createDisclosureMode();
	const modelMode = createDisclosureMode();
	let customizeUser = $state(false);
	let modelUser = $state(false);

	const customizeForced = $derived(
		Boolean(errors.doneLooksLike || errors.startDate || errors.blockSize || errors.studyDays) ||
			studyDays.length === 0
	);
	const modelForced = $derived(!provider || !model || Boolean(errors.provider || errors.model));

	onMount(() => {
		if (startDate === data.today) startDate = localToday();
	});
</script>

<svelte:head>
	<title>New plan · Plan Generator</title>
	<meta name="description" content="Describe your goal and get a day-by-day study plan." />
</svelte:head>

<div class="frame py-10">
	<PageHeader
		title="New plan"
		description="Tell us what you want to learn. Your plan is written block by block, and you can start reading while it is still being written."
	/>

	{#if data.providers.length === 0}
		<div class="mt-8 column-narrow">
			<Alert>
				<KeyRoundIcon aria-hidden="true" />
				<AlertTitle>Connect your AI key first</AlertTitle>
				<AlertDescription>
					Plans are written with your own AI key.
					<a
						href="/settings/keys"
						class="font-medium text-primary underline-offset-4 hover:underline"
					>
						Add a key
					</a>
				</AlertDescription>
			</Alert>
		</div>
	{/if}

	<form
		method="POST"
		novalidate
		class="mt-8 flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		<div class="flex flex-col gap-8 lg:max-w-2xl">
			{#if form?.formError}
				<Alert variant="destructive" role="alert">
					<AlertDescription>{form.formError}</AlertDescription>
				</Alert>
			{/if}

			<FieldGroup>
				<Field data-invalid={errors.goal ? true : undefined}>
					<FieldLabel for="goal">What do you want to learn?</FieldLabel>
					<Textarea
						id="goal"
						name="goal"
						bind:value={goal}
						rows={4}
						maxlength={data.limits.goalMax}
						placeholder="Learn Rust well enough to build a CLI tool"
						class="max-h-64 overflow-y-auto text-base sm:text-sm"
						aria-invalid={errors.goal ? true : undefined}
						aria-describedby={errors.goal ? 'goal-error' : undefined}
					/>
					{#if errors.goal}<FieldError id="goal-error">{errors.goal}</FieldError>{/if}
				</Field>

				<FieldSet>
					<FieldLegend variant="label">Your level</FieldLegend>
					<FieldDescription>Optional. It helps pick where to start.</FieldDescription>
					<ToggleGroup
						type="single"
						bind:value={level}
						variant="outline"
						spacing={1.5}
						class="flex-wrap"
						aria-label="Your level"
					>
						{#each LEVELS as option (option.id)}
							<ToggleGroupItem
								value={option.id}
								class="h-11 px-4 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
							>
								{option.label}
							</ToggleGroupItem>
						{/each}
					</ToggleGroup>
					<input type="hidden" name="level" value={level} />
				</FieldSet>
			</FieldGroup>

			<FieldGroup class="grid gap-6 sm:grid-cols-2">
				<PlanField
					id="daysTotal"
					label="Study sessions"
					type="number"
					inputmode="numeric"
					min="1"
					max={data.limits.maxPlanDays}
					step="1"
					bind:value={daysTotal}
					note="Days you will study, up to {data.limits.maxPlanDays}."
					error={errors.daysTotal}
				/>
				<PlanField
					id="hoursPerDay"
					label="Hours per session"
					type="number"
					inputmode="decimal"
					min="0.5"
					max="12"
					step="0.5"
					bind:value={hoursPerDay}
					error={errors.hoursPerDay}
				/>
			</FieldGroup>

			{#if data.providers.length > 0}
				<Collapsible bind:open={() => modelUser || modelForced, (value) => (modelUser = value)}>
					<div class="flex flex-col gap-2">
						<p class="text-sm font-medium">AI model</p>
						<div
							class="flex min-h-11 items-center justify-between gap-3 rounded-lg py-1 pr-1 pl-3 surface-flat"
						>
							<p class="min-w-0 truncate text-sm">
								{#if model}
									Written by
									<span class="font-medium">{providerName ?? 'your AI provider'} · {model}</span>
								{:else}
									<span class="text-muted-foreground">Choose the model that writes your plan</span>
								{/if}
							</p>
							{#if !modelForced}
								<CollapsibleTrigger
									class={buttonVariants({
										variant: 'ghost',
										size: 'sm',
										class: 'h-9 shrink-0 gap-1 px-3'
									})}
									onkeydown={modelMode.onkeydown}
									onpointerdown={modelMode.onpointerdown}
								>
									{modelUser || modelForced ? 'Hide' : 'Change'}
									<ChevronDownIcon
										class="size-4 transition-transform duration-(--dur-fast) ease-(--ease-out) {modelUser ||
										modelForced
											? 'rotate-180'
											: ''}"
										aria-hidden="true"
									/>
								</CollapsibleTrigger>
							{/if}
						</div>
					</div>
					<CollapsibleContent data-instant={modelMode.instant ? '' : undefined}>
						<div class="flex flex-col gap-3 pt-3">
							<p class="text-sm text-muted-foreground">
								The model writes your plan with your own key. You can switch it later.
							</p>
							<ModelField
								providers={data.providers}
								bind:provider
								bind:model
								providerError={errors.provider}
								modelError={errors.model}
							/>
						</div>
					</CollapsibleContent>
				</Collapsible>
			{/if}

			<Collapsible
				bind:open={() => customizeUser || customizeForced, (value) => (customizeUser = value)}
				class="rounded-xl surface-flat"
			>
				<CollapsibleTrigger
					class="group flex min-h-16 w-full items-center gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
					onkeydown={customizeMode.onkeydown}
					onpointerdown={customizeMode.onpointerdown}
				>
					<span class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="text-heading">Customize your plan</span>
						<span class="text-caption text-muted-foreground">
							What done looks like, start date, days per block, study days
						</span>
					</span>
					<ChevronDownIcon
						class="size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-fast) ease-(--ease-out) group-data-[state=open]:rotate-180"
						aria-hidden="true"
					/>
				</CollapsibleTrigger>
				<CollapsibleContent data-instant={customizeMode.instant ? '' : undefined}>
					<div class="flex flex-col gap-8 px-4 pt-1 pb-5">
						<PlanField
							id="doneLooksLike"
							label="What does done look like?"
							bind:value={doneLooksLike}
							maxlength={data.limits.doneLooksLikeMax}
							placeholder="I can ship a small command line tool"
							note="Optional. One sentence is enough."
							error={errors.doneLooksLike}
						/>

						<FieldGroup class="grid gap-6 sm:grid-cols-2">
							<PlanField
								id="startDate"
								label="Start date"
								type="date"
								bind:value={startDate}
								error={errors.startDate}
							/>
							<PlanField
								id="blockSize"
								label="Days per block"
								type="number"
								inputmode="numeric"
								min={data.limits.minBlockDays}
								max={data.limits.maxBlockDays}
								step="1"
								bind:value={blockSize}
								note="Each block ends with a milestone. At least {data.limits.minBlockDays} days."
								error={errors.blockSize}
							/>
						</FieldGroup>

						<FieldSet>
							<FieldLegend variant="label">Study days</FieldLegend>
							<FieldDescription id="study-days-note">
								Sessions land on these weekdays. Other days are rest days.
							</FieldDescription>
							<StudyDaysField
								bind:value={studyDays}
								invalid={Boolean(errors.studyDays) || studyDays.length === 0}
								describedBy="study-days-note"
							/>
							{#if errors.studyDays || studyDays.length === 0}
								<FieldError>
									{errors.studyDays ?? 'Choose at least one day of the week.'}
								</FieldError>
							{/if}
						</FieldSet>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>

		<aside class="contents lg:sticky lg:top-20 lg:flex lg:flex-col lg:gap-4">
			<PlanSummaryCard {summary} {daysTotal} {providerName} />

			<div
				class="sticky bottom-0 z-30 -mx-4 flex flex-col gap-2 border-t glass px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent! lg:p-0 lg:backdrop-blur-none"
			>
				<Button
					type="submit"
					size="lg"
					class="h-12"
					disabled={!canSubmit}
					aria-describedby={submitHint ? 'submit-hint' : undefined}
				>
					{#if submitting}<Spinner data-icon="inline-start" />{/if}
					{submitting ? 'Starting' : 'Generate plan'}
				</Button>
				{#if submitHint}
					<p id="submit-hint" class="text-caption text-muted-foreground">
						{#if data.providers.length === 0}
							Add an AI key in <a
								href="/settings/keys"
								class="font-medium text-primary underline-offset-4 hover:underline">Settings</a
							> to generate a plan.
						{:else}
							{submitHint}
						{/if}
					</p>
				{/if}
			</div>
		</aside>
	</form>
</div>
