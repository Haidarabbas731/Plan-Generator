import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { AgentStep } from '#lib/chat-types.js';
import AgentTrace from './agent-trace.svelte';

const read: AgentStep = {
	key: 'a',
	tool: 'get_plan',
	state: 'done',
	label: 'Read the plan',
	detail: null,
	revisionId: null,
	revisionNumber: null,
	staleBlocks: []
};
const edit: AgentStep = {
	key: 'b',
	tool: 'revise_blocks',
	state: 'done',
	label: 'Rewrote block 2',
	detail: null,
	revisionId: 'r2',
	revisionNumber: 2,
	staleBlocks: []
};
const failed: AgentStep = {
	...edit,
	key: 'c',
	state: 'failed',
	label: 'Nothing was changed',
	detail: 'Choose blocks between 1 and 5.',
	revisionId: null
};

describe('AgentTrace', () => {
	it('folds finished steps into one line and opens them on click', async () => {
		render(AgentTrace, { props: { steps: [read, edit] } });
		const toggle = screen.getByRole('button', { name: /Read the plan · Rewrote block 2/ });
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
	});

	it('shows rows without a toggle while the agent works', () => {
		render(AgentTrace, {
			props: { steps: [{ ...edit, state: 'running', label: 'Rewriting block 2' }], live: true }
		});
		expect(screen.getByText('Rewriting block 2…')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Rewriting/ })).not.toBeInTheDocument();
	});

	it('keeps only the last rows while live and counts the earlier ones', () => {
		const steps = [1, 2, 3, 4, 5].map((n) => ({ ...read, key: `k${n}`, label: `Step ${n}` }));
		render(AgentTrace, { props: { steps, live: true } });
		expect(screen.getByText('+2 earlier steps')).toBeInTheDocument();
		expect(screen.queryByText('Step 2')).not.toBeInTheDocument();
		expect(screen.getByText('Step 5')).toBeInTheDocument();
	});

	it('keeps the reason a step failed inside the fold', () => {
		render(AgentTrace, { props: { steps: [failed] } });
		expect(screen.getByText('Choose blocks between 1 and 5.')).toBeInTheDocument();
	});

	it('offers Undo outside the fold on the latest change', async () => {
		const onundo = vi.fn();
		render(AgentTrace, { props: { steps: [edit], undoableRevisionId: 'r2', onundo } });
		await fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
		expect(onundo).toHaveBeenCalledWith('r2');
	});

	it('hides Undo for changes that are not the latest and while live', () => {
		const { unmount } = render(AgentTrace, {
			props: { steps: [edit], undoableRevisionId: 'other', onundo: () => {} }
		});
		expect(screen.queryByRole('button', { name: /Undo/ })).not.toBeInTheDocument();
		unmount();
		render(AgentTrace, {
			props: { steps: [edit], live: true, undoableRevisionId: 'r2', onundo: () => {} }
		});
		expect(screen.queryByRole('button', { name: /Undo/ })).not.toBeInTheDocument();
	});

	it('disables Undo while it is running', () => {
		render(AgentTrace, {
			props: { steps: [edit], undoableRevisionId: 'r2', undoing: true, onundo: () => {} }
		});
		expect(screen.getByRole('button', { name: /Undo/ })).toBeDisabled();
	});

	it('warns about out-of-date blocks and offers to update the next ones', async () => {
		const onupdate = vi.fn();
		render(AgentTrace, { props: { steps: [{ ...edit, staleBlocks: [3, 4, 5, 6] }], onupdate } });
		expect(screen.getByText('Blocks 3–6 may be out of date.')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Update blocks 3–5' }));
		expect(onupdate).toHaveBeenCalledWith([3, 4, 5]);
	});

	it('uses the singular for one out-of-date block', () => {
		render(AgentTrace, {
			props: { steps: [{ ...edit, staleBlocks: [3] }], onupdate: () => {} }
		});
		expect(screen.getByText('Block 3 may be out of date.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Update block 3' })).toBeInTheDocument();
	});
});
