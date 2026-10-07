<script lang="ts">
	import { ToggleGroup, ToggleGroupItem } from '#lib/components/ui/toggle-group/index.js';

	interface Props {
		value: string[];
		invalid?: boolean;
		describedBy?: string;
	}

	let { value = $bindable(), invalid = false, describedBy }: Props = $props();

	const WEEKDAYS = [
		{ id: '1', short: 'Mon', long: 'Monday' },
		{ id: '2', short: 'Tue', long: 'Tuesday' },
		{ id: '3', short: 'Wed', long: 'Wednesday' },
		{ id: '4', short: 'Thu', long: 'Thursday' },
		{ id: '5', short: 'Fri', long: 'Friday' },
		{ id: '6', short: 'Sat', long: 'Saturday' },
		{ id: '0', short: 'Sun', long: 'Sunday' }
	];

	const EVERY_DAY = WEEKDAYS.map((day) => day.id);
	const WORKDAYS = ['1', '2', '3', '4', '5'];

	const same = (a: string[], b: string[]) =>
		a.length === b.length && b.every((id) => a.includes(id));
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Quick choices">
		<button
			type="button"
			class="inline-flex h-11 pressable items-center rounded-lg border px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
			aria-pressed={same(value, EVERY_DAY)}
			onclick={() => (value = [...EVERY_DAY])}
		>
			Every day
		</button>
		<button
			type="button"
			class="inline-flex h-11 pressable items-center rounded-lg border px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
			aria-pressed={same(value, WORKDAYS)}
			onclick={() => (value = [...WORKDAYS])}
		>
			Weekdays only
		</button>
	</div>

	<ToggleGroup
		type="multiple"
		bind:value
		variant="outline"
		spacing={1.5}
		class="flex-wrap"
		aria-label="Study days"
		aria-invalid={invalid ? true : undefined}
		aria-describedby={describedBy}
	>
		{#each WEEKDAYS as day (day.id)}
			<ToggleGroupItem
				value={day.id}
				aria-label={day.long}
				class="h-11 min-w-12 px-3 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
			>
				{day.short}
			</ToggleGroupItem>
		{/each}
	</ToggleGroup>

	{#each value as id (id)}
		<input type="hidden" name="studyDays" value={id} />
	{/each}
</div>
