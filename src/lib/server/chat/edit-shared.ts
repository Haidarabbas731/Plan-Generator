import type { PlanRow, PlanStore } from '../plans/plan-store.js';
import type { WrittenRevision } from '../plans/revisions.js';

export type EditResult =
	| {
			ok: true;
			revision: WrittenRevision;
			summary: string;
			changedBlocks: number[];
			staleBlocks: number[];
	  }
	| { ok: false; message: string };

export const PLAN_GONE: EditResult = { ok: false, message: 'The plan no longer exists.' };

export async function loadEditablePlan(
	store: PlanStore,
	planId: string
): Promise<{ plan: PlanRow } | { blocked: EditResult }> {
	const plan = await store.getPlan(planId);
	if (!plan) return { blocked: PLAN_GONE };
	if (plan.status === 'generating') {
		return {
			blocked: { ok: false, message: 'The plan is still being written. Try again when it is done.' }
		};
	}
	return { plan };
}

export const shorten = (text: string, max = 80) =>
	text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
