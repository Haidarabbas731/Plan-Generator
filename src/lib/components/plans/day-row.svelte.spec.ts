import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DayRow from './day-row.svelte';

const base = {
	day: 3,
	title: 'Borrowing basics',
	learn: 'References never outlive their owner.',
	practice: 'Write a function that takes &str.',
	review: 'Redo the Day 1 move exercise.',
	minutes: 45,
	date: '2026-10-07',
	completed: false
};

describe('DayRow', () => {
	it('shows the day, title, date and minutes', () => {
		render(DayRow, { props: { ...base, ontoggle: () => {} } });
		expect(screen.getByText('Day 3 · Borrowing basics')).toBeInTheDocument();
		expect(screen.getByText(/Wed, Oct 7/)).toBeInTheDocument();
		expect(screen.getByText(/45/)).toBeInTheDocument();
	});

	it('names the checkbox after the day and reports a toggle', async () => {
		const ontoggle = vi.fn();
		render(DayRow, { props: { ...base, ontoggle } });
		const checkbox = screen.getByRole('checkbox', { name: /Day 3 done: Borrowing basics/ });
		expect(checkbox).toHaveAttribute('aria-checked', 'false');
		await fireEvent.click(checkbox);
		expect(ontoggle).toHaveBeenCalledWith(3, true);
	});

	it('reflects a completed day', () => {
		render(DayRow, { props: { ...base, completed: true, ontoggle: () => {} } });
		expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
	});

	it('hides the tasks until the row is opened', async () => {
		render(DayRow, { props: { ...base, ontoggle: () => {} } });
		const trigger = screen.getByRole('button', { name: /Day 3 · Borrowing basics/ });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByText(base.practice)).not.toBeVisible();
		await fireEvent.click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText(base.practice)).toBeVisible();
		expect(screen.getByText('Learn')).toBeVisible();
		expect(screen.getByText('Review')).toBeVisible();
	});
});
