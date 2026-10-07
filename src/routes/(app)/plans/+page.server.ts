import { requireUser } from '#lib/server/require-user.js';
import { listKeys } from '#lib/server/services/provider-keys.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const keys = await listKeys(user.id);
	return { hasKeys: keys.length > 0 };
};
