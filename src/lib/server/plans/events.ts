export type PlanEvent =
	| { type: 'outline_ready'; planId: string }
	| { type: 'block_started'; planId: string; index: number }
	| { type: 'block_ready'; planId: string; index: number }
	| { type: 'block_failed'; planId: string; index: number; message: string }
	| { type: 'paused'; planId: string }
	| { type: 'failed'; planId: string; message: string }
	| { type: 'done'; planId: string };

export type PlanListener = (event: PlanEvent) => void;

export function createEventBus() {
	const listeners = new Map<string, Set<PlanListener>>();

	return {
		emit(event: PlanEvent) {
			for (const listener of listeners.get(event.planId) ?? []) {
				try {
					listener(event);
				} catch {
					// a failing subscriber must never stop generation
				}
			}
		},

		subscribe(planId: string, listener: PlanListener): () => void {
			let set = listeners.get(planId);
			if (!set) {
				set = new Set();
				listeners.set(planId, set);
			}
			set.add(listener);
			return () => {
				set.delete(listener);
				if (set.size === 0) listeners.delete(planId);
			};
		},

		subscriberCount(planId: string): number {
			return listeners.get(planId)?.size ?? 0;
		}
	};
}

export type EventBus = ReturnType<typeof createEventBus>;
