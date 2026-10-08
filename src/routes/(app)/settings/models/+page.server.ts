import { fail } from '@sveltejs/kit';
import { AI_FAKE } from '$app/env/private';
import { validateDefaults } from '#lib/prefs-validation.js';
import { PROVIDER_INFO, PROVIDERS } from '#lib/providers.js';
import { requireUser } from '#lib/server/require-user.js';
import { getPrefs, savePrefs } from '#lib/server/services/prefs.js';
import { listKeys } from '#lib/server/services/provider-keys.js';
import type { Actions, PageServerLoad } from './$types';

async function connectedProviders(userId: string) {
	const keys = await listKeys(userId);
	return PROVIDERS.filter((id) => AI_FAKE || keys.some((key) => key.provider === id));
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const [connected, prefs] = await Promise.all([connectedProviders(user.id), getPrefs(user.id)]);
	const usable = prefs.defaultProvider && connected.includes(prefs.defaultProvider);
	return {
		providers: connected.map((id) => PROVIDER_INFO[id]),
		defaults: {
			provider: (usable ? prefs.defaultProvider : connected[0]) ?? '',
			model: usable ? (prefs.defaultModel ?? '') : ''
		}
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const connected = await connectedProviders(user.id);
		const result = validateDefaults(
			{ provider: form.get('provider'), model: form.get('model') },
			connected
		);
		if (!result.ok) return fail(400, { errors: result.errors });
		await savePrefs(user.id, result.value);
		return { saved: true };
	}
};
