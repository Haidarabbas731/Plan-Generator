import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatState, errorText, newConversationId } from './chat.svelte.js';

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

const summary = (id: string, title: string) => ({
	id,
	title,
	lastMessageAt: '2026-10-09T10:00:00Z',
	messageCount: 2
});

const reply = (body: unknown, status = 200) =>
	Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('newConversationId', () => {
	it('makes version 4 ids that the server accepts', () => {
		const id = newConversationId();
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(newConversationId()).not.toBe(id);
	});
});

describe('ChatState with several chats', () => {
	afterEach(() => vi.unstubAllGlobals());

	const user = (text: string, id = 'm') => ({
		id,
		role: 'user' as const,
		parts: [{ type: 'text' as const, text }]
	});
	const make = (initial = [user('make block 2 easier')], conversationId: string | null = 'c1') =>
		new ChatState({ planId: 'p1', conversationId, initial, onFinished: () => {} });

	it('titles the chat by its first question, or New chat while empty', () => {
		expect(make().title).toBe('make block 2 easier');
		const empty = make([], null);
		expect(empty.title).toBe('New chat');
		expect(empty.fresh).toBe(true);
		expect(empty.conversationId).not.toBe('');
	});

	it('starts a new empty chat with a new id, but not twice in a row', () => {
		const chat = make();
		const before = chat.conversationId;
		expect(chat.startNew()).toBe(true);
		expect(chat.conversationId).not.toBe(before);
		expect(chat.messages).toHaveLength(0);
		expect(chat.startNew()).toBe(false);
	});

	it('refuses a new chat when the plan is at its limit', async () => {
		vi.stubGlobal('fetch', () =>
			reply({ chats: [summary('a', 'A'), summary('b', 'B')], limit: 2 })
		);
		const chat = make();
		await chat.loadChats();
		expect(chat.startNew()).toBe(false);
		expect(chat.switchError).toContain('2 chats');
		expect(chat.conversationId).toBe('c1');
	});

	it('opens another chat from the server and keeps it separate', async () => {
		vi.stubGlobal('fetch', (url: string) => {
			expect(url).toBe('/plans/p1/chat?conversation=c2');
			return reply({ conversationId: 'c2', messages: [user('explain day 4', 'x')] });
		});
		const chat = make();
		expect(await chat.select('c2')).toBe(true);
		expect(chat.conversationId).toBe('c2');
		expect(chat.title).toBe('explain day 4');
		expect(await chat.select('c2')).toBe(false);
	});

	it('stays on the current chat and says so when another one cannot be opened', async () => {
		vi.stubGlobal('fetch', () => reply({}, 404));
		const chat = make();
		expect(await chat.select('c2')).toBe(false);
		expect(chat.conversationId).toBe('c1');
		expect(chat.switchError).toBe('Could not open that chat.');
	});

	it('deletes another chat without leaving the current one', async () => {
		vi.stubGlobal('fetch', (_url: string, init?: RequestInit) =>
			init?.method === 'DELETE'
				? reply({ removed: 'b' })
				: reply({ chats: [summary('c1', 'A'), summary('b', 'B')], limit: 30 })
		);
		const chat = make();
		await chat.loadChats();
		expect(await chat.remove('b')).toBe(true);
		expect(chat.chats.map((c) => c.id)).toEqual(['c1']);
		expect(chat.conversationId).toBe('c1');
	});

	it('moves to the next chat when the open one is deleted, or to a new one when none is left', async () => {
		vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
			if (init?.method === 'DELETE') return reply({ removed: 'x' });
			if (url.includes('/chats')) {
				return reply({ chats: [summary('c1', 'A'), summary('c2', 'B')], limit: 30 });
			}
			return reply({ conversationId: 'c2', messages: [user('second chat', 'y')] });
		});
		const chat = make();
		await chat.loadChats();
		await chat.remove('c1');
		expect(chat.conversationId).toBe('c2');
		expect(chat.title).toBe('second chat');

		await chat.remove('c2');
		expect(chat.fresh).toBe(true);
		expect(chat.conversationId).not.toBe('c2');
	});

	it('keeps the chat and reports it when a delete fails', async () => {
		vi.stubGlobal('fetch', () => reply({}, 500));
		const chat = make();
		expect(await chat.remove('c1')).toBe(false);
		expect(chat.switchError).toBe('Could not delete that chat.');
		expect(chat.title).toBe('make block 2 easier');
	});
});
