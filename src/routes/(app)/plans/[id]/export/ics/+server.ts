import { error } from '@sveltejs/kit';
import { loadExportData } from '#lib/server/export/load.js';
import { buildIcs } from '#lib/server/export/ics.js';
import { exportFileName } from '#lib/server/export/markdown.js';
import { planStore } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';
import { MESSAGES } from '#lib/messages.js';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requireUser(locals);
	const data = await loadExportData(planStore, user.id, params.id);
	if (!data) error(404, MESSAGES.planNotFound);

	return new Response(buildIcs(data), {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': `attachment; filename="${exportFileName(data.plan.title, 'ics')}"`,
			'cache-control': 'private, no-store'
		}
	});
};
