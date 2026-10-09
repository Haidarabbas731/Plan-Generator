import { LIMITS } from './limits.js';
import type { PlanInputs } from './plan-types.js';
import { isProvider, type Provider } from './providers.js';
import { isRealDate } from './schedule.js';

export interface ValidPlanRequest {
	inputs: PlanInputs;
	provider: Provider;
	model: string;
	startDate: string;
}

export type PlanRequestErrors = Partial<
	Record<
		| 'goal'
		| 'level'
		| 'doneLooksLike'
		| 'daysTotal'
		| 'minutesPerDay'
		| 'studyDays'
		| 'blockSize'
		| 'startDate'
		| 'provider'
		| 'model',
		string
	>
>;

const LEVELS = ['beginner', 'some', 'returning'] as const;
const asInt = (value: unknown): number | null => {
	const number = typeof value === 'string' ? Number(value) : value;
	return typeof number === 'number' && Number.isInteger(number) ? number : null;
};

export function validatePlanRequest(
	raw: Record<string, unknown>
): { value: ValidPlanRequest } | { errors: PlanRequestErrors } {
	const errors: PlanRequestErrors = {};

	const goal = String(raw.goal ?? '').trim();
	if (goal.length < LIMITS.goalMin) errors.goal = 'Describe what you want to learn.';
	else if (goal.length > LIMITS.goalMax) {
		errors.goal = `Use at most ${LIMITS.goalMax} characters.`;
	}

	const levelRaw = String(raw.level ?? '');
	const level =
		levelRaw === ''
			? null
			: (LEVELS as readonly string[]).includes(levelRaw)
				? levelRaw
				: undefined;
	if (level === undefined) errors.level = 'Choose one of the options.';

	const done = String(raw.doneLooksLike ?? '').trim();
	if (done.length > LIMITS.doneLooksLikeMax) {
		errors.doneLooksLike = `Use at most ${LIMITS.doneLooksLikeMax} characters.`;
	}

	const daysTotal = asInt(raw.daysTotal);
	if (daysTotal === null || daysTotal < LIMITS.minPlanDays || daysTotal > LIMITS.maxPlanDays) {
		errors.daysTotal = `Choose between ${LIMITS.minPlanDays} and ${LIMITS.maxPlanDays} days.`;
	}

	const minutesPerDay = asInt(raw.minutesPerDay);
	if (
		minutesPerDay === null ||
		minutesPerDay < LIMITS.minMinutesPerDay ||
		minutesPerDay > LIMITS.maxMinutesPerDay
	) {
		errors.minutesPerDay = `Choose between ${LIMITS.minMinutesPerDay} and ${LIMITS.maxMinutesPerDay} minutes a day.`;
	}

	const blockSize = asInt(raw.blockSize ?? LIMITS.minBlockDays + 2);
	if (blockSize === null || blockSize < LIMITS.minBlockDays || blockSize > LIMITS.maxBlockDays) {
		errors.blockSize = `Choose between ${LIMITS.minBlockDays} and ${LIMITS.maxBlockDays} days per block.`;
	}

	const studyDaysRaw = Array.isArray(raw.studyDays) ? raw.studyDays : [];
	const studyDays = [...new Set(studyDaysRaw.map(asInt))];
	if (studyDays.length === 0 || studyDays.some((day) => day === null || day < 0 || day > 6)) {
		errors.studyDays = 'Choose at least one day of the week.';
	}

	const startDate = String(raw.startDate ?? '');
	if (!isRealDate(startDate)) errors.startDate = 'Choose a valid start date.';

	if (!isProvider(raw.provider)) errors.provider = 'Choose a provider.';

	const model = String(raw.model ?? '').trim();
	if (!model) errors.model = 'Choose a model.';
	else if (model.length > LIMITS.modelIdMax) errors.model = 'That model name is too long.';

	if (Object.keys(errors).length > 0) return { errors };

	return {
		value: {
			inputs: {
				goal,
				level: level as PlanInputs['level'],
				studyDays: (studyDays as number[]).sort((a, b) => a - b),
				doneLooksLike: done || null,
				daysTotal: daysTotal!,
				minutesPerDay: minutesPerDay!,
				blockSize: blockSize!
			},
			provider: raw.provider as Provider,
			model,
			startDate
		}
	};
}
