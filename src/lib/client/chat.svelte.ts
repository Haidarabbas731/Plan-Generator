import { Chat } from '@ai-sdk/svelte';
import { DefaultChatTransport } from 'ai';
import { createContext } from 'svelte';
import { lastEditRevision, textOf, type ChatUIMessage } from '#lib/chat-types.js';

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

export class ChatState {
	readonly planId: string;
	readonly chat: Chat<ChatUIMessage>;
	input = $state('');

	constructor(options: { planId: string; initial: ChatUIMessage[]; onFinished: () => void }) {
		this.planId = options.planId;
		this.chat = new Chat<ChatUIMessage>({
			id: options.planId,
			messages: options.initial,
			transport: new DefaultChatTransport<ChatUIMessage>({
				api: `/plans/${options.planId}/chat`,
				prepareSendMessagesRequest: ({ messages }) => {
					const last = messages[messages.length - 1];
					return { body: { text: last ? textOf(last) : '' } };
				}
			}),
			onFinish: () => options.onFinished()
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
		return !this.busy && this.input.trim().length > 0;
	}

	get lastRevisionId(): string | null {
		return lastEditRevision(this.messages)?.id ?? null;
	}

	get lastRevisionNumber(): number | null {
		return lastEditRevision(this.messages)?.number ?? null;
	}

	send(text: string = this.input): boolean {
		const trimmed = text.trim();
		if (!trimmed || this.busy) return false;
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
}

export const [getChatState, setChatState] = createContext<ChatState>();
