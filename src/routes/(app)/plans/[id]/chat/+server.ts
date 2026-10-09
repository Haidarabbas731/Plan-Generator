import { error, json } from '@sveltejs/kit';
import { chatService } from '#lib/server/plans/runtime.js';
import { isConversationId } from '#lib/server/chat/chat-service.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const user = requireUser(locals);
	const requested = url.searchParams.get('conversation');
	if (requested !== null && !isConversationId(requested)) error(400, 'That chat does not exist');
	const opened = await chatService.open(user.id, params.id, requested ?? undefined);
	if (!opened) error(404, requested ? 'Chat not found' : 'Plan not found');
	return json(opened);
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const user = requireUser(locals);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Send JSON');
	}
	const { text, conversationId } = (body ?? {}) as { text?: unknown; conversationId?: unknown };

	return chatService.send({
		userId: user.id,
		planId: params.id,
		text: typeof text === 'string' ? text : '',
		conversationId: typeof conversationId === 'string' ? conversationId : undefined,
		signal: request.signal
	});
};
