import { Redis } from 'ioredis';
import { logger } from '../logger.js';
import { createEventBus, type PlanEvent } from './events.js';

export function createRedisEventBus(url: string, channel = 'plan-events') {
	const local = createEventBus();
	const publisher = new Redis(url, { maxRetriesPerRequest: null });
	const subscriber = new Redis(url, { maxRetriesPerRequest: null });

	subscriber.on('message', (_channel, message) => {
		try {
			local.emit(JSON.parse(message) as PlanEvent);
		} catch (error) {
			logger.warn({ err: error }, 'Ignored an unreadable plan event');
		}
	});
	void subscriber.subscribe(channel).catch((error) => {
		logger.error({ err: error }, 'Could not subscribe to plan events');
	});

	return {
		emit(event: PlanEvent) {
			publisher.publish(channel, JSON.stringify(event)).catch((error) => {
				logger.warn({ err: error }, 'Could not publish a plan event');
			});
		},
		subscribe: local.subscribe,
		subscriberCount: local.subscriberCount,
		async close() {
			subscriber.disconnect();
			publisher.disconnect();
		}
	};
}
