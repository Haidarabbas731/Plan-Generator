import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import GettingStartedPanel from './getting-started-panel.svelte';
import RecoveryPanel from './recovery-panel.svelte';
import VerifyPanel from './verify-panel.svelte';
import WelcomeBackPanel from './welcome-back-panel.svelte';

function reduceMotion(reduce: boolean) {
	vi.stubGlobal(
		'matchMedia',
		(query: string) =>
			({
				matches: reduce && query.includes('prefers-reduced-motion'),
				media: query,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {}
			}) as unknown as MediaQueryList
	);
}

describe('auth panels with reduced motion', () => {
	it('show their finished state at once and offer no replay', () => {
		reduceMotion(true);

		render(WelcomeBackPanel);
		expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Replay' })).not.toBeInTheDocument();
	});

	it('write the getting started example with every step done', () => {
		reduceMotion(true);
		render(GettingStartedPanel);
		expect(screen.getAllByText(/Learn Rust well enough to build a CLI/)).toHaveLength(2);
		expect(screen.getByText('Day 1 · Hello, Cargo')).toBeInTheDocument();
	});

	it('show the example email with the full code and the real lifetime', () => {
		reduceMotion(true);
		render(VerifyPanel, { props: { minutes: 10 } });
		expect(screen.getByText('Your Plan Generator code is 482 913')).toBeInTheDocument();
		expect(screen.getByText('The code works for 10 minutes.')).toBeInTheDocument();
	});
});

describe('recovery panel', () => {
	it('states the real link lifetime', () => {
		render(RecoveryPanel, { props: { minutes: 60 } });
		expect(screen.getByText('The link works for 60 minutes.')).toBeInTheDocument();
	});
});
