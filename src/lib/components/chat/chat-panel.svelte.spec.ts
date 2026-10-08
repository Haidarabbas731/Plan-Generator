import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ChatState } from '#lib/client/chat.svelte.js';
import ChatPanel from './chat-panel.svelte';

beforeAll(() => {
	class Observer {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	vi.stubGlobal('ResizeObserver', Observer);
	vi.stubGlobal('IntersectionObserver', Observer);
	Element.prototype.scrollTo = () => {};
});

function fakeChat(overrides: Record<string, unknown> = {}) {
	return {
		messages: [],
		busy: false,
		error: null,
		canSend: false,
		input: '',
		status: 'ready',
		lastRevisionId: null,
		send: vi.fn(),
		stop: vi.fn(),
		dismissError: vi.fn(),
		...overrides
	} as unknown as ChatState;
}

function setup(props: Record<string, unknown> = {}) {
	const handlers = {
		onmodel: vi.fn(),
		onundo: vi.fn(),
		onrestore: vi.fn(),
		onclose: vi.fn(),
		onretry: vi.fn()
	};
	render(ChatPanel, {
		props: {
			planId: 'p1',
			planStatus: 'ready',
			provider: 'google',
			model: 'gemini-test',
			providers: [{ id: 'google', name: 'Google Gemini' }],
			currentRevision: 1,
			chat: fakeChat(),
			...handlers,
			...props
		}
	});
	return handlers;
}

const box = () => screen.getByRole('textbox', { name: 'Message' });

describe('ChatPanel', () => {
	it('shows a placeholder and a disabled composer while the conversation loads', () => {
		setup({ chat: null });
		expect(box()).toBeDisabled();
		expect(screen.queryByText('Make block 2 easier')).not.toBeInTheDocument();
	});

	it('offers example requests on an empty conversation and sends one on click', async () => {
		const chat = fakeChat();
		setup({ chat });
		await fireEvent.click(screen.getByRole('button', { name: 'I only have weekends now' }));
		expect(chat.send).toHaveBeenCalledWith('I only have weekends now');
	});

	it('warns when only a few AI requests are left this hour', () => {
		setup({ aiLeft: 3 });
		expect(screen.getByText('3 AI requests left this hour.')).toBeInTheDocument();
	});

	it('uses the singular for one request and a clear message for none', () => {
		setup({ aiLeft: 1 });
		expect(screen.getByText('1 AI request left this hour.')).toBeInTheDocument();
	});

	it('says when none are left and stays quiet while plenty remain', () => {
		setup({ aiLeft: 0 });
		expect(screen.getByText('No AI requests left this hour.')).toBeInTheDocument();
	});

	it('shows no limit hint with plenty of requests left', () => {
		setup({ aiLeft: 25 });
		expect(screen.queryByText(/left this hour/)).not.toBeInTheDocument();
	});

	it('is closed while the plan is being written and explains why', () => {
		setup({ planStatus: 'generating' });
		expect(screen.getByText(/still being written/)).toBeInTheDocument();
		expect(box()).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Make block 2 easier' })).toBeDisabled();
	});

	it('asks for a key when no provider is connected', () => {
		setup({ providers: [] });
		expect(screen.getByText(/Add an AI key in Settings/)).toBeInTheDocument();
		expect(box()).toBeDisabled();
	});

	it('sends with Enter and keeps the line break on Shift+Enter', async () => {
		const chat = fakeChat({ input: 'hello' });
		setup({ chat });
		await fireEvent.keyDown(box(), { key: 'Enter', shiftKey: true });
		expect(chat.send).not.toHaveBeenCalled();
		await fireEvent.keyDown(box(), { key: 'Enter' });
		expect(chat.send).toHaveBeenCalledTimes(1);
	});

	it('does not send with Enter while composing text', async () => {
		const chat = fakeChat({ input: 'hello' });
		setup({ chat });
		await fireEvent.keyDown(box(), { key: 'Enter', isComposing: true });
		expect(chat.send).not.toHaveBeenCalled();
	});

	it('disables Send for an empty message and enables it otherwise', () => {
		setup({ chat: fakeChat({ canSend: false }) });
		expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
	});

	it('enables Send when there is something to send', () => {
		setup({ chat: fakeChat({ canSend: true, input: 'hi' }) });
		expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
	});

	it('turns Send into Stop while a reply is streaming', async () => {
		const chat = fakeChat({
			busy: true,
			messages: [{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] }]
		});
		setup({ chat });
		expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
		expect(chat.stop).toHaveBeenCalledTimes(1);
	});

	it('shows an error with a way to dismiss it', async () => {
		const chat = fakeChat({ error: 'The plan is still being written.' });
		setup({ chat });
		expect(screen.getByRole('alert')).toHaveTextContent('The plan is still being written.');
		await fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
		expect(chat.dismissError).toHaveBeenCalledTimes(1);
	});

	it('shows why an undo, restore or model change failed', () => {
		setup({ actionError: 'Wait until the plan has finished writing.' });
		expect(screen.getByText('Wait until the plan has finished writing.')).toBeInTheDocument();
	});

	it('shows a load error with a retry', async () => {
		const { onretry } = setup({ chat: null, loadError: 'Could not load the conversation.' });
		expect(screen.getByText('Could not load the conversation.')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(onretry).toHaveBeenCalledTimes(1);
	});

	it('shows a close button only when asked to', async () => {
		const { onclose } = setup({ showClose: true });
		await fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('names the current model on the switcher', () => {
		setup();
		expect(screen.getByRole('button', { name: /Model: gemini-test/ })).toBeInTheDocument();
	});

	it('keeps the model switcher closed to changes while a reply is streaming', () => {
		setup({ chat: fakeChat({ busy: true }) });
		expect(screen.getByRole('button', { name: /Model: gemini-test/ })).toBeDisabled();
	});

	describe('Undo', () => {
		const edit = {
			id: 'a1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-revise_blocks',
					toolCallId: 'c1',
					state: 'output-available',
					output: {
						ok: true,
						summary: 'Rewrote block 2.',
						revisionId: 'r2',
						revisionNumber: 2,
						staleBlocks: []
					}
				}
			]
		};

		it('is offered while the change is still the current revision', () => {
			setup({
				currentRevision: 2,
				chat: fakeChat({ messages: [edit], lastRevisionId: 'r2', lastRevisionNumber: 2 })
			});
			expect(screen.getByRole('button', { name: /Undo/ })).toBeInTheDocument();
		});

		it('is not offered once the plan has moved on, for example after it was undone', () => {
			setup({
				currentRevision: 3,
				chat: fakeChat({ messages: [edit], lastRevisionId: 'r2', lastRevisionNumber: 2 })
			});
			expect(screen.queryByRole('button', { name: /Undo/ })).not.toBeInTheDocument();
		});
	});
});

describe('ChatPanel on a phone', () => {
	it('shows only the composer while compact', () => {
		setup({ layout: 'sheet', compact: true });
		expect(screen.getByText('Ask about this plan').closest('header')).toHaveClass('hidden');
		expect(box()).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Model: gemini-test/ })).not.toBeInTheDocument();
	});

	it('offers collapse instead of close and keeps the model chip when expanded', () => {
		setup({ layout: 'sheet', compact: false, oncollapse: vi.fn() });
		expect(screen.getByRole('button', { name: 'Collapse chat' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Close chat' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Model: gemini-test/ })).toBeInTheDocument();
	});

	it('shows the example requests as a chip row in the sheet', () => {
		setup({ layout: 'sheet', compact: false });
		expect(screen.getByRole('button', { name: 'Make block 2 easier' })).toBeInTheDocument();
	});

	it('tells the sheet when the composer gets focus', async () => {
		const oncomposerfocus = vi.fn();
		setup({ layout: 'sheet', compact: true, oncomposerfocus });
		await fireEvent.focus(box());
		expect(oncomposerfocus).toHaveBeenCalled();
	});

	it('does not send with Enter on a touch screen', async () => {
		vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }));
		const send = vi.fn();
		setup({ chat: fakeChat({ canSend: true, input: 'hello', send }) });
		await fireEvent.keyDown(box(), { key: 'Enter' });
		expect(send).not.toHaveBeenCalled();
		vi.stubGlobal('matchMedia', undefined);
	});

	it('exposes the waiting state as Thinking', () => {
		setup({
			chat: fakeChat({
				status: 'submitted',
				busy: true,
				messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }]
			})
		});
		expect(screen.getByRole('status', { name: '' })).toBeInTheDocument();
		expect(screen.getByText('Thinking')).toBeInTheDocument();
	});
});
