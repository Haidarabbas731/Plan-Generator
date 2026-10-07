import { error } from '@sveltejs/kit';
import { loadExportData } from '#lib/server/export/load.js';
import { buildMarkdown, exportFileName } from '#lib/server/export/markdown.js';
import { planStore } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requireUser(locals);
	const data = await loadExportData(planStore, user.id, params.id);
	if (!data) error(404, 'Plan not found');

	return new Response(buildMarkdown(data), {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'content-disposition': `attachment; filename="${exportFileName(data.plan.title, 'md')}"`,
			'cache-control': 'private, no-store'
		}
	});
};
