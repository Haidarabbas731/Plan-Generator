import { describe, expect, it, vi } from 'vitest';
import { createPlanService } from './plan-service.js';
import type { PlanStore } from './plan-store.js';
import type { PlanWorker } from './worker.js';

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
	options: { hasKey?: boolean; count?: number; owned?: boolean; limit?: number } = {}
) {
	const store = {
		createPlan: vi.fn(async () => 'plan-1'),
		countPlans: vi.fn(async () => options.count ?? 0),
		getOwnedPlan: vi.fn(async () => (options.owned === false ? undefined : { id: 'plan-1' }))
	} as unknown as PlanStore;
	const worker = {
		start: vi.fn(async () => 'started'),
		cancel: vi.fn(() => true)
	} as unknown as PlanWorker;
	const service = createPlanService({
		store,
		worker,
		hasKey: async () => options.hasKey ?? true,
		planLimit: options.limit
	});
	return { store, worker, service };
}

describe('plan service', () => {
	it('creates the plan and starts the worker', async () => {
		const { service, worker } = setup();
		expect(await service.createAndStartPlan('u1', request)).toEqual({ ok: true, planId: 'plan-1' });
		expect(worker.start).toHaveBeenCalledWith('plan-1');
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
		const { service, worker } = setup({ owned: false });
		expect(await service.resumePlan('u2', 'plan-1')).toBe('not-found');
		expect(await service.cancelPlan('u2', 'plan-1')).toBe(false);
		expect(worker.start).not.toHaveBeenCalled();
		expect(worker.cancel).not.toHaveBeenCalled();
	});

	it('resumes and cancels for the owner', async () => {
		const { service } = setup();
		expect(await service.resumePlan('u1', 'plan-1')).toBe('started');
		expect(await service.cancelPlan('u1', 'plan-1')).toBe(true);
	});
});
