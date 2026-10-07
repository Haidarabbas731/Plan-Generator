import { describe, expect, it } from 'vitest';
import { ChatState, errorText } from './chat.svelte.js';

describe('errorText', () => {
	it('reads the message from a JSON error body', () => {
		expect(errorText(new Error(JSON.stringify({ error: 'busy', message: 'Still writing.' })))).toBe(
			'Still writing.'
		);
	});

	it('keeps a plain text message', () => {
		expect(errorText(new Error('Network down'))).toBe('Network down');
	});

	it('falls back for an empty error', () => {
		expect(errorText(new Error(''))).toBe('Something went wrong. Try again.');
		expect(errorText(null)).toBe('Something went wrong. Try again.');
	});
});

describe('ChatState', () => {
	const make = () => new ChatState({ planId: 'p1', initial: [], onFinished: () => {} });

	it('starts idle with the history it was given', () => {
		const chat = new ChatState({
			planId: 'p1',
			initial: [{ id: 'm', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
			onFinished: () => {}
		});
		expect(chat.messages).toHaveLength(1);
		expect(chat.busy).toBe(false);
		expect(chat.error).toBeNull();
	});

	it('can send only a non-empty message', () => {
		const chat = make();
		expect(chat.canSend).toBe(false);
		chat.input = '   ';
		expect(chat.canSend).toBe(false);
		chat.input = 'make block 2 easier';
		expect(chat.canSend).toBe(true);
	});

	it('refuses to send an empty message', () => {
		const chat = make();
		expect(chat.send('   ')).toBe(false);
		expect(chat.messages).toHaveLength(0);
	});

	it('has no revision to undo before any edit', () => {
		expect(make().lastRevisionId).toBeNull();
	});
});
