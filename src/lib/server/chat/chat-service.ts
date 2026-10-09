import { randomUUID } from 'node:crypto';
import { createAgentUIStreamResponse, InvalidToolInputError, type LanguageModel } from 'ai';
import type { Provider } from '#lib/providers.js';
import type { ChatSummary, ChatUIMessage } from '#lib/chat-types.js';
import { CHAT } from '../config.js';
import { interpretAiError, type ErrorClass } from '../ai/provider-error.js';
import { logger } from '../logger.js';
import type { PlanRow, PlanStore } from '../plans/plan-store.js';
import { limitMessage, type UsageGuard } from '../usage-guard.js';
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
	maxMessageChars?: number;
	maxConversations?: number;
	guard?: Pick<UsageGuard, 'check'>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isConversationId = (value: unknown): value is string =>
	typeof value === 'string' && UUID.test(value);

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers }
	});

export function toUiMessage(message: StoredMessage): ChatUIMessage {
	return {
		id: message.id,
		role: message.role,
		parts: message.parts,
		metadata: { provider: message.provider, model: message.model }
	};
}

const TOOL_REJECTION_CLASSES: ReadonlySet<ErrorClass> = new Set(['bad_request', 'not_found']);

const TOOLS_UNSUPPORTED_MESSAGE =
	"This model can't use tools, so it can't edit plans. Send your message again and it will answer without making changes.";

export function createChatService(deps: ChatServiceDeps) {
	const { store, chatStore, editor, resolveModel, guard } = deps;
	const maxMessageChars = deps.maxMessageChars ?? CHAT.maxMessageChars;
	const maxConversations = deps.maxConversations ?? CHAT.maxConversationsPerPlan;
	const maxEntries = deps.maxToolSupportEntries ?? 500;
	const toolsSupport = new Map<string, boolean>();

	const supportKey = (plan: PlanRow) => `${plan.userId}:${plan.provider}:${plan.model}`;

	function rememberUnsupported(key: string) {
		toolsSupport.delete(key);
		toolsSupport.set(key, false);
		while (toolsSupport.size > maxEntries) toolsSupport.delete(toolsSupport.keys().next().value!);
	}

	async function open(
		userId: string,
		planId: string,
		conversationId?: string
	): Promise<{ conversationId: string | null; messages: ChatUIMessage[] } | null> {
		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return null;
		const id = conversationId
			? await chatStore.findConversation(userId, planId, conversationId)
			: await chatStore.latestConversation(userId, planId);
		if (!id) return conversationId ? null : { conversationId: null, messages: [] };
		return { conversationId: id, messages: (await chatStore.listMessages(id)).map(toUiMessage) };
	}

	async function history(
		userId: string,
		planId: string,
		conversationId?: string
	): Promise<ChatUIMessage[] | null> {
		return (await open(userId, planId, conversationId))?.messages ?? null;
	}

	async function list(
		userId: string,
		planId: string
	): Promise<{ chats: ChatSummary[]; limit: number } | null> {
		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return null;
		const rows = await chatStore.listConversations(userId, planId);
		return {
			chats: rows.map((row) => ({ ...row, lastMessageAt: row.lastMessageAt.toISOString() })),
			limit: maxConversations
		};
	}

	async function remove(userId: string, planId: string, conversationId: string): Promise<boolean> {
		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return false;
		return chatStore.deleteConversation(userId, planId, conversationId);
	}

	async function send(args: {
		userId: string;
		planId: string;
		text: string;
		conversationId?: string;
		signal?: AbortSignal;
	}): Promise<Response> {
		const { userId, planId, signal } = args;
		const text = args.text.trim();

		const plan = await store.getOwnedPlan(userId, planId);
		if (!plan) return json({ error: 'not-found', message: 'Plan not found.' }, 404);
		if (args.conversationId !== undefined && !isConversationId(args.conversationId)) {
			return json({ error: 'bad-chat', message: 'That chat does not exist.' }, 400);
		}
		if (!text) return json({ error: 'empty', message: 'Write a message first.' }, 400);
		if (text.length > maxMessageChars) {
			return json(
				{ error: 'too-long', message: `Keep messages under ${maxMessageChars} characters.` },
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

		const allowance = await guard?.check(userId);
		if (allowance && !allowance.ok) {
			return json(
				{
					error: 'rate-limit',
					message: limitMessage(allowance),
					retryInMinutes: allowance.retryInMinutes
				},
				429,
				{ 'retry-after': String(allowance.retryInMinutes * 60) }
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

		const existing = args.conversationId
			? await chatStore.findConversation(userId, planId, args.conversationId)
			: await chatStore.latestConversation(userId, planId);
		let conversationId = existing;
		if (!conversationId) {
			if ((await chatStore.countConversations(userId, planId)) >= maxConversations) {
				return json(
					{
						error: 'too-many-chats',
						message: `This plan has ${maxConversations} chats. Delete an old one to start a new one.`
					},
					409
				);
			}
			conversationId = await chatStore.createConversation(
				userId,
				planId,
				args.conversationId ?? randomUUID()
			);
			if (!conversationId) {
				return json({ error: 'not-found', message: 'That chat does not exist.' }, 404);
			}
		}
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
				logger.warn({ planId, err: error }, 'Chat answer failed');
				const interpreted = interpretAiError(error);
				if (InvalidToolInputError.isInstance(error)) {
					return 'The model sent a request this step could not read.';
				}
				if (mode === 'tools' && TOOL_REJECTION_CLASSES.has(interpreted.class)) {
					rememberUnsupported(key);
					const said = interpreted.detail ? ` It said: "${interpreted.detail}"` : '';
					return `${TOOLS_UNSUPPORTED_MESSAGE}${said}`;
				}
				if (interpreted.class === 'unknown') {
					return 'Something went wrong while answering. Try again.';
				}
				return interpreted.message;
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

	return { open, history, list, remove, send };
}

export type ChatService = ReturnType<typeof createChatService>;
