import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { AgentStep as AgentStepData } from '#lib/chat-types.js';
import AgentStep from './agent-step.svelte';

const done: AgentStepData = {
	key: 'k',
	tool: 'revise_blocks',
	state: 'done',
	label: 'Rewrote block 2',
	detail: null,
	revisionId: 'r2',
	revisionNumber: 2,
	staleBlocks: []
};

describe('AgentStep', () => {
	it('shows a running step with an ellipsis and no undo', () => {
		render(AgentStep, {
			props: {
				step: { ...done, state: 'running', label: 'Rewriting block 2', revisionId: null },
				canUndo: true,
				onundo: () => {}
			}
		});
		expect(screen.getByText('Rewriting block 2…')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Undo/ })).not.toBeInTheDocument();
	});

	it('offers Undo on the latest change and reports its revision', async () => {
		const onundo = vi.fn();
		render(AgentStep, { props: { step: done, canUndo: true, onundo } });
		expect(screen.getByText('Rewrote block 2')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
		expect(onundo).toHaveBeenCalledWith('r2');
	});

	it('hides Undo for changes that are not the latest', () => {
		render(AgentStep, { props: { step: done, canUndo: false, onundo: () => {} } });
		expect(screen.queryByRole('button', { name: /Undo/ })).not.toBeInTheDocument();
	});

	it('disables Undo while it is running', () => {
		render(AgentStep, { props: { step: done, canUndo: true, undoing: true, onundo: () => {} } });
		expect(screen.getByRole('button', { name: /Undo/ })).toBeDisabled();
	});

	it('shows why a step failed', () => {
		render(AgentStep, {
			props: {
				step: {
					...done,
					state: 'failed',
					label: 'Nothing was changed',
					detail: 'Choose blocks between 1 and 5.',
					revisionId: null
				}
			}
		});
		expect(screen.getByText('Nothing was changed')).toBeInTheDocument();
		expect(screen.getByText('Choose blocks between 1 and 5.')).toBeInTheDocument();
	});

	it('warns about out-of-date blocks and offers to update the next ones', async () => {
		const onupdate = vi.fn();
		render(AgentStep, {
			props: { step: { ...done, staleBlocks: [3, 4, 5, 6] }, onupdate }
		});
		expect(screen.getByText('Blocks 3–6 may be out of date.')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Update blocks 3–5' }));
		expect(onupdate).toHaveBeenCalledWith([3, 4, 5]);
	});

	it('uses the singular for one out-of-date block', () => {
		render(AgentStep, { props: { step: { ...done, staleBlocks: [3] }, onupdate: () => {} } });
		expect(screen.getByText('Block 3 may be out of date.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Update block 3' })).toBeInTheDocument();
	});
});
