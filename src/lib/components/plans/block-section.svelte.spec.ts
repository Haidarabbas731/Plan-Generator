import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { PlanBlockView, PlanDayView } from '#lib/plan-types.js';
import BlockSection from './block-section.svelte';

const block: PlanBlockView = {
	id: 'b1',
	idx: 1,
	startDay: 4,
	endDay: 6,
	theme: 'Ownership and borrowing',
	objective: 'Move values and borrow them without cloning.',
	milestone: {
		title: 'Word counter',
		description: 'Build a counter that reads a file.',
		successCriteria: 'It counts a 1 MB file without copying it.'
	},
	status: 'ready',
	error: null
};

const days: PlanDayView[] = [4, 5, 6].map((day) => ({
	day,
	blockId: 'b1',
	title: `Lesson ${day}`,
	learn: 'learn',
	practice: 'practice',
	review: 'review',
	minutes: 45,
	completed: day === 4
}));

const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'];

function setup(overrides: Partial<PlanBlockView> = {}, extra: Record<string, unknown> = {}) {
	const ontoggle = vi.fn();
	const onretry = vi.fn();
	render(BlockSection, {
		props: {
			block: { ...block, ...overrides },
			days,
			dates,
			open: true,
			ontoggle,
			onretry,
			...extra
		}
	});
	return { ontoggle, onretry };
}

describe('BlockSection', () => {
	it('shows the block number, theme, day range and progress', () => {
		setup();
		expect(screen.getByText('Block 2')).toBeInTheDocument();
		expect(screen.getByText('Ownership and borrowing')).toBeInTheDocument();
		expect(screen.getByText(/Days 4–6/)).toBeInTheDocument();
		expect(screen.getByText('1 of 3')).toBeInTheDocument();
	});

	it('lists the days and the milestone of a written block', () => {
		setup();
		expect(screen.getByText('Day 4 · Lesson 4')).toBeInTheDocument();
		expect(screen.getByText('Day 6 · Lesson 6')).toBeInTheDocument();
		expect(screen.getByText(/Day 6 milestone · Word counter/)).toBeInTheDocument();
		expect(screen.getByText(/It counts a 1 MB file/)).toBeInTheDocument();
	});

	it('passes a day toggle to the page', async () => {
		const { ontoggle } = setup();
		await fireEvent.click(screen.getByRole('checkbox', { name: /Day 5 done/ }));
		expect(ontoggle).toHaveBeenCalledWith(5, true);
	});

	it('shows skeletons and a status while the block is being written', () => {
		setup({ status: 'writing' });
		expect(screen.getByText('Writing')).toBeInTheDocument();
		expect(screen.getByText('Writing this block now.')).toBeInTheDocument();
		expect(screen.queryByText('Day 4 · Lesson 4')).not.toBeInTheDocument();
	});

	it('shows the milestone only after the days of the block are written', () => {
		for (const status of ['pending', 'writing', 'failed'] as const) {
			const { unmount } = render(BlockSection, {
				props: {
					block: { ...block, status, error: status === 'failed' ? 'x' : null },
					days,
					dates,
					open: true,
					ontoggle: vi.fn(),
					onretry: vi.fn()
				}
			});
			expect(screen.queryByText(/milestone · Word counter/)).not.toBeInTheDocument();
			unmount();
		}
		setup({ status: 'stale' });
		expect(screen.getByText(/milestone · Word counter/)).toBeInTheDocument();
	});

	it('says a pending block is waiting', () => {
		setup({ status: 'pending' });
		expect(screen.getByText('Waiting')).toBeInTheDocument();
		expect(screen.getByText('Waiting for the blocks before it.')).toBeInTheDocument();
	});

	it('shows the error of a failed block and retries on request', async () => {
		const { onretry } = setup({ status: 'failed', error: 'The model returned no days.' });
		expect(screen.getByRole('alert')).toHaveTextContent('The model returned no days.');
		await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(onretry).toHaveBeenCalledTimes(1);
	});

	it('disables the retry button while retrying', () => {
		setup({ status: 'failed', error: 'x' }, { retrying: true });
		expect(screen.getByRole('button', { name: /Try again/ })).toBeDisabled();
	});

	it('marks a stale block as possibly out of date but still lists its days', () => {
		setup({ status: 'stale' });
		expect(screen.getByText('May be out of date')).toBeInTheDocument();
		expect(screen.getByText('Day 5 · Lesson 5')).toBeInTheDocument();
	});

	it('starts collapsed when the page leaves it closed', () => {
		setup({}, { open: false });
		const trigger = screen.getByRole('button', { name: /Ownership and borrowing/ });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByText(/It counts a 1 MB file/)).not.toBeVisible();
	});

	it('marks the block that holds today and shows its progress', () => {
		setup({}, { todayDay: 5 });
		expect(screen.getByText('Current block')).toBeInTheDocument();
		expect(screen.getByText('1 of 3')).toBeInTheDocument();
	});

	it('does not mark other blocks as current', () => {
		setup({}, { todayDay: 2 });
		expect(screen.queryByText('Current block')).not.toBeInTheDocument();
	});

	it('shows a check once every day of the block is done', () => {
		const all = days.map((day) => ({ ...day, completed: true }));
		render(BlockSection, {
			props: { block, days: all, dates, open: true, ontoggle: vi.fn(), onretry: vi.fn() }
		});
		expect(screen.getByLabelText('All days done')).toBeInTheDocument();
	});

	it('uses a single day label for a one day block', () => {
		setup({ startDay: 4, endDay: 4 });
		expect(screen.getByText('Day 4', { exact: true })).toBeInTheDocument();
		expect(screen.queryByText(/Days 4/)).not.toBeInTheDocument();
	});
});
