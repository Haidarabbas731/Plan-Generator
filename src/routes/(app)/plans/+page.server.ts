import { planStore } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import { listKeys } from '#lib/server/services/provider-keys.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const [keys, plans] = await Promise.all([
		listKeys(user.id),
		planStore.listPlanSummaries(user.id)
	]);
	return { hasKeys: keys.length > 0, plans };
};
