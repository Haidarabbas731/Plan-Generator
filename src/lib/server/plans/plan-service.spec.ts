import { describe, expect, it, vi } from 'vitest';
import { createPlanService } from './plan-service.js';
import type { PlanStore } from './plan-store.js';

const request = {
	goal: 'Learn Rust basics',
	level: 'beginner',
	doneLooksLike: '',
	daysTotal: '30',
	minutesPerDay: '60',
	studyDays: [1, 2, 3, 4, 5],
	blockSize: '5',
	startDate: '2026-10-08',
	provider: 'google',
	model: 'gemini-test'
};

function setup(
	options: {
		hasKey?: boolean;
		count?: number;
		owned?: boolean;
		limit?: number;
		status?: string;
		cancelResult?: boolean;
		blockedFor?: number;
	} = {}
) {
	const store = {
		createPlan: vi.fn(async () => 'plan-1'),
		countPlans: vi.fn(async () => options.count ?? 0),
		getOwnedPlan: vi.fn(async () =>
			options.owned === false ? undefined : { id: 'plan-1', status: options.status ?? 'paused' }
		),
		setPlanStatus: vi.fn(async () => undefined)
	} as unknown as PlanStore;
	const queue = {
		enqueue: vi.fn(async () => undefined),
		cancel: vi.fn(async () => options.cancelResult ?? true)
	};
	const emit = vi.fn();
	const service = createPlanService({
		store,
		queue,
		emit,
		hasKey: async () => options.hasKey ?? true,
		planLimit: options.limit,
		guard: {
			check: async () =>
				options.blockedFor === undefined
					? { ok: true, used: 1, cap: 30 }
					: { ok: false, used: 30, cap: 30, retryInMinutes: options.blockedFor }
		}
	});
	return { store, queue, service, emit };
}

describe('plan service', () => {
	it('creates the plan and starts the worker', async () => {
		const { service, queue } = setup();
		expect(await service.createAndStartPlan('u1', request)).toEqual({ ok: true, planId: 'plan-1' });
		expect(queue.enqueue).toHaveBeenCalledWith('plan-1');
	});

	it('returns field errors for an invalid request without creating anything', async () => {
		const { service, store } = setup();
		const result = await service.createAndStartPlan('u1', { ...request, goal: '' });
		expect(result).toMatchObject({ ok: false, reason: 'invalid' });
		expect(store.createPlan).not.toHaveBeenCalled();
	});

	it('requires a saved key for the chosen provider', async () => {
		const { service, store } = setup({ hasKey: false });
		expect(await service.createAndStartPlan('u1', request)).toEqual({
			ok: false,
			reason: 'no-key',
			provider: 'google'
		});
		expect(store.createPlan).not.toHaveBeenCalled();
	});

	it('refuses new plans over the limit', async () => {
		const { service } = setup({ count: 3, limit: 3 });
		expect(await service.createAndStartPlan('u1', request)).toEqual({ ok: false, reason: 'limit' });
	});

	it('only lets the owner resume or cancel', async () => {
		const { service, queue } = setup({ owned: false });
		expect(await service.resumePlan('u2', 'plan-1')).toBe('not-found');
		expect(await service.cancelPlan('u2', 'plan-1')).toBe(false);
		expect(queue.enqueue).not.toHaveBeenCalled();
		expect(queue.cancel).not.toHaveBeenCalled();
	});

	it('resumes and cancels for the owner', async () => {
		const { service } = setup();
		expect(await service.resumePlan('u1', 'plan-1')).toBe('queued');
		expect(await service.cancelPlan('u1', 'plan-1')).toBe(true);
	});

	it('does not queue a plan that is already generating', async () => {
		const { service, queue } = setup({ status: 'generating' });
		expect(await service.resumePlan('u1', 'plan-1')).toBe('already-running');
		expect(queue.enqueue).not.toHaveBeenCalled();
	});

	it('pauses a plan that says it is generating but has no job', async () => {
		const { service, store, emit } = setup({ cancelResult: false, status: 'generating' });
		expect(await service.cancelPlan('u1', 'plan-1')).toBe(true);
		expect(store.setPlanStatus).toHaveBeenCalledWith('plan-1', 'paused');
		expect(emit).toHaveBeenCalledWith({ type: 'paused', planId: 'plan-1' });
	});

	it('refuses to pause a plan that is not generating and has no job', async () => {
		const { service, store, emit } = setup({ cancelResult: false, status: 'ready' });
		expect(await service.cancelPlan('u1', 'plan-1')).toBe(false);
		expect(store.setPlanStatus).not.toHaveBeenCalled();
		expect(emit).not.toHaveBeenCalled();
	});

	it('refuses to start a plan while the hourly AI cap is reached', async () => {
		const { service, store, queue } = setup({ blockedFor: 12 });
		const result = await service.createAndStartPlan('u1', request);
		expect(result).toMatchObject({ ok: false, reason: 'rate-limit', retryInMinutes: 12 });
		expect(store.createPlan).not.toHaveBeenCalled();
		expect(queue.enqueue).not.toHaveBeenCalled();
	});

	it('refuses to resume a plan while the hourly AI cap is reached', async () => {
		const { service, queue } = setup({ blockedFor: 3 });
		const result = await service.resumePlan('u1', 'plan-1');
		expect(result).toMatchObject({ status: 'rate-limit', retryInMinutes: 3 });
		expect(queue.enqueue).not.toHaveBeenCalled();
	});
});
