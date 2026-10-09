import { describe, expect, it } from 'vitest';
import {
	lastEditRevision,
	lastEditRevisionId,
	recoveredStepKeys,
	stepsOf,
	textOf,
	toAgentStep,
	type ChatUIMessage
} from './chat-types.js';

const message = (parts: unknown[], role: 'user' | 'assistant' = 'assistant'): ChatUIMessage =>
	({ id: 'm', role, parts }) as ChatUIMessage;

describe('toAgentStep', () => {
	it('ignores parts that are not tool calls', () => {
		expect(toAgentStep({ type: 'text' })).toBeNull();
		expect(toAgentStep({ type: 'step-start' })).toBeNull();
	});

	it('describes a rewrite that is still running', () => {
		const step = toAgentStep({
			type: 'tool-revise_blocks',
			toolCallId: 'c1',
			state: 'input-available',
			input: { fromBlock: 3, toBlock: 4, instruction: 'x' }
		});
		expect(step).toMatchObject({ state: 'running', label: 'Rewriting blocks 3–4' });
	});

	it('uses the singular for one block', () => {
		const step = toAgentStep({
			type: 'tool-revise_blocks',
			state: 'input-streaming',
			input: { fromBlock: 2, toBlock: 2 }
		});
		expect(step?.label).toBe('Rewriting block 2');
	});

	it('labels the other tools while they run', () => {
		expect(toAgentStep({ type: 'tool-get_plan', state: 'input-available' })?.label).toBe(
			'Reading the plan'
		);
		expect(toAgentStep({ type: 'tool-restructure_outline', state: 'input-available' })?.label).toBe(
			'Changing the outline'
		);
		expect(toAgentStep({ type: 'tool-update_schedule', state: 'input-available' })?.label).toBe(
			'Updating the schedule'
		);
	});

	it('reports a finished edit with its revision and stale blocks', () => {
		const step = toAgentStep({
			type: 'tool-revise_blocks',
			toolCallId: 'c1',
			state: 'output-available',
			output: { ok: true, summary: 'Rewrote block 2.', revisionId: 'r2', staleBlocks: [3, 4] }
		});
		expect(step).toMatchObject({
			state: 'done',
			label: 'Rewrote block 2',
			revisionId: 'r2',
			staleBlocks: [3, 4]
		});
	});

	it('reports an edit that changed nothing', () => {
		const step = toAgentStep({
			type: 'tool-revise_blocks',
			state: 'output-available',
			output: { ok: false, message: 'Rewrite at most 3 blocks at a time.' }
		});
		expect(step).toMatchObject({
			state: 'failed',
			label: 'Nothing was changed',
			detail: 'Rewrite at most 3 blocks at a time.',
			revisionId: null
		});
	});

	it('reports a tool error', () => {
		const step = toAgentStep({
			type: 'tool-update_schedule',
			state: 'output-error',
			errorText: 'boom'
		});
		expect(step).toMatchObject({ state: 'failed', detail: 'boom' });
	});

	it('treats reading the plan as a done step without a revision', () => {
		const step = toAgentStep({ type: 'tool-get_plan', state: 'output-available', output: {} });
		expect(step).toMatchObject({ state: 'done', label: 'Read the plan', revisionId: null });
	});
});

describe('message helpers', () => {
	it('joins the text parts of a message', () => {
		expect(
			textOf(
				message([
					{ type: 'text', text: 'Hello ' },
					{ type: 'step-start' },
					{ type: 'text', text: 'there' }
				])
			)
		).toBe('Hello there');
	});

	it('lists only tool steps in order', () => {
		const steps = stepsOf(
			message([
				{ type: 'text', text: 'ok' },
				{ type: 'tool-get_plan', toolCallId: 'a', state: 'output-available', output: {} },
				{
					type: 'tool-update_schedule',
					toolCallId: 'b',
					state: 'output-available',
					output: { ok: true, revisionId: 'r1' }
				}
			])
		);
		expect(steps.map((step) => step.tool)).toEqual(['get_plan', 'update_schedule']);
	});

	it('finds the revision of the latest edit, ignoring failed ones', () => {
		const messages = [
			message([
				{
					type: 'tool-revise_blocks',
					toolCallId: 'a',
					state: 'output-available',
					output: { ok: true, revisionId: 'r2' }
				}
			]),
			message([
				{
					type: 'tool-revise_blocks',
					toolCallId: 'b',
					state: 'output-available',
					output: { ok: false, message: 'no' }
				}
			])
		];
		expect(lastEditRevisionId(messages)).toBe('r2');
	});

	it('finds nothing when no edit happened', () => {
		expect(lastEditRevisionId([message([{ type: 'text', text: 'hi' }])])).toBeNull();
		expect(lastEditRevisionId([])).toBeNull();
	});

	it('returns the number of the latest edit revision next to its id', () => {
		const messages = [
			message([
				{
					type: 'tool-revise_blocks',
					toolCallId: 'a',
					state: 'output-available',
					output: { ok: true, revisionId: 'r2', revisionNumber: 2 }
				}
			])
		];
		expect(lastEditRevision(messages)).toEqual({ id: 'r2', number: 2 });
	});
});

describe('recoveredStepKeys', () => {
	const failed = {
		type: 'tool-revise_blocks',
		toolCallId: 'a',
		state: 'output-error',
		errorText: 'boom'
	};
	const done = (id: string, tool = 'revise_blocks') => ({
		type: `tool-${tool}`,
		toolCallId: id,
		state: 'output-available',
		output: { ok: true, revisionId: 'r1' }
	});

	it('marks a failed step that the same tool later completed', () => {
		const steps = stepsOf(message([failed, done('b')]));
		expect([...recoveredStepKeys(steps)]).toEqual(['a']);
	});

	it('keeps a failure nothing recovered', () => {
		expect(recoveredStepKeys(stepsOf(message([failed])))).toEqual(new Set());
	});

	it('does not count a different tool or an earlier success', () => {
		expect(recoveredStepKeys(stepsOf(message([failed, done('b', 'get_plan')])))).toEqual(new Set());
		expect(recoveredStepKeys(stepsOf(message([done('b'), failed])))).toEqual(new Set());
	});
});
