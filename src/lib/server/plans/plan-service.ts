import { validatePlanRequest } from '#lib/plan-validation.js';
import type { Provider } from '#lib/providers.js';
import type { PlanStore } from './plan-store.js';
import type { PlanWorker, StartResult } from './worker.js';

export type CreatePlanResult =
	| { ok: true; planId: string }
	| { ok: false; reason: 'invalid'; errors: Record<string, string> }
	| { ok: false; reason: 'no-key'; provider: Provider }
	| { ok: false; reason: 'limit' };

export type ControlResult = 'started' | 'already-running' | 'not-found' | 'no-key' | 'locked';

export interface PlanServiceDeps {
	store: PlanStore;
	worker: PlanWorker;
	hasKey: (userId: string, provider: Provider) => Promise<boolean>;
	planLimit?: number;
}

export function createPlanService(deps: PlanServiceDeps) {
	const { store, worker, hasKey, planLimit } = deps;

	async function createAndStartPlan(
		userId: string,
		raw: Record<string, unknown>
	): Promise<CreatePlanResult> {
		const parsed = validatePlanRequest(raw);
		if ('errors' in parsed) return { ok: false, reason: 'invalid', errors: parsed.errors };

		const { inputs, provider, model, startDate } = parsed.value;
		if (!(await hasKey(userId, provider))) return { ok: false, reason: 'no-key', provider };
		if (planLimit !== undefined && (await store.countPlans(userId)) >= planLimit) {
			return { ok: false, reason: 'limit' };
		}

		const planId = await store.createPlan(userId, { inputs, provider, model, startDate });
		await worker.start(planId);
		return { ok: true, planId };
	}

	async function resumePlan(userId: string, planId: string): Promise<ControlResult> {
		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return 'not-found';
		const result: StartResult = await worker.start(planId);
		return result;
	}

	async function cancelPlan(userId: string, planId: string): Promise<boolean> {
		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return false;
		return worker.cancel(planId);
	}

	return { createAndStartPlan, resumePlan, cancelPlan };
}

export type PlanService = ReturnType<typeof createPlanService>;
