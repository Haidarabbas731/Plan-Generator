import { json } from '@sveltejs/kit';
import { DATA_EXPORT } from '#lib/server/config.js';
import { db } from '#lib/server/db/index.js';
import { buildUserExport, exportFilename } from '#lib/server/export/user-data.js';
import { createRateLimiter } from '#lib/server/rate-limiter.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';

const limiter = createRateLimiter(DATA_EXPORT);

export const GET: RequestHandler = async ({ locals }) => {
	const user = requireUser(locals);
	const turn = limiter.take(user.id);
	if (!turn.ok) {
		return json(
			{
				message: `You can export your data a few times an hour. Try again in ${turn.retryInMinutes} minutes.`
			},
			{ status: 429, headers: { 'retry-after': String(turn.retryInMinutes * 60) } }
		);
	}
	const data = await buildUserExport(db, user.id);
	if (!data) return json({ message: 'Account not found.' }, { status: 404 });
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'content-type': 'application/json',
			'content-disposition': `attachment; filename="${exportFilename()}"`,
			'cache-control': 'no-store'
		}
	});
};
