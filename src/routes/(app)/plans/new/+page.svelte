<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import ModelField from '#lib/components/plans/model-field.svelte';
	import PlanField from '#lib/components/plans/plan-field.svelte';
	import PlanSummaryCard from '#lib/components/plans/plan-summary-card.svelte';
	import StudyDaysField from '#lib/components/plans/study-days-field.svelte';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
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

	onMount(() => {
		if (startDate === data.today) startDate = localToday();
	});
</script>

<svelte:head>
	<title>New plan · Plan Generator</title>
	<meta name="description" content="Describe your goal and get a day-by-day study plan." />
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
	<header class="flex flex-col gap-2">
		<h1 class="text-title">New plan</h1>
		<p class="text-muted-foreground">
			Tell us what you want to learn. Your plan is written block by block, and you can start reading
			while it is still being written.
		</p>
	</header>

	{#if data.providers.length === 0}
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
	{/if}

	<form
		method="POST"
		novalidate
		class="flex flex-col gap-8"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
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
					class="text-base sm:text-sm"
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

			<PlanField
				id="doneLooksLike"
				label="What does done look like?"
				bind:value={doneLooksLike}
				maxlength={data.limits.doneLooksLikeMax}
				placeholder="I can ship a small command line tool"
				note="Optional. One sentence is enough."
				error={errors.doneLooksLike}
			/>
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
				<FieldError>{errors.studyDays ?? 'Choose at least one day of the week.'}</FieldError>
			{/if}
		</FieldSet>

		<FieldSet>
			<FieldLegend variant="label">AI model</FieldLegend>
			<FieldDescription>
				The model writes your plan with your own key. You can switch it later.
			</FieldDescription>
			<ModelField
				providers={data.providers}
				bind:provider
				bind:model
				providerError={errors.provider}
				modelError={errors.model}
			/>
		</FieldSet>

		<PlanSummaryCard {summary} {daysTotal} {providerName} />

		<div class="flex flex-col gap-2">
			<Button type="submit" size="lg" class="h-12" disabled={!canSubmit}>
				{#if submitting}<Spinner data-icon="inline-start" />{/if}
				{submitting ? 'Starting' : 'Generate plan'}
			</Button>
			{#if data.providers.length === 0}
				<p class="text-sm text-muted-foreground">
					Add an AI key in <a
						href="/settings/keys"
						class="font-medium text-primary underline-offset-4 hover:underline">Settings</a
					> to generate a plan.
				</p>
			{/if}
		</div>
	</form>
</div>
