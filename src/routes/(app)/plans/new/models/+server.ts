import { error, json } from '@sveltejs/kit';
import { AI_FAKE } from '$app/env/private';
import { isProvider } from '#lib/providers.js';
import { modelCatalog } from '#lib/server/ai/catalog.js';
import { VaultError } from '#lib/server/crypto/vault.js';
import { requireUser } from '#lib/server/require-user.js';
import { getKey } from '#lib/server/services/provider-keys.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireUser(locals);
	const provider = url.searchParams.get('provider');
	if (!isProvider(provider)) error(400, 'Unknown provider');

	if (AI_FAKE) return json({ ok: true, models: [{ id: 'fake-model', name: 'Fake model' }] });

	let key: string | null;
	try {
		key = await getKey(user.id, provider);
	} catch (cause) {
		if (!(cause instanceof VaultError)) throw cause;
		return json(
			{
				ok: false,
				reason: 'bad-key',
				message: 'The saved key for this provider can no longer be read. Add it again in Settings.'
			},
			{ status: 400 }
		);
	}
	if (!key) {
		return json(
			{ ok: false, reason: 'no-key', message: 'Add a key for this provider first.' },
			{ status: 400 }
		);
	}

	const refresh = url.searchParams.get('refresh') === '1';
	return json(await modelCatalog.list(user.id, provider, key, refresh));
};
