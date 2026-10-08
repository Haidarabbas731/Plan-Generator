import { error, fail, redirect } from '@sveltejs/kit';
import { AI_FAKE } from '$app/env/private';
import { LIMITS } from '#lib/limits.js';
import { isProvider, PROVIDER_INFO, PROVIDERS } from '#lib/providers.js';
import { planService, planStore, revisionStore, usageGuard } from '#lib/server/plans/runtime.js';
import { toBlockView, toDayView } from '#lib/server/plans/views.js';
import { requireUser } from '#lib/server/require-user.js';
import { getKey, listKeys } from '#lib/server/services/provider-keys.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	const user = requireUser(locals);
	depends(`plan:${params.id}`);

	const plan = await planStore.getOwnedPlan(user.id, params.id);
	if (!plan) error(404, 'Plan not found');

	const [blocks, days, keys, allowance] = await Promise.all([
		planStore.listBlocks(plan.id),
		planStore.listDays(plan.id),
		listKeys(user.id),
		usageGuard.check(user.id)
	]);

	return {
		providers: PROVIDERS.filter((id) => AI_FAKE || keys.some((key) => key.provider === id)).map(
			(id) => PROVIDER_INFO[id]
		),
		plan: {
			id: plan.id,
			title: plan.title,
			goal: plan.goal,
			topicTag: plan.topicTag,
			status: plan.status,
			error: plan.error,
			startDate: plan.startDate,
			provider: plan.provider,
			model: plan.model,
			overview: plan.overview,
			finalOutcome: plan.finalOutcome,
			currentRevision: plan.currentRevision,
			inputs: plan.inputs
		},
		blocks: blocks.map(toBlockView),
		days: days.map(toDayView),
		aiLeft: Math.max(0, allowance.cap - allowance.used)
	};
};

export const actions: Actions = {
	toggle: async ({ request, locals, params }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const day = Number(form.get('day'));
		const completed = form.get('completed') === 'true';
		if (!Number.isInteger(day) || day < 1)
			return fail(400, { message: 'That day does not exist.' });

		const found = await planStore.setDayCompleted(user.id, params.id, day, completed);
		if (!found) return fail(404, { message: 'That day does not exist.' });
		return { day, completed };
	},

	resume: async ({ locals, params }) => {
		const user = requireUser(locals);
		const result = await planService.resumePlan(user.id, params.id);
		if (result === 'not-found') error(404, 'Plan not found');
		if (typeof result === 'object') return fail(429, { message: result.message });
		return { resumed: result };
	},

	cancel: async ({ locals, params }) => {
		const user = requireUser(locals);
		const stopped = await planService.cancelPlan(user.id, params.id);
		if (!stopped) return fail(409, { message: 'The plan is not being written right now.' });
		return { cancelled: true };
	},

	undo: async ({ request, locals, params }) => {
		const user = requireUser(locals);
		const plan = await planStore.getOwnedPlan(user.id, params.id);
		if (!plan) error(404, 'Plan not found');
		if (plan.status === 'generating') {
			return fail(409, { message: 'Wait until the plan has finished writing.' });
		}
		const revisionId = String((await request.formData()).get('revisionId') ?? '');
		const number = await revisionStore.findRevisionNumber(plan.id, revisionId);
		if (number === null || number < 2) return fail(404, { message: 'There is nothing to undo.' });
		if (number !== plan.currentRevision) {
			return fail(409, { message: 'That change was already undone or the plan changed since.' });
		}
		await revisionStore.restoreRevision(plan.id, number - 1);
		return { undone: number };
	},

	restore: async ({ request, locals, params }) => {
		const user = requireUser(locals);
		const plan = await planStore.getOwnedPlan(user.id, params.id);
		if (!plan) error(404, 'Plan not found');
		if (plan.status === 'generating') {
			return fail(409, { message: 'Wait until the plan has finished writing.' });
		}
		const number = Number((await request.formData()).get('number'));
		if (!Number.isInteger(number) || number < 1) {
			return fail(400, { message: 'Choose a revision to restore.' });
		}
		const restored = await revisionStore.restoreRevision(plan.id, number);
		if (!restored) return fail(404, { message: 'That revision is no longer available.' });
		return { restored: number };
	},

	model: async ({ request, locals, params }) => {
		const user = requireUser(locals);
		const plan = await planStore.getOwnedPlan(user.id, params.id);
		if (!plan) error(404, 'Plan not found');
		if (plan.status === 'generating') {
			return fail(409, { message: 'Pause the plan before switching the model.' });
		}
		const form = await request.formData();
		const provider = form.get('provider');
		const model = String(form.get('model') ?? '').trim();
		if (!isProvider(provider)) return fail(400, { message: 'Choose a provider.' });
		if (!model || model.length > LIMITS.modelIdMax) {
			return fail(400, { message: 'Choose a model.' });
		}
		if (!AI_FAKE && !(await getKey(user.id, provider))) {
			return fail(400, {
				message: `Add a ${PROVIDER_INFO[provider].name} key in Settings first.`
			});
		}
		await planStore.setPlanModel(user.id, plan.id, provider, model);
		return { provider, model };
	},

	delete: async ({ locals, params }) => {
		const user = requireUser(locals);
		await planService.cancelPlan(user.id, params.id);
		const removed = await planStore.deleteOwnedPlan(user.id, params.id);
		if (!removed) error(404, 'Plan not found');
		redirect(303, '/plans');
	}
};
