import { fail } from '@sveltejs/kit';
import { isProvider, PROVIDER_INFO, PROVIDERS, type Provider } from '#lib/providers.js';
import { checkKey } from '#lib/server/ai/key-check.js';
import { VaultError } from '#lib/server/crypto/vault.js';
import { requireUser } from '#lib/server/require-user.js';
import { saveProviderKey } from '#lib/server/services/key-flow.js';
import { deleteKey, getKey, listKeys, saveKey } from '#lib/server/services/provider-keys.js';
import type { Actions, PageServerLoad } from './$types';

interface KeyActionResult {
	provider: Provider | null;
	kind?: 'saved' | 'tested' | 'removed';
	message?: string;
	error?: string;
}

const failure = (data: KeyActionResult) => fail(400, data);

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const keys = await listKeys(user.id);
	const providers = PROVIDERS.map((id) => {
		const key = keys.find((entry) => entry.provider === id);
		return {
			...PROVIDER_INFO[id],
			key: key ? { last4: key.last4, updatedAt: key.updatedAt } : null
		};
	});
	return { providers };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const provider = form.get('provider');
		if (!isProvider(provider)) return failure({ provider: null, error: 'Choose a provider.' });

		const outcome = await saveProviderKey(
			{ userId: user.id, provider, rawKey: String(form.get('apiKey') ?? '') },
			{ check: checkKey, save: saveKey }
		);

		if (outcome.status !== 'saved') return failure({ provider, error: outcome.message });
		return {
			provider,
			kind: 'saved',
			message: outcome.verified
				? `${PROVIDER_INFO[provider].name} key saved and verified.`
				: `${PROVIDER_INFO[provider].name} key saved. ${outcome.note}`
		} satisfies KeyActionResult;
	},

	test: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const provider = form.get('provider');
		if (!isProvider(provider)) return failure({ provider: null, error: 'Choose a provider.' });

		let apiKey: string | null;
		try {
			apiKey = await getKey(user.id, provider);
		} catch (error) {
			if (error instanceof VaultError) return failure({ provider, error: error.message });
			throw error;
		}
		if (!apiKey) return failure({ provider, error: 'No key is saved for this provider.' });

		const result = await checkKey(provider, apiKey);
		if (!result.ok) return failure({ provider, error: result.message });
		return {
			provider,
			kind: 'tested',
			message: `${PROVIDER_INFO[provider].name} accepted the key.`
		} satisfies KeyActionResult;
	},

	remove: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const provider = form.get('provider');
		if (!isProvider(provider)) return failure({ provider: null, error: 'Choose a provider.' });

		await deleteKey(user.id, provider);
		return {
			provider,
			kind: 'removed',
			message: `${PROVIDER_INFO[provider].name} key removed.`
		} satisfies KeyActionResult;
	}
};
