import { error, json } from '@sveltejs/kit';
import { planStore, revisionStore } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';
import { MESSAGES } from '#lib/messages.js';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requireUser(locals);
	const plan = await planStore.getOwnedPlan(user.id, params.id);
	if (!plan) error(404, MESSAGES.planNotFound);

	const revisions = await revisionStore.listRevisions(plan.id);
	return json({ current: plan.currentRevision, revisions });
};
