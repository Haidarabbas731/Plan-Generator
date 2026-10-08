import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ModelField from './model-field.svelte';

beforeAll(() => {
	class Observer {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	vi.stubGlobal('ResizeObserver', Observer);
	vi.stubGlobal('IntersectionObserver', Observer);
	Element.prototype.scrollIntoView = () => {};
	Element.prototype.scrollTo = () => {};
});

afterEach(() => vi.unstubAllGlobals());

const models = [
	{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
	{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
	{ id: 'gemma-3', name: 'Gemma 3' }
];

function stubModels(response: unknown, ok = true) {
	const fetcher = vi.fn(async () => ({ ok, json: async () => response }));
	vi.stubGlobal('fetch', fetcher);
	return fetcher;
}

function setup(props: Record<string, unknown> = {}) {
	render(ModelField, {
		props: {
			providers: [{ id: 'google', name: 'Google Gemini' }],
			provider: 'google',
			model: '',
			...props
		}
	});
}

async function openList() {
	const trigger = document.getElementById('model-trigger')!;
	await fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
	await fireEvent.click(trigger);
}

const hiddenModel = () =>
	document.querySelector<HTMLInputElement>('input[type="hidden"][name="model"]')!;

describe('ModelField', () => {
	it('asks for a provider first when none is chosen and does not load anything', () => {
		const fetcher = stubModels({ ok: true, models });
		setup({ provider: '' });
		expect(document.getElementById('model-trigger')).toBeDisabled();
		expect(screen.getByText('Choose a provider first')).toBeInTheDocument();
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('loads the models of the provider and offers them to choose from', async () => {
		const fetcher = stubModels({ ok: true, models });
		setup();
		await waitFor(() => expect(screen.getByText('Choose a model')).toBeInTheDocument());
		expect(fetcher).toHaveBeenCalledWith(
			'/plans/new/models?provider=google',
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
	});

	it('filters by name or id as you type and picks the highlighted model with Enter', async () => {
		stubModels({ ok: true, models });
		setup();
		await waitFor(() => expect(screen.getByText('Choose a model')).toBeInTheDocument());

		await openList();
		const search = await screen.findByPlaceholderText('Search models');
		expect(screen.getAllByRole('option')).toHaveLength(3);

		await fireEvent.input(search, { target: { value: 'flash' } });
		await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
		expect(screen.getByRole('option', { name: /Gemini 2.5 Flash/ })).toBeInTheDocument();

		await fireEvent.keyDown(search, { key: 'Enter' });
		await waitFor(() => expect(hiddenModel().value).toBe('gemini-2.5-flash'));
		expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument();
	});

	it('says when nothing matches the search', async () => {
		stubModels({ ok: true, models });
		setup();
		await waitFor(() => expect(screen.getByText('Choose a model')).toBeInTheDocument());
		await openList();
		const search = await screen.findByPlaceholderText('Search models');
		await fireEvent.input(search, { target: { value: 'zzz' } });
		await waitFor(() => expect(screen.getByText('No model found.')).toBeInTheDocument());
	});

	it('falls back to typing the model id when the list cannot be loaded', async () => {
		stubModels({ ok: false, message: 'The provider did not answer.' });
		setup();
		const input = await screen.findByPlaceholderText('Type a model id');
		expect(screen.getByText(/The provider did not answer/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'try again' })).toBeInTheDocument();
		await fireEvent.input(input, { target: { value: 'my-model' } });
		expect(input).toHaveValue('my-model');
	});

	it('shows the error passed in for the model', async () => {
		stubModels({ ok: true, models });
		setup({ modelError: 'Choose a model.' });
		expect(screen.getByRole('alert')).toHaveTextContent('Choose a model.');
	});
});
