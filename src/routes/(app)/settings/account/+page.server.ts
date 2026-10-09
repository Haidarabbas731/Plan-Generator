import { fail } from '@sveltejs/kit';
import { auth, email, oauthProviders } from '#lib/server/auth.js';
import { changePasswordMessage, describeAuthError } from '#lib/server/auth-errors.js';
import { requireUser } from '#lib/server/require-user.js';
import { LIMITS } from '#lib/limits.js';
import { validatePassword } from '#lib/validation.js';
import type { Actions, PageServerLoad } from './$types';

const CREDENTIAL = 'credential';
const SOCIAL_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub' };

export const load: PageServerLoad = async ({ locals, request }) => {
	const user = requireUser(locals);
	const accounts = await auth.api.listUserAccounts({ headers: request.headers });
	return {
		profile: { name: user.name, email: user.email, verified: user.emailVerified },
		hasPassword: accounts.some((account) => account.providerId === CREDENTIAL),
		connected: accounts
			.filter((account) => account.providerId !== CREDENTIAL)
			.map((account) => SOCIAL_NAMES[account.providerId] ?? account.providerId),
		connectable: (['google', 'github'] as const)
			.filter(
				(provider) =>
					oauthProviders[provider] && !accounts.some((account) => account.providerId === provider)
			)
			.map((provider) => ({ id: provider, name: SOCIAL_NAMES[provider] })),
		emailEnabled: email.enabled
	};
};

export const actions: Actions = {
	name: async ({ request, locals }) => {
		requireUser(locals);
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name) return fail(400, { section: 'name', error: 'Enter your name.', name });
		if (name.length > LIMITS.nameMax) {
			return fail(400, {
				section: 'name',
				error: `Use at most ${LIMITS.nameMax} characters.`,
				name
			});
		}
		try {
			await auth.api.updateUser({ body: { name }, headers: request.headers });
		} catch {
			return fail(400, { section: 'name', error: 'Could not save your name. Try again.', name });
		}
		return { section: 'name', saved: true };
	},

	password: async ({ request, locals }) => {
		requireUser(locals);
		const form = await request.formData();
		const current = String(form.get('currentPassword') ?? '');
		const next = String(form.get('newPassword') ?? '');
		if (!current) return fail(400, { section: 'password', error: 'Enter your current password.' });
		const invalid = validatePassword(next);
		if (invalid) return fail(400, { section: 'password', error: invalid });

		try {
			await auth.api.changePassword({
				body: { currentPassword: current, newPassword: next, revokeOtherSessions: true },
				headers: request.headers
			});
		} catch (error) {
			const message = changePasswordMessage(describeAuthError(error));
			return fail(400, { section: 'password', error: message });
		}
		return { section: 'password', saved: true };
	}
};
