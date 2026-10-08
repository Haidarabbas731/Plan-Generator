import { describe, expect, it } from 'vitest';
import {
	applyLiveEvent,
	liveFromData,
	needsRefetch,
	sameLive,
	writingLabel,
	type LiveEvent,
	type LiveState
} from './plan-live.js';

const base: LiveState = { status: 'generating', error: null, blocks: {} };
const planId = 'p1';

describe('applyLiveEvent', () => {
	it('replaces everything from a snapshot', () => {
		const next = applyLiveEvent(base, {
			type: 'snapshot',
			planId,
			status: 'paused',
			error: null,
			blocks: [
				{ index: 0, status: 'ready', error: null },
				{ index: 1, status: 'failed', error: 'bad' }
			]
		});
		expect(next).toEqual({
			status: 'paused',
			error: null,
			blocks: {
				0: { status: 'ready', error: null },
				1: { status: 'failed', error: 'bad' }
			}
		});
	});

	it('marks a block writing and then ready', () => {
		const writing = applyLiveEvent(base, { type: 'block_started', planId, index: 2 });
		expect(writing.blocks[2]).toEqual({ status: 'writing', error: null });
		const ready = applyLiveEvent(writing, { type: 'block_ready', planId, index: 2 });
		expect(ready.blocks[2]).toEqual({ status: 'ready', error: null });
	});

	it('records a failed block with its message and keeps the plan running', () => {
		const next = applyLiveEvent(base, { type: 'block_failed', planId, index: 1, message: 'nope' });
		expect(next.status).toBe('generating');
		expect(next.blocks[1]).toEqual({ status: 'failed', error: 'nope' });
	});

	it('returns a writing block to pending when paused', () => {
		const writing = applyLiveEvent(base, { type: 'block_started', planId, index: 0 });
		const paused = applyLiveEvent(writing, { type: 'paused', planId });
		expect(paused.status).toBe('paused');
		expect(paused.blocks[0].status).toBe('pending');
	});

	it('keeps ready blocks when paused', () => {
		const state: LiveState = { ...base, blocks: { 0: { status: 'ready', error: null } } };
		expect(applyLiveEvent(state, { type: 'paused', planId }).blocks[0].status).toBe('ready');
	});

	it('stores the failure message of a failed plan', () => {
		expect(applyLiveEvent(base, { type: 'failed', planId, message: 'key rejected' })).toMatchObject(
			{
				status: 'failed',
				error: 'key rejected'
			}
		);
	});

	it('finishes the plan and clears the error', () => {
		const failed: LiveState = { ...base, status: 'failed', error: 'x' };
		expect(applyLiveEvent(failed, { type: 'done', planId })).toMatchObject({
			status: 'ready',
			error: null
		});
	});

	it('does not mutate the previous state', () => {
		const before = structuredClone(base);
		applyLiveEvent(base, { type: 'block_started', planId, index: 0 });
		expect(base).toEqual(before);
	});
});

describe('liveFromData', () => {
	it('builds the live state from loaded plan data', () => {
		expect(
			liveFromData({ status: 'paused', error: null }, [
				{ idx: 0, status: 'ready', error: null },
				{ idx: 1, status: 'failed', error: 'bad' }
			])
		).toEqual({
			status: 'paused',
			error: null,
			blocks: { 0: { status: 'ready', error: null }, 1: { status: 'failed', error: 'bad' } }
		});
	});

	it('handles a plan without blocks', () => {
		expect(liveFromData({ status: 'generating', error: null }, [])).toEqual({
			status: 'generating',
			error: null,
			blocks: {}
		});
	});
});

describe('needsRefetch', () => {
	const events: LiveEvent[] = [
		{ type: 'outline_ready', planId },
		{ type: 'block_ready', planId, index: 0 },
		{ type: 'block_failed', planId, index: 0, message: 'x' },
		{ type: 'paused', planId },
		{ type: 'failed', planId, message: 'x' },
		{ type: 'done', planId }
	];

	it('asks for fresh data when content or status changed', () => {
		for (const event of events) expect(needsRefetch(event)).toBe(true);
	});

	it('does not refetch when a block only starts', () => {
		expect(needsRefetch({ type: 'block_started', planId, index: 0 })).toBe(false);
	});
});

describe('writingLabel', () => {
	it('says the outline is being planned before blocks exist', () => {
		expect(writingLabel(base, 0)).toBe('Planning the outline');
	});

	it('names the block being written', () => {
		const state = applyLiveEvent(base, { type: 'block_started', planId, index: 5 });
		expect(writingLabel(state, 18)).toBe('Writing block 6 of 18');
	});

	it('counts written blocks between blocks', () => {
		const state: LiveState = {
			...base,
			blocks: { 0: { status: 'ready', error: null }, 1: { status: 'ready', error: null } }
		};
		expect(writingLabel(state, 4)).toBe('2 of 4 blocks written');
	});

	it('reports paused, stopped and done', () => {
		expect(writingLabel({ ...base, status: 'paused' }, 4)).toBe('Paused');
		expect(writingLabel({ ...base, status: 'failed' }, 4)).toBe('Stopped');
		expect(writingLabel({ ...base, status: 'ready' }, 4)).toBe('Done');
	});
});

describe('sameLive', () => {
	const ready = { status: 'ready' as const, error: null };
	it('is true for equal status and block states', () => {
		const a: LiveState = { ...base, blocks: { 0: { ...ready, status: 'ready' } } };
		expect(sameLive(a, { ...a })).toBe(true);
	});
	it('detects a different plan status', () => {
		expect(sameLive(base, { ...base, status: 'ready' })).toBe(false);
	});
	it('detects a block that changed or appeared', () => {
		const a: LiveState = { ...base, blocks: { 0: { status: 'writing', error: null } } };
		expect(sameLive(a, { ...a, blocks: { 0: { status: 'ready', error: null } } })).toBe(false);
		expect(sameLive(base, a)).toBe(false);
	});
});
