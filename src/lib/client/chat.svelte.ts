import { Chat } from '@ai-sdk/svelte';
import { DefaultChatTransport } from 'ai';
import { createContext } from 'svelte';
import {
	chatTitle,
	lastEditRevision,
	NEW_CHAT_TITLE,
	textOf,
	type ChatSummary,
	type ChatUIMessage
} from '#lib/chat-types.js';
import { MESSAGES } from '#lib/messages.js';

export function errorText(error: unknown): string {
	const raw = error instanceof Error ? error.message : String(error ?? '');
	try {
		const parsed = JSON.parse(raw) as { message?: unknown };
		if (typeof parsed.message === 'string') return parsed.message;
	} catch {
		// the message was plain text
	}
	return raw || 'Something went wrong. Try again.';
}

export function newConversationId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface ChatStateOptions {
	planId: string;
	conversationId?: string | null;
	initial: ChatUIMessage[];
	onFinished: () => void;
}

export class ChatState {
	readonly planId: string;
	chat: Chat<ChatUIMessage> = $state.raw(undefined as never);
	conversationId = $state('');
	chats = $state.raw<ChatSummary[]>([]);
	chatLimit = $state<number | null>(null);
	listStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	switching = $state(false);
	switchError = $state<string | null>(null);
	input = $state('');
	readonly #onFinished: () => void;

	constructor(options: ChatStateOptions) {
		this.planId = options.planId;
		this.#onFinished = options.onFinished;
		this.#open(options.conversationId ?? newConversationId(), options.initial);
	}

	#open(conversationId: string, messages: ChatUIMessage[]) {
		this.conversationId = conversationId;
		this.input = '';
		this.chat = new Chat<ChatUIMessage>({
			id: conversationId,
			messages,
			transport: new DefaultChatTransport<ChatUIMessage>({
				api: `/plans/${this.planId}/chat`,
				prepareSendMessagesRequest: ({ messages }) => {
					const last = messages[messages.length - 1];
					return { body: { text: last ? textOf(last) : '', conversationId } };
				}
			}),
			onFinish: () => {
				this.#onFinished();
				void this.loadChats();
			}
		});
	}

	get messages(): ChatUIMessage[] {
		return this.chat.messages;
	}

	get status() {
		return this.chat.status;
	}

	get busy(): boolean {
		return this.chat.status === 'submitted' || this.chat.status === 'streaming';
	}

	get error(): string | null {
		return this.chat.error ? errorText(this.chat.error) : null;
	}

	get canSend(): boolean {
		return !this.busy && !this.switching && this.input.trim().length > 0;
	}

	get fresh(): boolean {
		return this.messages.length === 0;
	}

	get title(): string {
		const first = this.messages.find((message) => message.role === 'user');
		return first ? chatTitle(first.parts) : NEW_CHAT_TITLE;
	}

	get canSwitch(): boolean {
		return !this.busy && !this.switching;
	}

	get lastRevisionId(): string | null {
		return lastEditRevision(this.messages)?.id ?? null;
	}

	get lastRevisionNumber(): number | null {
		return lastEditRevision(this.messages)?.number ?? null;
	}

	send(text: string = this.input): boolean {
		const trimmed = text.trim();
		if (!trimmed || this.busy || this.switching) return false;
		this.chat.clearError();
		void this.chat.sendMessage({ text: trimmed });
		if (text === this.input) this.input = '';
		return true;
	}

	stop() {
		void this.chat.stop();
	}

	dismissError() {
		this.chat.clearError();
	}

	async loadChats() {
		this.listStatus = this.chats.length > 0 ? this.listStatus : 'loading';
		try {
			const response = await fetch(`/plans/${this.planId}/chats`);
			if (!response.ok) throw new Error('failed');
			const body = (await response.json()) as { chats: ChatSummary[]; limit: number };
			this.chats = body.chats;
			this.chatLimit = body.limit;
			this.listStatus = 'ready';
		} catch {
			this.listStatus = 'error';
		}
	}

	startNew(): boolean {
		if (!this.canSwitch || this.fresh) return false;
		if (this.chatLimit !== null && this.chats.length >= this.chatLimit) {
			this.switchError = `This plan has ${this.chatLimit} chats. Delete an old one to start a new one.`;
			return false;
		}
		this.switchError = null;
		this.#open(newConversationId(), []);
		return true;
	}

	async select(conversationId: string): Promise<boolean> {
		if (!this.canSwitch || conversationId === this.conversationId) return false;
		this.switching = true;
		this.switchError = null;
		try {
			const response = await fetch(
				`/plans/${this.planId}/chat?conversation=${encodeURIComponent(conversationId)}`
			);
			if (!response.ok) throw new Error('failed');
			const body = (await response.json()) as { messages: ChatUIMessage[] };
			this.#open(conversationId, body.messages);
			return true;
		} catch {
			this.switchError = MESSAGES.chatOpenFailed;
			return false;
		} finally {
			this.switching = false;
		}
	}

	async remove(conversationId: string): Promise<boolean> {
		if (!this.canSwitch) return false;
		this.switchError = null;
		try {
			const response = await fetch(`/plans/${this.planId}/chats/${conversationId}`, {
				method: 'DELETE'
			});
			if (!response.ok && response.status !== 404) throw new Error('failed');
		} catch {
			this.switchError = MESSAGES.chatDeleteFailed;
			return false;
		}
		this.chats = this.chats.filter((chat) => chat.id !== conversationId);
		if (conversationId === this.conversationId) {
			const next = this.chats[0];
			if (next) await this.select(next.id);
			else this.#open(newConversationId(), []);
		}
		return true;
	}
}

export const [getChatState, setChatState] = createContext<ChatState>();
