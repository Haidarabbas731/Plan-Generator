import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PasswordStrength from './password-strength.svelte';

function item(label: string) {
	return screen.getByText(label, { exact: false, selector: 'li' });
}

describe('PasswordStrength', () => {
	it('is hidden from assistive technology while the field is empty', () => {
		const { container } = render(PasswordStrength, { props: { password: '' } });
		const root = container.firstElementChild as HTMLElement;
		expect(root).toHaveAttribute('aria-hidden', 'true');
	});

	it('shows which rules are met for a partial password', () => {
		const { container } = render(PasswordStrength, { props: { password: 'longenough' } });
		expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'false');
		expect(item('At least 8 characters')).toHaveTextContent('met');
		expect(item('At least 8 characters')).not.toHaveTextContent('not met');
		expect(item('One uppercase letter')).toHaveTextContent('not met');
		expect(item('One number')).toHaveTextContent('not met');
		expect(item('One special character')).toHaveTextContent('not met');
		expect(screen.getByRole('status')).toHaveTextContent('Very weak');
	});

	it('is strong with every rule and very strong at twelve characters', async () => {
		const short = render(PasswordStrength, { props: { password: 'Abcdef1!' } });
		expect(screen.getByRole('status')).toHaveTextContent('Strong');
		short.unmount();

		render(PasswordStrength, { props: { password: 'Abcdefghij1!' } });
		expect(screen.getByRole('status')).toHaveTextContent('Very strong');
	});
});
