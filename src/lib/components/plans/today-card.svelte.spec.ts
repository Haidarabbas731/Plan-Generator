import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { PlanDayView, PlanStatus } from '#lib/plan-types.js';
import type { TodayState } from '#lib/schedule.js';
import TodayCard from './today-card.svelte';

const day: PlanDayView = {
	day: 8,
	blockId: 'b',
	title: 'Lifetimes in structs',
	learn: 'Why a struct needs a lifetime parameter.',
	practice: 'Write a Parser that borrows a string.',
	review: 'Redo the Day 6 move exercise.',
	minutes: 90,
	completed: false
};

function setup(
	state: TodayState | null,
	options: { day?: PlanDayView | null; allDone?: boolean; status?: PlanStatus } = {}
) {
	const ontoggle = vi.fn();
	render(TodayCard, {
		props: {
			today: state,
			day: options.day ?? null,
			allDone: options.allDone ?? false,
			status: options.status,
			ontoggle
		}
	});
	return { ontoggle };
}

describe('TodayCard unwritten day', () => {
	const session: TodayState = { kind: 'session', day: 1, date: '2026-10-08' } as TodayState;

	it('says it is being written only while the plan is generating', () => {
		setup(session, { status: 'generating' });
		expect(screen.getByText('Writing Day 1 now.')).toBeInTheDocument();
	});

	it('names the block theme and objective while the day is written', () => {
		render(TodayCard, {
			props: {
				today: session,
				day: null,
				allDone: false,
				status: 'generating',
				upNext: { theme: 'Ownership', objective: 'Understand moves and borrows.' },
				ontoggle: vi.fn()
			}
		});
		expect(screen.getByText('Ownership.')).toBeInTheDocument();
		expect(screen.getByText(/Understand moves and borrows/)).toBeInTheDocument();
	});

	it('shows a live day without a checkbox and says it is saving', () => {
		render(TodayCard, {
			props: { today: session, day, preview: true, allDone: false, ontoggle: vi.fn() }
		});
		expect(screen.getByText(/Lifetimes in structs/)).toBeInTheDocument();
		expect(screen.getByText('Saving…')).toBeInTheDocument();
		expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
	});

	it('says writing stopped when the plan failed', () => {
		setup(session, { status: 'failed' });
		expect(screen.queryByText(/still being written/)).toBeNull();
		expect(screen.getByText(/not written because writing stopped/)).toBeInTheDocument();
	});

	it('tells a paused plan to resume', () => {
		setup(session, { status: 'paused' });
		expect(screen.getByText(/Resume above to continue/)).toBeInTheDocument();
	});
});

describe('TodayCard', () => {
	it('shows placeholders until the local date is known', () => {
		setup(null);
		expect(screen.queryByText('Today')).not.toBeInTheDocument();
		expect(screen.getByLabelText('Today')).toBeInTheDocument();
	});

	it('shows today session with its three tasks', () => {
		setup({ kind: 'session', day: 8 }, { day });
		expect(screen.getByText('Day 8 · Lifetimes in structs')).toBeInTheDocument();
		expect(screen.getByText('Learn')).toBeInTheDocument();
		expect(screen.getByText(day.practice)).toBeInTheDocument();
		expect(screen.getByText('Review')).toBeInTheDocument();
	});

	it('completes today from the big checkbox', async () => {
		const { ontoggle } = setup({ kind: 'session', day: 8 }, { day });
		await fireEvent.click(screen.getByRole('checkbox', { name: /Mark today done/ }));
		expect(ontoggle).toHaveBeenCalledWith(8, true);
	});

	it('labels the way to mark the day done and lists the tasks with their icons', () => {
		setup({ kind: 'session', day: 8 }, { day });
		expect(screen.getByText('Mark done')).toBeInTheDocument();
		expect(screen.getByText('Practice')).toBeInTheDocument();
		expect(screen.getByText('90')).toBeInTheDocument();
	});

	it('says the plan is finished on the last day and pops the check only when asked', () => {
		const { container, unmount } = render(TodayCard, {
			props: {
				today: { kind: 'session', day: 8 },
				day: { ...day, completed: true },
				allDone: true,
				celebrate: false,
				ontoggle: () => {}
			}
		});
		expect(screen.getByText('You finished every day. Well done.')).toBeInTheDocument();
		expect(container.querySelector('.complete-pop')).toBeNull();
		unmount();
		const celebrating = render(TodayCard, {
			props: {
				today: { kind: 'session', day: 8 },
				day: { ...day, completed: true },
				allDone: true,
				celebrate: true,
				ontoggle: () => {}
			}
		});
		expect(celebrating.container.querySelector('.complete-pop')).not.toBeNull();
	});

	it('shows no finish line while days are still open', () => {
		setup({ kind: 'session', day: 8 }, { day, allDone: false });
		expect(screen.queryByText('You finished every day. Well done.')).not.toBeInTheDocument();
	});

	it('reflects a day that is already done', () => {
		setup({ kind: 'session', day: 8 }, { day: { ...day, completed: true } });
		expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
		expect(screen.getByText(/Done/)).toBeInTheDocument();
	});

	it('says the day is still being written when it does not exist yet', () => {
		setup({ kind: 'session', day: 12 });
		expect(screen.getByText('Writing Day 12 now.')).toBeInTheDocument();
		expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
	});

	it('shows a rest day with the next session', () => {
		setup({ kind: 'rest', nextDay: 9, nextDate: '2026-10-12' });
		expect(screen.getByText('Rest day')).toBeInTheDocument();
		expect(screen.getByText('Next session: Monday, October 12, Day 9.')).toBeInTheDocument();
	});

	it('shows when the plan starts', () => {
		setup({ kind: 'before', startsOn: '2026-10-12', firstDay: 1 });
		expect(screen.getByText('Starts Monday, October 12')).toBeInTheDocument();
		expect(screen.getByText('Day 1 is your first session.')).toBeInTheDocument();
	});

	it('congratulates a finished plan', () => {
		setup({ kind: 'done' }, { allDone: true });
		expect(screen.getByText('You finished every day')).toBeInTheDocument();
	});

	it('offers to finish skipped days when the plan period is over', () => {
		setup({ kind: 'done' }, { allDone: false });
		expect(screen.getByText('The last session has passed')).toBeInTheDocument();
	});
});
