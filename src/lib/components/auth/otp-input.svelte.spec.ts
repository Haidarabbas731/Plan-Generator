import { fireEvent, render } from '@testing-library/svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import OtpInput, { type OtpStatus } from './otp-input.svelte';

beforeAll(() => {
	class Observer {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	vi.stubGlobal('ResizeObserver', Observer);
	vi.stubGlobal('IntersectionObserver', Observer);
});

function setup(props: { status?: OtpStatus; locked?: boolean } = {}) {
	const onComplete = vi.fn();
	const { container } = render(OtpInput, {
		props: { onComplete, status: 'idle', value: '', ...props }
	});
	const input = container.querySelector('input') as HTMLInputElement;
	const keys = () => [...container.querySelectorAll('.keycap')];
	return { onComplete, input, keys, container };
}

describe('OtpInput', () => {
	it('draws six keys over one real, named input', () => {
		const { input, keys } = setup();
		expect(keys()).toHaveLength(6);
		expect(input).toHaveAttribute('aria-label', '6-digit verification code');
		expect(input).toHaveAttribute('inputmode', 'numeric');
		expect(input).toHaveAttribute('autocomplete', 'one-time-code');
	});

	it('hides the drawn keys from screen readers, which use the input', () => {
		const { keys } = setup();
		expect(keys()[0].parentElement).toHaveAttribute('aria-hidden', 'true');
	});

	it('puts each typed digit into its key', async () => {
		const { input, keys } = setup();
		await fireEvent.input(input, { target: { value: '482' } });
		expect(keys().map((key) => key.textContent?.trim())).toEqual(['4', '8', '2', '', '', '']);
	});

	it('calls onComplete once with the full code after the sixth digit', async () => {
		const { input, onComplete } = setup();
		await fireEvent.input(input, { target: { value: '48291' } });
		expect(onComplete).not.toHaveBeenCalled();
		await fireEvent.input(input, { target: { value: '482913' } });
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledWith('482913');
	});

	it('ignores letters', async () => {
		const { input, keys } = setup();
		await fireEvent.input(input, { target: { value: 'ab' } });
		expect(keys().every((key) => !key.textContent?.trim())).toBe(true);
	});

	it('shakes only after a wrong code', () => {
		expect(setup({ status: 'error' }).container.querySelector('.shake-x')).not.toBeNull();
		expect(setup({ status: 'idle' }).container.querySelector('.shake-x')).toBeNull();
	});

	it('marks the input invalid on error and colours the keys', () => {
		const { input, keys } = setup({ status: 'error' });
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(keys()[0].className).toContain('border-destructive');
	});

	it('locks the input on success and when too many tries were used', () => {
		expect(setup({ status: 'success' }).input).toBeDisabled();
		expect(setup({ locked: true }).input).toBeDisabled();
	});

	it('keeps the input readable but not editable while the code is checked', () => {
		const { input } = setup({ status: 'verifying' });
		expect(input).toHaveAttribute('readonly');
		expect(input).not.toBeDisabled();
	});
});
