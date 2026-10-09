import { error, json } from '@sveltejs/kit';
import { isConversationId } from '#lib/server/chat/chat-service.js';
import { chatService } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const user = requireUser(locals);
	if (!isConversationId(params.chatId)) error(404, 'Chat not found');
	const removed = await chatService.remove(user.id, params.id, params.chatId);
	if (!removed) error(404, 'Chat not found');
	return json({ removed: params.chatId });
};
