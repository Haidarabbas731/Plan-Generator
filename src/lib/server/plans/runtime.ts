import { AI_FAKE } from '$app/env/private';
import { createFakeModel } from '../ai/fake-model.js';
import { createLanguageModel } from '../ai/models.js';
import { client, db } from '../db/index.js';
import { getKey } from '../services/provider-keys.js';
import { createEventBus } from './events.js';
import { createPlanService } from './plan-service.js';
import { createPlanStore } from './plan-store.js';
import { createPlanWorker, MissingKeyError } from './worker.js';

export const planStore = createPlanStore(db);
export const planBus = createEventBus();

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

export const planService = createPlanService({
	store: planStore,
	worker: planWorker,
	hasKey: async (userId, provider) => AI_FAKE || (await getKey(userId, provider)) !== null
});
