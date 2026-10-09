import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { ChatUIMessage } from '#lib/chat-types.js';
import ChatMessage from './chat-message.svelte';

const make = (
	role: 'user' | 'assistant',
	parts: unknown[],
	model: string | null = null
): ChatUIMessage => ({ id: 'm1', role, parts, metadata: { model } }) as ChatUIMessage;

const editStep = {
	type: 'tool-revise_blocks',
	toolCallId: 'c1',
	state: 'output-available',
	output: { ok: true, summary: 'Rewrote block 2.', revisionId: 'r2', staleBlocks: [] }
};

describe('ChatMessage', () => {
	it('shows a user message as plain text', () => {
		render(ChatMessage, {
			props: { message: make('user', [{ type: 'text', text: 'make it <b>easier</b>' }]) }
		});
		expect(screen.getByText('make it <b>easier</b>')).toBeInTheDocument();
		expect(document.querySelector('b')).toBeNull();
	});

	it('shows the model of an assistant reply', () => {
		render(ChatMessage, {
			props: { message: make('assistant', [{ type: 'text', text: 'Hello' }], 'claude-haiku') }
		});
		expect(screen.getByText('claude-haiku')).toBeInTheDocument();
	});

	it('hides the model chip while the reply is streaming', () => {
		render(ChatMessage, {
			props: {
				message: make('assistant', [{ type: 'text', text: 'Hel' }], 'claude-haiku'),
				streaming: true
			}
		});
		expect(screen.queryByText('claude-haiku')).not.toBeInTheDocument();
	});

	it('shows agent steps between text', () => {
		render(ChatMessage, {
			props: { message: make('assistant', [editStep, { type: 'text', text: 'Done.' }]) }
		});
		expect(screen.getByRole('button', { name: /Rewrote block 2/ })).toBeInTheDocument();
		expect(screen.getByText('Done.')).toBeInTheDocument();
	});

	it('offers Undo only for the latest revision', () => {
		const { unmount } = render(ChatMessage, {
			props: { message: make('assistant', [editStep]), undoableRevisionId: 'r2', onundo: () => {} }
		});
		expect(screen.getByRole('button', { name: /Undo/ })).toBeInTheDocument();
		unmount();

		render(ChatMessage, {
			props: { message: make('assistant', [editStep]), undoableRevisionId: 'r9', onundo: () => {} }
		});
		expect(screen.queryByRole('button', { name: /Undo/ })).not.toBeInTheDocument();
	});

	it('does not offer Undo while streaming', () => {
		render(ChatMessage, {
			props: {
				message: make('assistant', [editStep]),
				undoableRevisionId: 'r2',
				streaming: true,
				onundo: () => {}
			}
		});
		expect(screen.queryByRole('button', { name: /Undo/ })).not.toBeInTheDocument();
	});

	it('skips empty text parts', () => {
		const { container } = render(ChatMessage, {
			props: { message: make('assistant', [{ type: 'text', text: '' }]) }
		});
		expect(container.querySelector('[data-role="assistant"]')?.children.length).toBe(0);
	});
});
