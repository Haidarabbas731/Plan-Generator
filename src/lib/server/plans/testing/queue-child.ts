import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createFakeModel } from '../../ai/fake-model.js';
import * as schema from '../../db/schema.js';
import { createPlanQueue } from '../plan-queue.js';
import { createPlanStore } from '../plan-store.js';
import { createRedisEventBus } from '../redis-events.js';
import { createPlanWorker } from '../worker.js';

const { DATABASE_URL, REDIS_URL, QUEUE_NAME, DELAY_MS } = process.env;

const client = postgres(DATABASE_URL!, { max: 4 });
const store = createPlanStore(drizzle(client, { schema }));
const bus = createRedisEventBus(REDIS_URL!, `${QUEUE_NAME}-events`);
const worker = createPlanWorker({
	client,
	store,
	bus,
	resolveModel: async () => createFakeModel({ delayMs: Number(DELAY_MS ?? 0) })
});

createPlanQueue({
	url: REDIS_URL!,
	worker,
	store,
	bus,
	name: QUEUE_NAME,
	lockDurationMs: 1500,
	stalledIntervalMs: 500
});

console.log('ready');
