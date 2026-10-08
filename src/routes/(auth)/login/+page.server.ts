import { fail, redirect } from '@sveltejs/kit';
import { verifyEmailPath } from '#lib/auth-paths.js';
import { auth, email, oauthProviders } from '#lib/server/auth.js';
import { describeAuthError, isEmailNotVerified, signInMessage } from '#lib/server/auth-errors.js';
import { safeRedirectPath, validateSignIn, type FieldErrors } from '#lib/validation.js';
import type { Actions, PageServerLoad } from './$types';

interface SignInFailure {
	errors: FieldErrors<{ email: string; password: string }>;
	message?: string;
	values: { email: string };
}

const failure = (data: SignInFailure) => fail(400, data);

export const load: PageServerLoad = ({ locals, url }) => {
	const redirectTo = safeRedirectPath(url.searchParams.get('redirectTo'), '/plans');
	if (locals.user) redirect(303, redirectTo);
	return {
		oauth: oauthProviders,
		redirectTo,
		emailEnabled: email.enabled,
		passwordReset: url.searchParams.get('reset') === '1'
	};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const values = { email };

		const errors = validateSignIn({ email, password });
		if (Object.keys(errors).length > 0) return failure({ errors, values });

		try {
			await auth.api.signInEmail({ body: { email, password }, headers: request.headers });
		} catch (error) {
			const problem = describeAuthError(error);
			if (isEmailNotVerified(problem)) redirect(303, verifyEmailPath(email));
			return failure({ errors: {}, message: signInMessage(problem), values });
		}

		redirect(303, safeRedirectPath(url.searchParams.get('redirectTo'), '/plans'));
	}
};
