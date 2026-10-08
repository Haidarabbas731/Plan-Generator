import { AI_FAKE, REDIS_URL } from '$app/env/private';
import { appLimits } from '../app-limits.js';
import { createFakeModel } from '../ai/fake-model.js';
import { createFakeChatModel } from '../ai/fake-chat-model.js';
import { createLanguageModel } from '../ai/models.js';
import { client, db } from '../db/index.js';
import { getKey } from '../services/provider-keys.js';
import { createChatService, MissingChatKeyError } from '../chat/chat-service.js';
import { createChatStore } from '../chat/chat-store.js';
import { createPlanEditor } from '../chat/plan-editor.js';
import { createPlanQueue } from './plan-queue.js';
import { createPlanService } from './plan-service.js';
import { createPlanStore } from './plan-store.js';
import { createRedisEventBus } from './redis-events.js';
import { createUsageGuard } from '../usage-guard.js';
import { createRevisionStore } from './revisions.js';
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

export const usageGuard = createUsageGuard({ store: planStore, cap: appLimits.aiPerHour });

export const planService = createPlanService({
	store: planStore,
	guard: usageGuard,
	planLimit: appLimits.plansPerUser,
	queue: planQueue,
	emit: (event) => planBus.emit(event),
	hasKey: async (userId, provider) => AI_FAKE || (await getKey(userId, provider)) !== null
});

export const revisionStore = createRevisionStore(db);
export const chatStore = createChatStore(db);
export const planEditor = createPlanEditor({ db, store: planStore });

export const chatService = createChatService({
	store: planStore,
	chatStore,
	editor: planEditor,
	guard: usageGuard,
	maxMessageChars: appLimits.chatChars,
	resolveModel: async (plan) => {
		if (AI_FAKE) return createFakeChatModel();
		const key = await getKey(plan.userId, plan.provider);
		if (!key) throw new MissingChatKeyError(plan.provider);
		return createLanguageModel(plan.provider, plan.model, key);
	}
});
