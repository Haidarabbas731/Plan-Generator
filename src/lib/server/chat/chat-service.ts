import { APICallError, createAgentUIStreamResponse, type LanguageModel } from 'ai';
import type { Provider } from '#lib/providers.js';
import type { ChatUIMessage } from '#lib/chat-types.js';
import { CHAT } from '../config.js';
import { rootAiError } from '../ai/errors.js';
import type { PlanRow, PlanStore } from '../plans/plan-store.js';
import type { ChatStore, StoredMessage } from './chat-store.js';
import { createOrchestrator, planSummaryText, type EditOutcome } from './orchestrator.js';
import type { PlanEditor } from './plan-editor.js';

export class MissingChatKeyError extends Error {
	constructor(readonly provider: Provider) {
		super('Missing key');
	}
}

export interface ChatServiceDeps {
	store: PlanStore;
	chatStore: ChatStore;
	editor: PlanEditor;
	resolveModel: (plan: PlanRow) => Promise<LanguageModel>;
	maxToolSupportEntries?: number;
}

const json = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});

export function toUiMessage(message: StoredMessage): ChatUIMessage {
	return {
		id: message.id,
		role: message.role,
		parts: message.parts,
		metadata: { provider: message.provider, model: message.model }
	};
}

function looksLikeUnsupportedTools(error: unknown): boolean {
	const root = rootAiError(error);
	if (!APICallError.isInstance(root)) return false;
	const status = root.statusCode;
	if (status === undefined || ![400, 404, 422].includes(status)) return false;
	return /tool|function/i.test(`${root.message} ${root.responseBody ?? ''}`);
}

const TOOLS_UNSUPPORTED_MESSAGE =
	"This model can't use tools, so it can't edit plans. Send your message again and it will answer without making changes.";

export function createChatService(deps: ChatServiceDeps) {
	const { store, chatStore, editor, resolveModel } = deps;
	const maxEntries = deps.maxToolSupportEntries ?? 500;
	const toolsSupport = new Map<string, boolean>();

	const supportKey = (plan: PlanRow) => `${plan.userId}:${plan.provider}:${plan.model}`;

	function rememberUnsupported(key: string) {
		toolsSupport.delete(key);
		toolsSupport.set(key, false);
		while (toolsSupport.size > maxEntries) toolsSupport.delete(toolsSupport.keys().next().value!);
	}

	async function history(userId: string, planId: string): Promise<ChatUIMessage[] | null> {
		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return null;
		const conversationId = await chatStore.findConversation(userId, planId);
		if (!conversationId) return [];
		return (await chatStore.listMessages(conversationId)).map(toUiMessage);
	}

	async function send(args: {
		userId: string;
		planId: string;
		text: string;
		signal?: AbortSignal;
	}): Promise<Response> {
		const { userId, planId, signal } = args;
		const text = args.text.trim();

		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return json({ error: 'not-found', message: 'Plan not found.' }, 404);
		if (!text) return json({ error: 'empty', message: 'Write a message first.' }, 400);
		if (text.length > CHAT.maxMessageChars) {
			return json(
				{ error: 'too-long', message: `Keep messages under ${CHAT.maxMessageChars} characters.` },
				400
			);
		}
		if (plan.status === 'generating') {
			return json(
				{
					error: 'busy',
					message: 'The plan is still being written. Chat opens when it is done or paused.'
				},
				409
			);
		}

		let model: LanguageModel;
		try {
			model = await resolveModel(plan);
		} catch (error) {
			if (error instanceof MissingChatKeyError) {
				return json(
					{ error: 'no-key', message: "Add a key for this plan's provider in Settings." },
					400
				);
			}
			throw error;
		}

		const conversationId = (await chatStore.getOrCreateConversation(userId, planId))!;
		await chatStore.saveMessage({
			conversationId,
			role: 'user',
			parts: [{ type: 'text', text }]
		});
		await store.recordUsage(userId, 'chat');

		const key = supportKey(plan);
		const mode = toolsSupport.get(key) === false ? 'qa' : 'tools';
		const recent = await chatStore.recentMessages(conversationId, CHAT.historyMessages);
		const uiMessages = recent.map((message) => {
			const ui = toUiMessage(message);
			return mode === 'tools'
				? ui
				: { ...ui, parts: ui.parts.filter((part) => part.type === 'text') };
		});

		const view = await editor.getPlanView(planId);
		let lastRevision: EditOutcome | null = null;
		const agent = createOrchestrator({
			model,
			editor,
			planId,
			summary: planSummaryText(view!),
			mode,
			signal,
			onRevision: (outcome) => {
				lastRevision = outcome;
			}
		});

		return createAgentUIStreamResponse({
			agent,
			uiMessages,
			abortSignal: signal,
			messageMetadata: ({ part }) =>
				part.type === 'start' ? { provider: plan.provider, model: plan.model } : undefined,
			onError: (error) => {
				if (looksLikeUnsupportedTools(error)) {
					rememberUnsupported(key);
					return TOOLS_UNSUPPORTED_MESSAGE;
				}
				return 'Something went wrong while answering. Try again.';
			},
			onFinish: async ({ responseMessage, isAborted }) => {
				if (responseMessage.parts.length === 0 && isAborted) return;
				const revisionId = (lastRevision as EditOutcome | null)?.revisionId ?? null;
				await chatStore.saveMessage({
					conversationId,
					role: 'assistant',
					parts: responseMessage.parts,
					provider: plan.provider,
					model: plan.model,
					revisionId
				});
			}
		});
	}

	return { history, send };
}

export type ChatService = ReturnType<typeof createChatService>;
