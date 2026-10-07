import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { BlockStatus, PlanStatus } from '#lib/plan-types.js';
import ActivityLine from './activity-line.svelte';

interface TimelineBlock {
	idx: number;
	theme: string;
	status: BlockStatus;
	error: string | null;
}

const blocks: TimelineBlock[] = [
	{ idx: 0, theme: 'Basics', status: 'ready', error: null },
	{ idx: 1, theme: 'Ownership', status: 'writing', error: null },
	{ idx: 2, theme: 'Traits', status: 'pending', error: null }
];

function setup(
	status: PlanStatus,
	extra: { error?: string | null; label?: string; blocks?: typeof blocks; busy?: boolean } = {}
) {
	const onresume = vi.fn();
	const onpause = vi.fn();
	render(ActivityLine, {
		props: {
			status,
			error: extra.error ?? null,
			label: extra.label ?? 'Writing block 2 of 3',
			blocks: extra.blocks ?? blocks,
			busy: extra.busy ?? false,
			onresume,
			onpause
		}
	});
	return { onresume, onpause };
}

describe('ActivityLine', () => {
	it('announces progress politely', () => {
		setup('generating');
		expect(screen.getByText('Writing block 2 of 3')).toHaveAttribute('aria-live', 'polite');
	});

	it('offers to pause while writing', async () => {
		const { onpause } = setup('generating');
		await fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
		expect(onpause).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
	});

	it('offers to resume a paused plan and explains that progress is saved', async () => {
		const { onresume } = setup('paused', { label: 'Paused' });
		expect(screen.getByText(/Finished blocks are saved/)).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
		expect(onresume).toHaveBeenCalledTimes(1);
	});

	it('shows the failure and a try again button for a failed plan', async () => {
		const { onresume } = setup('failed', { label: 'Stopped', error: 'The key was rejected.' });
		expect(screen.getByText('The key was rejected.')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(onresume).toHaveBeenCalledTimes(1);
	});

	it('disables the action while a request is running', () => {
		setup('paused', { busy: true });
		expect(screen.getByRole('button', { name: /Resume/ })).toBeDisabled();
	});

	it('lists the outline and every block in the timeline', async () => {
		setup('generating');
		await fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
		expect(screen.getByText('Outline')).toBeVisible();
		expect(screen.getByText('Block 1 · Basics')).toBeVisible();
		expect(screen.getByText('Block 2 · Ownership')).toBeVisible();
		expect(screen.getByText('Block 3 · Traits')).toBeVisible();
	});

	it('shows the message of a failed block in the timeline', async () => {
		setup('paused', {
			blocks: [{ idx: 0, theme: 'Basics', status: 'failed', error: 'No days returned.' }]
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
		expect(screen.getByText('No days returned.')).toBeVisible();
		expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
	});
});
