import type { PlanEvent } from '#lib/plan-live.js';
import { validatePlanRequest } from '#lib/plan-validation.js';
import type { Provider } from '#lib/providers.js';
import { limitMessage, type UsageGuard } from '../usage-guard.js';
import type { PlanStore } from './plan-store.js';
import type { PlanQueue } from './plan-queue.js';

export type CreatePlanResult =
	| { ok: true; planId: string }
	| { ok: false; reason: 'invalid'; errors: Record<string, string> }
	| { ok: false; reason: 'no-key'; provider: Provider }
	| { ok: false; reason: 'limit' }
	| { ok: false; reason: 'rate-limit'; retryInMinutes: number; message: string };

export type ControlResult =
	| 'queued'
	| 'already-running'
	| 'not-found'
	| { status: 'rate-limit'; retryInMinutes: number; message: string };

export interface PlanServiceDeps {
	store: PlanStore;
	queue: Pick<PlanQueue, 'enqueue' | 'cancel'>;
	hasKey: (userId: string, provider: Provider) => Promise<boolean>;
	emit?: (event: PlanEvent) => void;
	planLimit?: number;
	guard?: Pick<UsageGuard, 'check'>;
}

export function createPlanService(deps: PlanServiceDeps) {
	const { store, queue, hasKey, emit, planLimit, guard } = deps;

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
		const allowance = await guard?.check(userId);
		if (allowance && !allowance.ok) {
			return {
				ok: false,
				reason: 'rate-limit',
				retryInMinutes: allowance.retryInMinutes,
				message: limitMessage(allowance)
			};
		}

		const planId = await store.createPlan(userId, { inputs, provider, model, startDate });
		await queue.enqueue(planId);
		return { ok: true, planId };
	}

	async function resumePlan(userId: string, planId: string): Promise<ControlResult> {
		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return 'not-found';
		if (plan.status === 'generating') return 'already-running';
		const allowance = await guard?.check(userId);
		if (allowance && !allowance.ok) {
			return {
				status: 'rate-limit',
				retryInMinutes: allowance.retryInMinutes,
				message: limitMessage(allowance)
			};
		}
		await store.setPlanStatus(planId, 'generating');
		await queue.enqueue(planId);
		return 'queued';
	}

	async function cancelPlan(userId: string, planId: string): Promise<boolean> {
		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return false;
		if (await queue.cancel(planId)) return true;
		if (plan.status !== 'generating') return false;
		await store.setPlanStatus(planId, 'paused');
		emit?.({ type: 'paused', planId });
		return true;
	}

	return { createAndStartPlan, resumePlan, cancelPlan };
}

export type PlanService = ReturnType<typeof createPlanService>;
