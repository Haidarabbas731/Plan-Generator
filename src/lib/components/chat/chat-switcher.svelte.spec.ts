import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { ChatState } from '#lib/client/chat.svelte.js';
import ChatSwitcher from './chat-switcher.svelte';

const chats = [
	{ id: 'a', title: 'Make block 2 easier', lastMessageAt: '2026-10-09T10:00:00Z', messageCount: 4 },
	{ id: 'b', title: 'Explain day 4', lastMessageAt: '2026-10-08T10:00:00Z', messageCount: 2 }
];

function fakeChat(overrides: Record<string, unknown> = {}) {
	return {
		title: 'Make block 2 easier',
		conversationId: 'a',
		canSwitch: true,
		busy: false,
		chats,
		chatLimit: 30,
		listStatus: 'ready',
		switchError: null,
		loadChats: vi.fn(),
		select: vi.fn(),
		remove: vi.fn(),
		...overrides
	} as unknown as ChatState;
}

const open = async () => fireEvent.click(screen.getByRole('button', { name: /Switch chat/ }));

describe('ChatSwitcher', () => {
	it('shows the current title and loads the list when opened', async () => {
		const chat = fakeChat();
		render(ChatSwitcher, { props: { chat } });
		expect(
			screen.getByRole('button', { name: 'Chat: Make block 2 easier. Switch chat' })
		).toBeInTheDocument();
		await open();
		expect(chat.loadChats).toHaveBeenCalled();
		expect(screen.getByText('Explain day 4')).toBeInTheDocument();
		expect(screen.getByText('Deleting a chat does not change your plan.')).toBeInTheDocument();
	});

	it('marks the current chat and switches to another one', async () => {
		const chat = fakeChat();
		render(ChatSwitcher, { props: { chat } });
		await open();
		expect(screen.getByLabelText('Current chat')).toBeInTheDocument();
		await fireEvent.click(screen.getByText('Explain day 4'));
		expect(chat.select).toHaveBeenCalledWith('b');
	});

	it('asks to confirm before deleting a chat', async () => {
		const chat = fakeChat();
		render(ChatSwitcher, { props: { chat } });
		await open();
		await fireEvent.click(screen.getByRole('button', { name: 'Delete Explain day 4' }));
		expect(chat.remove).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole('button', { name: 'Confirm delete Explain day 4' }));
		expect(chat.remove).toHaveBeenCalledWith('b');
	});

	it('cannot be opened while a reply is streaming', () => {
		render(ChatSwitcher, { props: { chat: fakeChat({ canSwitch: false, busy: true }) } });
		expect(screen.getByRole('button', { name: /Switch chat/ })).toBeDisabled();
	});

	it('explains an empty list and a failed load', async () => {
		const { unmount } = render(ChatSwitcher, { props: { chat: fakeChat({ chats: [] }) } });
		await open();
		expect(screen.getByText(/show up here once you send a message/)).toBeInTheDocument();
		unmount();

		render(ChatSwitcher, { props: { chat: fakeChat({ chats: [], listStatus: 'error' }) } });
		await open();
		expect(screen.getByText('Could not load your chats.')).toBeInTheDocument();
	});

	it('shows why a switch or delete failed', async () => {
		render(ChatSwitcher, {
			props: { chat: fakeChat({ switchError: 'Could not open that chat.' }) }
		});
		await open();
		expect(screen.getByRole('alert')).toHaveTextContent('Could not open that chat.');
	});
});
