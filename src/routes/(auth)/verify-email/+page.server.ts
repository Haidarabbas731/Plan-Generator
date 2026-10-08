import { error, fail, redirect } from '@sveltejs/kit';
import { FIRST_RUN_PATH } from '#lib/auth-paths.js';
import { auth, email, sendGate } from '#lib/server/auth.js';
import { safeRedirectPath, validateEmail } from '#lib/validation.js';
import type { Actions, PageServerLoad } from './$types';

function addressFrom(value: string | null): string | null {
	const address = (value ?? '').trim();
	return address && !validateEmail(address) ? address : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!email.enabled) error(404, 'Not found');
	if (locals.user) redirect(303, '/plans');
	const address = addressFrom(url.searchParams.get('email'));
	if (!address) redirect(303, '/signup');
	return {
		email: address,
		next: safeRedirectPath(url.searchParams.get('next'), FIRST_RUN_PATH),
		wait: await sendGate.wait(address).catch(() => 0)
	};
};

export const actions: Actions = {
	resend: async ({ request }) => {
		if (!email.enabled) error(404, 'Not found');
		const address = addressFrom(String((await request.formData()).get('email') ?? ''));
		if (!address) return fail(400, { message: 'Enter a valid email address.' });

		const wait = await sendGate.wait(address).catch(() => 0);
		if (wait > 0) {
			return fail(429, {
				message: 'Wait a moment before asking for another code.',
				retryAfter: wait
			});
		}
		try {
			await auth.api.sendVerificationOTP({ body: { email: address, type: 'email-verification' } });
		} catch {
			return fail(400, { message: 'We could not send a new code. Try again.' });
		}
		return { resent: true, retryAfter: sendGate.cooldownSeconds };
	}
};
