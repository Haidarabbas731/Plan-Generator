import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveEvent, LiveState } from '#lib/plan-live.js';
import { PlanStream } from './plan-stream.svelte.js';

class FakeEventSource {
	static instances: FakeEventSource[] = [];
	onopen: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onmessage: ((message: { data: string }) => void) | null = null;
	closed = false;

	constructor(public url: string) {
		FakeEventSource.instances.push(this);
	}

	close() {
		this.closed = true;
	}

	send(event: LiveEvent) {
		this.onmessage?.({ data: JSON.stringify(event) });
	}
}

const initial: LiveState = { status: 'generating', error: null, blocks: {} };
const snapshot = (status: LiveState['status'] = 'generating'): LiveEvent => ({
	type: 'snapshot',
	planId: 'p1',
	status,
	error: null,
	blocks: []
});

describe('PlanStream', () => {
	beforeEach(() => {
		FakeEventSource.instances = [];
		vi.stubGlobal('EventSource', FakeEventSource);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('connects to the plan event stream', () => {
		const stream = new PlanStream('p1', initial, () => {});
		stream.open();
		expect(FakeEventSource.instances[0].url).toBe('/plans/p1/events');
	});

	it('does not refetch for the first snapshot or for a block that only started', () => {
		const onChange = vi.fn();
		new PlanStream('p1', initial, onChange).open();
		const source = FakeEventSource.instances[0];
		source.send(snapshot());
		source.send({ type: 'block_started', planId: 'p1', index: 0 });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('refetches when a block is ready', () => {
		const onChange = vi.fn();
		new PlanStream('p1', initial, onChange).open();
		const source = FakeEventSource.instances[0];
		source.send(snapshot());
		source.send({ type: 'block_ready', planId: 'p1', index: 0 });
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('refetches on a snapshot that arrives after a reconnect', () => {
		const onChange = vi.fn();
		new PlanStream('p1', initial, onChange).open();
		const source = FakeEventSource.instances[0];
		source.send(snapshot());
		source.send(snapshot());
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('updates the live state and the label from events', () => {
		const stream = new PlanStream('p1', initial, () => {});
		stream.totalBlocks = 18;
		stream.open();
		FakeEventSource.instances[0].send({ type: 'block_started', planId: 'p1', index: 5 });
		expect(stream.live.blocks[5].status).toBe('writing');
		expect(stream.label).toBe('Writing block 6 of 18');
	});

	it('ignores messages that are not JSON', () => {
		const onChange = vi.fn();
		new PlanStream('p1', initial, onChange).open();
		FakeEventSource.instances[0].onmessage?.({ data: 'not json' });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('closes the connection on cleanup', () => {
		const stream = new PlanStream('p1', initial, () => {});
		const cleanup = stream.open();
		cleanup();
		expect(FakeEventSource.instances[0].closed).toBe(true);
		expect(stream.connected).toBe(false);
	});

	it('tracks the connection state', () => {
		const stream = new PlanStream('p1', initial, () => {});
		stream.open();
		const source = FakeEventSource.instances[0];
		source.onopen?.();
		expect(stream.connected).toBe(true);
		source.onerror?.();
		expect(stream.connected).toBe(false);
	});
});
