import { describe, expect, it, vi } from 'vitest';
import { createAccountDeletion } from './account-deletion.js';

function setup(overrides: Partial<Parameters<typeof createAccountDeletion>[0]> = {}) {
	const calls: string[] = [];
	const deps = {
		verifyPassword: vi.fn(async () => {
			calls.push('verify');
			return true;
		}),
		stopRuns: vi.fn(async () => void calls.push('stop')),
		deleteUser: vi.fn(async () => void calls.push('delete')),
		clearVerification: vi.fn(async () => void calls.push('clear')),
		...overrides
	};
	const run = createAccountDeletion(deps);
	const input = {
		userId: 'u1',
		email: 'a@example.com',
		phrase: 'Delete my account',
		hasPassword: true,
		password: 'secret-pass'
	};
	return { deps, run, input, calls };
}

describe('account deletion', () => {
	it('checks the phrase before anything else happens', async () => {
		const { run, input, deps } = setup();
		const result = await run({ ...input, phrase: 'delete it' });
		expect(result).toMatchObject({ ok: false, field: 'phrase' });
		expect(deps.verifyPassword).not.toHaveBeenCalled();
		expect(deps.stopRuns).not.toHaveBeenCalled();
	});

	it('asks for the password and leaves running plans alone when it is wrong', async () => {
		const { run, input, deps } = setup({ verifyPassword: vi.fn(async () => false) });
		expect(await run({ ...input, password: '' })).toMatchObject({ ok: false, field: 'password' });
		expect(await run(input)).toMatchObject({ ok: false, field: 'password' });
		expect(deps.stopRuns).not.toHaveBeenCalled();
		expect(deps.deleteUser).not.toHaveBeenCalled();
	});

	it('stops runs, deletes the user and clears leftover verification rows in order', async () => {
		const { run, input, calls, deps } = setup();
		expect(await run(input)).toEqual({ ok: true });
		expect(calls).toEqual(['verify', 'stop', 'delete', 'clear']);
		expect(deps.deleteUser).toHaveBeenCalledWith('secret-pass');
		expect(deps.clearVerification).toHaveBeenCalledWith('a@example.com');
	});

	it('deletes accounts without a password after the phrase alone', async () => {
		const { run, input, deps } = setup();
		expect(await run({ ...input, hasPassword: false, password: '' })).toEqual({ ok: true });
		expect(deps.verifyPassword).not.toHaveBeenCalled();
		expect(deps.deleteUser).toHaveBeenCalledWith(undefined);
	});

	it('reports a failed deletion without claiming success', async () => {
		const { run, input, deps } = setup({
			deleteUser: vi.fn(async () => {
				throw new Error('fresh session required');
			})
		});
		const result = await run({ ...input, hasPassword: false, password: '' });
		expect(result).toMatchObject({ ok: false, field: 'general' });
		expect(deps.clearVerification).not.toHaveBeenCalled();
	});
});
