import { fail } from '@sveltejs/kit';
import { appLimits } from '#lib/server/app-limits.js';
import { planService, planStore } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import { listKeys } from '#lib/server/services/provider-keys.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const [keys, plans] = await Promise.all([
		listKeys(user.id),
		planStore.listPlanSummaries(user.id)
	]);
	return { hasKeys: keys.length > 0, plans, planLimit: appLimits.plansPerUser };
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const planId = String(form.get('planId') ?? '');
		if (!planId) return fail(400, { message: 'Choose a plan to delete.' });

		await planService.cancelPlan(user.id, planId);
		const removed = await planStore.deleteOwnedPlan(user.id, planId);
		if (!removed) return fail(404, { message: 'That plan no longer exists.' });
		return { deleted: planId };
	}
};
