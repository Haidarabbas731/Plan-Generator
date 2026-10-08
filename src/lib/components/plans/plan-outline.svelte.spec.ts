import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PlanOutline from './plan-outline.svelte';

const items = [
	{
		idx: 0,
		theme: 'Getting started',
		startDay: 1,
		endDay: 4,
		done: 4,
		total: 4,
		written: true,
		current: false
	},
	{
		idx: 1,
		theme: 'Ownership',
		startDay: 5,
		endDay: 8,
		done: 1,
		total: 4,
		written: true,
		current: true
	},
	{
		idx: 2,
		theme: 'Traits',
		startDay: 9,
		endDay: 12,
		done: 0,
		total: 0,
		written: false,
		current: false
	}
];

describe('PlanOutline', () => {
	it('lists every block with its days and, once written, its progress', () => {
		render(PlanOutline, { props: { items, onselect: () => {} } });
		expect(screen.getByRole('navigation', { name: 'Plan outline' })).toBeInTheDocument();
		expect(screen.getByText('Getting started')).toBeInTheDocument();
		expect(screen.getByText('Days 5–8')).toBeInTheDocument();
		expect(screen.getByText('1/4')).toBeInTheDocument();
		expect(screen.queryByText('0/0')).not.toBeInTheDocument();
	});

	it('marks the current block and a finished one', () => {
		render(PlanOutline, { props: { items, onselect: () => {} } });
		expect(screen.getByRole('button', { name: /Ownership/ })).toHaveAttribute(
			'aria-current',
			'location'
		);
		expect(screen.getByLabelText('All days done')).toBeInTheDocument();
	});

	it('reports which block was chosen', async () => {
		const onselect = vi.fn();
		render(PlanOutline, { props: { items, onselect } });
		await fireEvent.click(screen.getByRole('button', { name: /Traits/ }));
		expect(onselect).toHaveBeenCalledWith(2);
	});
});
