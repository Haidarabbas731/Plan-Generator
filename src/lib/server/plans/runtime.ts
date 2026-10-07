import { AI_FAKE, REDIS_URL } from '$app/env/private';
import { createFakeModel } from '../ai/fake-model.js';
import { createLanguageModel } from '../ai/models.js';
import { client, db } from '../db/index.js';
import { getKey } from '../services/provider-keys.js';
import { createPlanQueue } from './plan-queue.js';
import { createPlanService } from './plan-service.js';
import { createPlanStore } from './plan-store.js';
import { createRedisEventBus } from './redis-events.js';
import { createPlanWorker, MissingKeyError } from './worker.js';

export const planStore = createPlanStore(db);
export const planBus = createRedisEventBus(REDIS_URL);

export const planWorker = createPlanWorker({
	client,
	store: planStore,
	bus: planBus,
	resolveModel: async (plan) => {
		if (AI_FAKE) return createFakeModel();
		const key = await getKey(plan.userId, plan.provider);
		if (!key) throw new MissingKeyError(plan.provider);
		return createLanguageModel(plan.provider, plan.model, key);
	}
});

export const planQueue = createPlanQueue({
	url: REDIS_URL,
	worker: planWorker,
	store: planStore,
	bus: planBus
});

export const planService = createPlanService({
	store: planStore,
	queue: planQueue,
	hasKey: async (userId, provider) => AI_FAKE || (await getKey(userId, provider)) !== null
});
