import { error, fail, redirect } from '@sveltejs/kit';
import { auth, email } from '#lib/server/auth.js';
import { validatePassword } from '#lib/validation.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	if (!email.enabled) error(404, 'Not found');
	const token = url.searchParams.get('token');
	return { token, invalid: !token || url.searchParams.has('error') };
};

export const actions: Actions = {
	default: async ({ request }) => {
		if (!email.enabled) error(404, 'Not found');
		const form = await request.formData();
		const token = String(form.get('token') ?? '');
		const password = String(form.get('password') ?? '');
		const problem = validatePassword(password);
		if (problem) return fail(400, { error: problem, token });

		try {
			await auth.api.resetPassword({ body: { newPassword: password, token } });
		} catch {
			return fail(400, {
				error: 'This link has expired or was already used. Ask for a new one.',
				token
			});
		}
		redirect(303, '/login?reset=1');
	}
};
