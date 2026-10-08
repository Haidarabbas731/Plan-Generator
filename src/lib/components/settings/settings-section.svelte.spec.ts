import { createRawSnippet } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SettingsSection from './settings-section.svelte';

const body = createRawSnippet(() => ({ render: () => '<p>Body text</p>' }));

describe('SettingsSection', () => {
	it('names the region after its heading and shows the description', () => {
		render(SettingsSection, {
			props: {
				id: 'profile',
				title: 'Profile',
				description: 'Your name and email.',
				children: body
			}
		});
		expect(screen.getByRole('region', { name: 'Profile' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
		expect(screen.getByText('Your name and email.')).toBeInTheDocument();
		expect(screen.getByText('Body text')).toBeInTheDocument();
	});

	it('wraps the content in a panel unless asked not to', () => {
		const { container, unmount } = render(SettingsSection, {
			props: { id: 'a', title: 'A', children: body }
		});
		expect(container.querySelector('.surface-flat')).not.toBeNull();
		unmount();
		const plain = render(SettingsSection, {
			props: { id: 'b', title: 'B', panel: false, children: body }
		});
		expect(plain.container.querySelector('.surface-flat')).toBeNull();
	});

	it('marks the danger tone with a destructive border', () => {
		const { container } = render(SettingsSection, {
			props: { id: 'danger', title: 'Delete', tone: 'danger', children: body }
		});
		expect(container.querySelector('.border-destructive\\/30')).not.toBeNull();
	});
});
