import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { PlanSummary } from '#lib/plan-types.js';
import PlanCard from './plan-card.svelte';

const plan: PlanSummary = {
	id: 'p1',
	title: 'Learn Rust',
	topicTag: 'rust',
	status: 'ready',
	provider: 'google',
	model: 'gemini-test',
	startDate: '2026-10-05',
	updatedAt: new Date(2026, 9, 7, 12),
	daysDone: 3,
	daysWritten: 30,
	daysTotal: 30,
	studyDays: [1, 2, 3, 4, 5]
};

function setup(overrides: Partial<PlanSummary> = {}) {
	const ondelete = vi.fn();
	render(PlanCard, { props: { plan: { ...plan, ...overrides }, ondelete } });
	return { ondelete };
}

describe('PlanCard', () => {
	it('links the title to the plan page', () => {
		setup();
		expect(screen.getByRole('link', { name: 'Learn Rust' })).toHaveAttribute('href', '/plans/p1');
	});

	it('shows progress, provider, model and the topic', () => {
		setup();
		expect(screen.getByText('3 of 30 days')).toBeInTheDocument();
		expect(screen.getByText(/Google Gemini · gemini-test/)).toBeInTheDocument();
		expect(screen.getByText('rust')).toBeInTheDocument();
		expect(
			screen.getByRole('img', { name: /Learn Rust progress, 10 percent/ })
		).toBeInTheDocument();
	});

	it('shows the update date and keeps the model out of the progress line', () => {
		setup();
		const progress = screen.getByText('3 of 30 days').closest('p');
		expect(progress).toHaveTextContent(/Updated Oct 7/);
		expect(progress).not.toHaveTextContent('gemini-test');
	});

	it('has an actions menu named after the plan', () => {
		setup();
		expect(screen.getByRole('button', { name: 'Actions for Learn Rust' })).toBeInTheDocument();
	});

	it('does not put the menu inside the link', () => {
		setup();
		const link = screen.getByRole('link', { name: 'Learn Rust' });
		const menu = screen.getByRole('button', { name: 'Actions for Learn Rust' });
		expect(link.contains(menu)).toBe(false);
	});

	it('labels plans that are not finished', () => {
		setup({ status: 'generating' });
		expect(screen.getByText('Writing')).toBeInTheDocument();
	});

	it('flags a failed plan', () => {
		setup({ status: 'failed' });
		expect(screen.getByText('Needs attention')).toBeInTheDocument();
	});

	it('shows no status badge for a finished plan', () => {
		setup();
		expect(screen.queryByText('Writing')).not.toBeInTheDocument();
		expect(screen.queryByText('Paused')).not.toBeInTheDocument();
	});
});
