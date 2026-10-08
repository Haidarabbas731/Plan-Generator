import { fail, redirect } from '@sveltejs/kit';
import { AI_FAKE } from '$app/env/private';
import { LIMITS } from '#lib/limits.js';
import type { PlanRequestErrors } from '#lib/plan-validation.js';
import { PROVIDER_INFO, PROVIDERS } from '#lib/providers.js';
import { appLimits } from '#lib/server/app-limits.js';
import { planService } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import { getPrefs } from '#lib/server/services/prefs.js';
import { listKeys } from '#lib/server/services/provider-keys.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const [keys, prefs] = await Promise.all([listKeys(user.id), getPrefs(user.id)]);
	const connected = PROVIDERS.filter((id) => AI_FAKE || keys.some((key) => key.provider === id));
	const defaultProvider =
		prefs.defaultProvider && connected.includes(prefs.defaultProvider)
			? prefs.defaultProvider
			: (connected[0] ?? null);
	return {
		providers: connected.map((id) => PROVIDER_INFO[id]),
		defaults: {
			provider: defaultProvider,
			model: defaultProvider === prefs.defaultProvider ? (prefs.defaultModel ?? '') : ''
		},
		today: new Date().toISOString().slice(0, 10),
		limits: {
			goalMax: LIMITS.goalMax,
			doneLooksLikeMax: LIMITS.doneLooksLikeMax,
			maxPlanDays: LIMITS.maxPlanDays,
			minBlockDays: LIMITS.minBlockDays,
			maxBlockDays: LIMITS.maxBlockDays
		}
	};
};

interface FormValues {
	goal: string;
	level: string;
	doneLooksLike: string;
	daysTotal: string;
	hoursPerDay: string;
	studyDays: string[];
	blockSize: string;
	startDate: string;
	provider: string;
	model: string;
}

type FormErrors = Omit<PlanRequestErrors, 'minutesPerDay'> & { hoursPerDay?: string };

const failForm = (status: 400 | 429, values: FormValues, errors: FormErrors, formError?: string) =>
	fail(status, { values, errors, formError });

const text = (form: FormData, name: string) => String(form.get(name) ?? '');

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();

		const values: FormValues = {
			goal: text(form, 'goal'),
			level: text(form, 'level'),
			doneLooksLike: text(form, 'doneLooksLike'),
			daysTotal: text(form, 'daysTotal'),
			hoursPerDay: text(form, 'hoursPerDay'),
			studyDays: form.getAll('studyDays').map(String),
			blockSize: text(form, 'blockSize'),
			startDate: text(form, 'startDate'),
			provider: text(form, 'provider'),
			model: text(form, 'model')
		};

		const hours = Number(values.hoursPerDay);
		const result = await planService.createAndStartPlan(user.id, {
			...values,
			minutesPerDay: Number.isFinite(hours) ? Math.round(hours * 60) : null
		});

		if (result.ok) redirect(303, `/plans/${result.planId}`);

		if (result.reason === 'invalid') {
			const { minutesPerDay, ...rest } = result.errors;
			const errors: FormErrors = minutesPerDay ? { ...rest, hoursPerDay: minutesPerDay } : rest;
			return failForm(400, values, errors);
		}
		if (result.reason === 'no-key') {
			const errors: FormErrors = {
				provider: `Add a ${PROVIDER_INFO[result.provider].name} key in Settings first.`
			};
			return failForm(400, values, errors);
		}
		if (result.reason === 'rate-limit') return failForm(429, values, {}, result.message);
		return failForm(
			429,
			values,
			{},
			`You have reached the limit of ${appLimits.plansPerUser} plans. Delete a plan to create a new one.`
		);
	}
};
