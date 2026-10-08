import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { auth } from '#lib/server/auth.js';
import { db } from '#lib/server/db/index.js';
import { verification } from '#lib/server/db/schema.js';
import { planService, planStore } from '#lib/server/plans/runtime.js';
import { requireUser } from '#lib/server/require-user.js';
import { createAccountDeletion } from '#lib/server/services/account-deletion.js';
import type { Actions, PageServerLoad } from './$types';

const hasPasswordLogin = async (headers: Headers) => {
	const accounts = await auth.api.listUserAccounts({ headers });
	return accounts.some((account) => account.providerId === 'credential');
};

export const load: PageServerLoad = async ({ locals, request }) => {
	requireUser(locals);
	return { hasPassword: await hasPasswordLogin(request.headers) };
};

export const actions: Actions = {
	deleteAccount: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const hasPassword = await hasPasswordLogin(request.headers);

		const deleteAccount = createAccountDeletion({
			verifyPassword: async (password) => {
				try {
					await auth.api.verifyPassword({ body: { password }, headers: request.headers });
					return true;
				} catch {
					return false;
				}
			},
			stopRuns: async (userId) => {
				const summaries = await planStore.listPlanSummaries(userId);
				await Promise.all(
					summaries
						.filter((plan) => plan.status === 'generating')
						.map((plan) => planService.cancelPlan(userId, plan.id))
				);
			},
			deleteUser: async (password) => {
				await auth.api.deleteUser({
					body: password ? { password } : {},
					headers: request.headers
				});
			},
			clearVerification: async (email) => {
				await db.delete(verification).where(eq(verification.identifier, email));
			}
		});

		const result = await deleteAccount({
			userId: user.id,
			email: user.email,
			phrase: String(form.get('phrase') ?? ''),
			hasPassword,
			password: String(form.get('password') ?? '')
		});
		if (!result.ok) return fail(400, { field: result.field, message: result.message });
		redirect(303, '/');
	}
};
