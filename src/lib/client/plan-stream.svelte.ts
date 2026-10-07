import { createContext } from 'svelte';
import {
	applyLiveEvent,
	needsRefetch,
	writingLabel,
	type LiveEvent,
	type LiveState
} from '#lib/plan-live.js';

export class PlanStream {
	live = $state.raw<LiveState>({ status: 'generating', error: null, blocks: {} });
	connected = $state(false);
	totalBlocks = $state(0);

	readonly planId: string;
	#onChange: () => void;
	#source: EventSource | null = null;
	#hasConnected = false;

	constructor(planId: string, initial: LiveState, onChange: () => void) {
		this.planId = planId;
		this.live = initial;
		this.#onChange = onChange;
	}

	get label(): string {
		return writingLabel(this.live, this.totalBlocks);
	}

	sync(initial: LiveState, totalBlocks: number) {
		this.live = initial;
		this.totalBlocks = totalBlocks;
	}

	open(): () => void {
		this.close();
		const source = new EventSource(`/plans/${this.planId}/events`);
		this.#source = source;

		source.onopen = () => {
			this.connected = true;
		};
		source.onerror = () => {
			this.connected = false;
		};
		source.onmessage = (message) => {
			let event: LiveEvent;
			try {
				event = JSON.parse(message.data) as LiveEvent;
			} catch {
				return;
			}
			const isReconnectSnapshot = event.type === 'snapshot' && this.#hasConnected;
			if (event.type === 'snapshot') this.#hasConnected = true;
			this.live = applyLiveEvent(this.live, event);
			if (isReconnectSnapshot || (event.type !== 'snapshot' && needsRefetch(event))) {
				this.#onChange();
			}
		};

		return () => this.close();
	}

	close() {
		this.#source?.close();
		this.#source = null;
		this.connected = false;
		this.#hasConnected = false;
	}
}

export const [getPlanStream, setPlanStream] = createContext<PlanStream>();
