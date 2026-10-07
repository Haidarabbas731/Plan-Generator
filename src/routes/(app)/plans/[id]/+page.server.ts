import { error, fail, redirect } from '@sveltejs/kit';
import { planService, planStore } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	const user = requireUser(locals);
	depends(`plan:${params.id}`);

	const plan = await planStore.getOwnedPlan(user.id, params.id);
	if (!plan) error(404, 'Plan not found');

	const [blocks, days] = await Promise.all([
		planStore.listBlocks(plan.id),
		planStore.listDays(plan.id)
	]);

	return {
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
			inputs: plan.inputs
		},
		blocks: blocks.map((block) => ({
			id: block.id,
			idx: block.idx,
			startDay: block.startDay,
			endDay: block.endDay,
			theme: block.theme,
			objective: block.objective,
			milestone: block.milestone,
			status: block.status,
			error: block.error
		})),
		days: days.map((day) => ({
			day: day.day,
			blockId: day.blockId,
			title: day.title,
			learn: day.learn,
			practice: day.practice,
			review: day.review,
			minutes: day.minutes,
			completed: day.completedAt !== null
		}))
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
		return { resumed: result };
	},

	cancel: async ({ locals, params }) => {
		const user = requireUser(locals);
		const stopped = await planService.cancelPlan(user.id, params.id);
		if (!stopped) return fail(409, { message: 'The plan is not being written right now.' });
		return { cancelled: true };
	},

	delete: async ({ locals, params }) => {
		const user = requireUser(locals);
		await planService.cancelPlan(user.id, params.id);
		const removed = await planStore.deleteOwnedPlan(user.id, params.id);
		if (!removed) error(404, 'Plan not found');
		redirect(303, '/plans');
	}
};
