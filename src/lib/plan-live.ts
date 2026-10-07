import type { BlockStatus, PlanStatus } from './plan-types.js';

export type PlanEvent =
	| { type: 'outline_ready'; planId: string }
	| { type: 'block_started'; planId: string; index: number }
	| { type: 'block_ready'; planId: string; index: number }
	| { type: 'block_failed'; planId: string; index: number; message: string }
	| { type: 'paused'; planId: string }
	| { type: 'failed'; planId: string; message: string }
	| { type: 'done'; planId: string };

export interface SnapshotEvent {
	type: 'snapshot';
	planId: string;
	status: PlanStatus;
	error: string | null;
	blocks: { index: number; status: BlockStatus; error: string | null }[];
}

export type LiveEvent = PlanEvent | SnapshotEvent;

export interface LiveBlock {
	status: BlockStatus;
	error: string | null;
}

export interface LiveState {
	status: PlanStatus;
	error: string | null;
	blocks: Record<number, LiveBlock>;
}

export function applyLiveEvent(state: LiveState, event: LiveEvent): LiveState {
	switch (event.type) {
		case 'snapshot':
			return {
				status: event.status,
				error: event.error,
				blocks: Object.fromEntries(
					event.blocks.map((block) => [block.index, { status: block.status, error: block.error }])
				)
			};
		case 'outline_ready':
			return { ...state, status: 'generating', error: null };
		case 'block_started':
			return {
				...state,
				status: 'generating',
				blocks: { ...state.blocks, [event.index]: { status: 'writing', error: null } }
			};
		case 'block_ready':
			return {
				...state,
				blocks: { ...state.blocks, [event.index]: { status: 'ready', error: null } }
			};
		case 'block_failed':
			return {
				...state,
				blocks: { ...state.blocks, [event.index]: { status: 'failed', error: event.message } }
			};
		case 'paused':
			return {
				...state,
				status: 'paused',
				blocks: Object.fromEntries(
					Object.entries(state.blocks).map(([index, block]) => [
						index,
						block.status === 'writing' ? { status: 'pending', error: null } : block
					])
				)
			};
		case 'failed':
			return { ...state, status: 'failed', error: event.message };
		case 'done':
			return { ...state, status: 'ready', error: null };
	}
}

export function needsRefetch(event: LiveEvent): boolean {
	return event.type !== 'block_started';
}

export function writingLabel(state: LiveState, totalBlocks: number): string {
	if (state.status === 'paused') return 'Paused';
	if (state.status === 'failed') return 'Stopped';
	if (state.status === 'ready') return 'Done';
	if (totalBlocks === 0) return 'Planning the outline';
	const writing = Object.entries(state.blocks).find(([, block]) => block.status === 'writing');
	if (writing) return `Writing block ${Number(writing[0]) + 1} of ${totalBlocks}`;
	const ready = Object.values(state.blocks).filter((block) => block.status === 'ready').length;
	return `${ready} of ${totalBlocks} blocks written`;
}
