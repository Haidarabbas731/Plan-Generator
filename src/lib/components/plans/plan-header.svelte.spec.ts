import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { LIMITS } from '#lib/limits.js';
import PlanHeader from './plan-header.svelte';

function setup(goal: string) {
	render(PlanHeader, {
		props: {
			id: 'p1',
			title: 'Learn Rust',
			goal,
			topicTag: null,
			provider: 'google',
			model: 'gemini-test',
			startDate: '2026-10-01',
			done: 1,
			total: 6,
			streak: 0
		}
	});
}

describe('PlanHeader goal', () => {
	it('shows a short goal in full without a toggle', () => {
		setup('Learn Rust well enough to build a CLI tool');
		expect(screen.getByText(/Learn Rust well enough/)).not.toHaveClass('line-clamp-3');
		expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
	});

	it('clamps a long goal and lets the reader expand and collapse it', async () => {
		const goal = 'word '.repeat(LIMITS.goalPreviewChars);
		setup(goal);
		const goalText = document.getElementById('plan-goal')!;
		const toggle = screen.getByRole('button', { name: 'Show more' });
		expect(goalText).toHaveClass('line-clamp-3');
		expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(toggle);
		expect(goalText).not.toHaveClass('line-clamp-3');
		expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);

		await fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
		expect(goalText).toHaveClass('line-clamp-3');
	});
});
