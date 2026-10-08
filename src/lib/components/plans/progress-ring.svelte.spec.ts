import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ProgressRing from './progress-ring.svelte';

const offsetOf = (container: HTMLElement) =>
	Number(container.querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'));
const circumferenceOf = (container: HTMLElement) =>
	Number(container.querySelectorAll('circle')[1].getAttribute('stroke-dasharray'));

describe('ProgressRing', () => {
	it('describes itself as an image with the label and the percent', () => {
		render(ProgressRing, { props: { value: 0.5, label: 'Rust plan progress' } });
		expect(screen.getByRole('img', { name: 'Rust plan progress, 50 percent' })).toBeInTheDocument();
	});

	it('hides the drawing and the number from assistive technology', () => {
		const { container } = render(ProgressRing, { props: { value: 0.25, label: 'Plan' } });
		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByText('25')).toHaveAttribute('aria-hidden', 'true');
	});

	it('fills the arc in proportion to the value', () => {
		const { container } = render(ProgressRing, { props: { value: 0.25, label: 'Plan' } });
		expect(offsetOf(container)).toBeCloseTo(circumferenceOf(container) * 0.75, 5);
	});

	it('keeps values below zero and above one inside the ring', () => {
		const empty = render(ProgressRing, { props: { value: -2, label: 'Plan' } });
		expect(screen.getByRole('img')).toHaveAccessibleName('Plan, 0 percent');
		expect(offsetOf(empty.container)).toBeCloseTo(circumferenceOf(empty.container), 5);
		empty.unmount();

		const full = render(ProgressRing, { props: { value: 7, label: 'Plan' } });
		expect(screen.getByRole('img')).toHaveAccessibleName('Plan, 100 percent');
		expect(offsetOf(full.container)).toBe(0);
	});

	it('uses the size for the box and the radius', () => {
		const { container } = render(ProgressRing, { props: { value: 0, label: 'Plan', size: 64 } });
		expect(screen.getByRole('img')).toHaveStyle({ width: '64px', height: '64px' });
		expect(container.querySelector('circle')).toHaveAttribute('r', '30');
	});
});
