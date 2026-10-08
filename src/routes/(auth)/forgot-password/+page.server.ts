import { error, fail } from '@sveltejs/kit';
import { auth, email } from '#lib/server/auth.js';
import { validateEmail } from '#lib/validation.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	if (!email.enabled) error(404, 'Not found');
};

export const actions: Actions = {
	default: async ({ request }) => {
		if (!email.enabled) error(404, 'Not found');
		const value = String((await request.formData()).get('email') ?? '').trim();
		const problem = validateEmail(value);
		if (problem) return fail(400, { error: problem, email: value });

		try {
			await auth.api.requestPasswordReset({
				body: { email: value, redirectTo: '/reset-password' },
				headers: request.headers
			});
		} catch {
			return fail(400, { error: 'Could not send the email. Try again in a moment.', email: value });
		}
		return { sent: true, email: value };
	}
};
