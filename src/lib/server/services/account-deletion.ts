import { DELETE_ACCOUNT_PHRASE } from '#lib/privacy.js';

export type DeletionResult =
	{ ok: true } | { ok: false; field: 'phrase' | 'password' | 'general'; message: string };

export interface AccountDeletionDeps {
	verifyPassword: (password: string) => Promise<boolean>;
	stopRuns: (userId: string) => Promise<void>;
	deleteUser: (password: string | undefined) => Promise<void>;
	clearVerification: (email: string) => Promise<void>;
}

export function phraseMatches(input: string): boolean {
	return input.trim().toLowerCase() === DELETE_ACCOUNT_PHRASE;
}

export function createAccountDeletion(deps: AccountDeletionDeps) {
	return async function deleteAccount(input: {
		userId: string;
		email: string;
		phrase: string;
		hasPassword: boolean;
		password: string;
	}): Promise<DeletionResult> {
		if (!phraseMatches(input.phrase)) {
			return {
				ok: false,
				field: 'phrase',
				message: `Type “${DELETE_ACCOUNT_PHRASE}” to confirm.`
			};
		}
		if (input.hasPassword) {
			if (!input.password) {
				return { ok: false, field: 'password', message: 'Enter your password.' };
			}
			if (!(await deps.verifyPassword(input.password))) {
				return { ok: false, field: 'password', message: 'The password is not correct.' };
			}
		}

		await deps.stopRuns(input.userId);
		try {
			await deps.deleteUser(input.hasPassword ? input.password : undefined);
		} catch {
			return {
				ok: false,
				field: 'general',
				message: input.hasPassword
					? 'Could not delete the account. Try again.'
					: 'Could not delete the account. Sign out, sign in again, then try once more.'
			};
		}
		await deps.clearVerification(input.email).catch(() => undefined);
		return { ok: true };
	};
}
