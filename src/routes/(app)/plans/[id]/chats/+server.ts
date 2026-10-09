import { error, json } from '@sveltejs/kit';
import { chatService } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';
import { MESSAGES } from '#lib/messages.js';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requireUser(locals);
	const list = await chatService.list(user.id, params.id);
	if (!list) error(404, MESSAGES.planNotFound);
	return json(list);
};
