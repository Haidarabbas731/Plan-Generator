import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ProviderKeyCard from './provider-key-card.svelte';

const provider = {
	id: 'google' as const,
	name: 'Google Gemini',
	keyUrl: 'https://aistudio.google.com/apikey'
};

const connected = {
	...provider,
	key: { last4: 'abcd', updatedAt: new Date('2026-10-01T10:00:00Z') }
};
const notConnected = { ...provider, key: null };

describe('ProviderKeyCard', () => {
	it('asks for a key when none is saved and offers no test or remove', () => {
		render(ProviderKeyCard, { props: { provider: notConnected } });
		expect(screen.getByText('Not connected')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Test key' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
	});

	it('shows only the last four characters of a saved key', () => {
		const { container } = render(ProviderKeyCard, { props: { provider: connected } });
		expect(screen.getByText(/Connected · ••••abcd/)).toBeInTheDocument();
		expect(container.textContent).not.toMatch(/sk-|AIza/);
		expect(screen.getByText(/The key is never shown again/)).toBeInTheDocument();
	});

	it('keeps the key field write-only: hidden characters, no value, no autofill', () => {
		render(ProviderKeyCard, { props: { provider: connected } });
		const field = screen.getByLabelText(/Replace key/);
		expect(field).toHaveAttribute('type', 'password');
		expect(field).toHaveValue('');
		expect(field).toHaveAttribute('autocomplete', 'off');
		expect(field).toHaveAttribute('name', 'apiKey');
	});

	it('turns Save into Replace once connected and offers test and remove', () => {
		render(ProviderKeyCard, { props: { provider: connected } });
		expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Test key' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
	});

	it('names the field after the provider for screen readers', () => {
		render(ProviderKeyCard, { props: { provider: notConnected } });
		expect(screen.getByLabelText(/API key for Google Gemini/)).toBeInTheDocument();
	});

	it('shows an error next to the field and links it to the input', () => {
		render(ProviderKeyCard, {
			props: { provider: notConnected, error: 'That key looks too short.' }
		});
		const alert = screen.getByRole('alert');
		expect(within(alert).getByText('That key looks too short.')).toBeInTheDocument();
		const field = screen.getByLabelText(/API key/);
		expect(field).toHaveAttribute('aria-invalid', 'true');
		expect(field.getAttribute('aria-describedby')).toContain(alert.id);
	});

	it('opens the key page of the provider in a new tab', () => {
		render(ProviderKeyCard, { props: { provider: notConnected } });
		const link = screen.getByRole('link', { name: /Get a key/ });
		expect(link).toHaveAttribute('href', provider.keyUrl);
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
	});
});
