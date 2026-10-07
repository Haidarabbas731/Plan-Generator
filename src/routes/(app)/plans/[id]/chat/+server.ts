import { error, json } from '@sveltejs/kit';
import { chatService } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requireUser(locals);
	const messages = await chatService.history(user.id, params.id);
	if (!messages) error(404, 'Plan not found');
	return json({ messages });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const user = requireUser(locals);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Send JSON');
	}
	const text = (body as { text?: unknown } | null)?.text;

	return chatService.send({
		userId: user.id,
		planId: params.id,
		text: typeof text === 'string' ? text : '',
		signal: request.signal
	});
};
