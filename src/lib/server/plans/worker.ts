import type { LanguageModel } from 'ai';
import type { Sql } from 'postgres';
import { describeAiError } from '../ai/errors.js';
import type { EventBus } from './events.js';
import { runGeneration, type RunOutcome } from './generation.js';
import type { PlanRow, PlanStore } from './plan-store.js';

export class MissingKeyError extends Error {
	constructor(readonly provider: string) {
		super(`No saved key for ${provider}`);
		this.name = 'MissingKeyError';
	}
}

export type StartResult = 'started' | 'already-running' | 'locked' | 'not-found' | 'no-key';

export interface WorkerDeps {
	client: Sql;
	store: PlanStore;
	bus: EventBus;
	resolveModel: (plan: PlanRow) => Promise<LanguageModel>;
}

export function createPlanWorker(deps: WorkerDeps) {
	const { client, store, bus, resolveModel } = deps;
	const running = new Map<string, { controller: AbortController; done: Promise<RunOutcome> }>();

	async function start(planId: string): Promise<StartResult> {
		if (running.has(planId)) return 'already-running';

		const plan = await store.getPlan(planId);
		if (!plan) return 'not-found';

		const connection = await client.reserve();
		const [lock] = await connection`select pg_try_advisory_lock(hashtext(${planId})) as locked`;
		if (!lock.locked) {
			connection.release();
			return 'locked';
		}

		const unlock = async () => {
			try {
				await connection`select pg_advisory_unlock(hashtext(${planId}))`;
			} finally {
				connection.release();
			}
		};

		let model: LanguageModel;
		try {
			model = await resolveModel(plan);
		} catch (error) {
			const message =
				error instanceof MissingKeyError
					? 'Add a key for this provider in Settings, then resume.'
					: describeAiError(error);
			await store.setPlanStatus(planId, 'failed', message);
			bus.emit({ type: 'failed', planId, message });
			await unlock();
			return 'no-key';
		}

		await store.recordUsage(plan.userId, 'generation');

		const controller = new AbortController();
		const done = runGeneration({
			planId,
			store,
			model,
			signal: controller.signal,
			emit: bus.emit
		})
			.catch(async (error): Promise<RunOutcome> => {
				const message = describeAiError(error);
				await store.setPlanStatus(planId, 'failed', message).catch(() => undefined);
				bus.emit({ type: 'failed', planId, message });
				return 'failed';
			})
			.finally(async () => {
				running.delete(planId);
				await unlock();
			});

		running.set(planId, { controller, done });
		return 'started';
	}

	return {
		start,

		cancel(planId: string): boolean {
			const entry = running.get(planId);
			if (!entry) return false;
			entry.controller.abort();
			return true;
		},

		isRunning: (planId: string) => running.has(planId),

		whenIdle: async (planId: string): Promise<RunOutcome | null> =>
			(await running.get(planId)?.done) ?? null,

		subscribe: bus.subscribe
	};
}

export type PlanWorker = ReturnType<typeof createPlanWorker>;
