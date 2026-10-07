import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Example from './Example.svelte';

describe('test setup (client project)', () => {
	it('renders a rune component and reacts to clicks', async () => {
		render(Example, { props: { label: 'Clicks' } });
		const button = screen.getByRole('button');
		expect(button).toHaveTextContent('Clicks: 0');
		await fireEvent.click(button);
		expect(button).toHaveTextContent('Clicks: 1');
	});
});
