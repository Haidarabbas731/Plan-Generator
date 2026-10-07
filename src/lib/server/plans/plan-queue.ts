import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PLAN_QUEUE } from '../config.js';
import { logger } from '../logger.js';
import type { EventBus } from './events.js';
import type { PlanStore } from './plan-store.js';
import type { PlanWorker } from './worker.js';

export interface PlanQueueDeps {
	url: string;
	worker: PlanWorker;
	store: PlanStore;
	bus: EventBus;
	name?: string;
	concurrency?: number;
	lockDurationMs?: number;
	stalledIntervalMs?: number;
}

const ACTIVE_STATES = new Set(['waiting', 'active', 'delayed', 'prioritized', 'waiting-children']);

export function createPlanQueue(deps: PlanQueueDeps) {
	const { url, worker, store, bus } = deps;
	const name = deps.name ?? 'plan-generation';
	const cancelChannel = `${name}:cancel`;
	const connect = () => new Redis(url, { maxRetriesPerRequest: null });

	const queue = new Queue(name, { connection: connect() });
	const publisher = connect();
	const subscriber = connect();

	const processor = new Worker<{ planId: string }>(
		name,
		async (job) => {
			await worker.run(job.data.planId, { countUsage: job.stalledCounter === 0 });
		},
		{
			connection: connect(),
			concurrency: deps.concurrency ?? PLAN_QUEUE.concurrency,
			lockDuration: deps.lockDurationMs ?? PLAN_QUEUE.lockDurationMs,
			stalledInterval: deps.stalledIntervalMs ?? PLAN_QUEUE.stalledIntervalMs,
			maxStalledCount: PLAN_QUEUE.maxStalledCount
		}
	);
	processor.on('error', (error) => logger.error({ err: error }, 'Plan queue worker error'));
	processor.on('failed', (job, error) => {
		const planId = job?.data.planId;
		if (!planId) return;
		logger.error({ err: error, planId }, 'Plan job failed');
		void store
			.setPlanStatus(planId, 'paused')
			.then(() => bus.emit({ type: 'paused', planId }))
			.catch((err) => logger.error({ err, planId }, 'Could not pause a plan after a failed job'));
	});

	subscriber.on('message', (_channel, planId) => {
		worker.cancel(planId);
	});
	void subscriber.subscribe(cancelChannel).catch((error) => {
		logger.error({ err: error }, 'Could not subscribe to plan cancellations');
	});

	async function enqueue(planId: string): Promise<void> {
		await queue.add(
			'generate',
			{ planId },
			{ jobId: planId, removeOnComplete: true, removeOnFail: true, attempts: 1 }
		);
	}

	async function cancel(planId: string): Promise<boolean> {
		const job = await queue.getJob(planId);
		if (!job) return false;
		if (await job.isWaiting()) {
			await job.remove();
			await store.setPlanStatus(planId, 'paused');
			bus.emit({ type: 'paused', planId });
			return true;
		}
		if (await job.isActive()) {
			await publisher.publish(cancelChannel, planId);
			return true;
		}
		return false;
	}

	async function recoverInterruptedPlans(): Promise<number> {
		const generating = await store.listGeneratingPlanIds();
		const orphaned: string[] = [];
		for (const planId of generating) {
			const job = await queue.getJob(planId);
			const state = job ? await job.getState() : null;
			if (!state || !ACTIVE_STATES.has(state)) orphaned.push(planId);
		}
		if (orphaned.length === 0) return 0;
		return store.markGeneratingPlansPaused(orphaned);
	}

	return {
		enqueue,
		cancel,
		recoverInterruptedPlans,
		async close(force = false) {
			await processor.close(force);
			await queue.close();
			subscriber.disconnect();
			publisher.disconnect();
		}
	};
}

export type PlanQueue = ReturnType<typeof createPlanQueue>;
