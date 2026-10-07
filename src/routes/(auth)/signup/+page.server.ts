import { fail, redirect } from '@sveltejs/kit';
import { auth, oauthProviders } from '#lib/server/auth.js';
import { describeAuthError, signUpMessage } from '#lib/server/auth-errors.js';
import { validateSignUp, type FieldErrors, type SignUpInput } from '#lib/validation.js';
import type { Actions, PageServerLoad } from './$types';

const FIRST_RUN_PATH = '/settings/keys?welcome=1';

interface SignUpFailure {
	errors: FieldErrors<SignUpInput>;
	message?: string;
	values: { name: string; email: string };
}

const failure = (data: SignUpFailure) => fail(400, data);

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/plans');
	return { oauth: oauthProviders, callbackURL: FIRST_RUN_PATH };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const values = { name, email };

		const errors = validateSignUp({ name, email, password });
		if (Object.keys(errors).length > 0) return failure({ errors, values });

		try {
			await auth.api.signUpEmail({ body: { name, email, password }, headers: request.headers });
		} catch (error) {
			const { field, message } = signUpMessage(describeAuthError(error));
			if (field) return failure({ errors: { [field]: message }, values });
			return failure({ errors: {}, message, values });
		}

		redirect(303, FIRST_RUN_PATH);
	}
};
