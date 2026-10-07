import { error, json } from '@sveltejs/kit';
import { planStore, revisionStore } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requireUser(locals);
	const plan = await planStore.getOwnedPlan(user.id, params.id);
	if (!plan) error(404, 'Plan not found');

	const revisions = await revisionStore.listRevisions(plan.id);
	return json({ current: plan.currentRevision, revisions });
};
