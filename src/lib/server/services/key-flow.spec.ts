import { describe, expect, it, vi } from 'vitest';
import type { KeyCheckResult } from '../ai/key-check.js';
import { saveProviderKey, type KeyFlowDeps, type KeyInfo } from './key-flow.js';

const info: KeyInfo = { provider: 'google', last4: '4321', updatedAt: new Date(0) };

function deps(check: KeyCheckResult) {
	const save = vi.fn(async () => info);
	const checkFn = vi.fn(async () => check);
	return { save, check: checkFn, bundle: { save, check: checkFn } satisfies KeyFlowDeps };
}

const input = { userId: 'u1', provider: 'google' as const, rawKey: '  AIza-valid-key-4321 ' };

describe('saveProviderKey', () => {
	it('saves a key the provider accepts', async () => {
		const d = deps({ ok: true });
		const outcome = await saveProviderKey(input, d.bundle);
		expect(outcome).toEqual({ status: 'saved', verified: true, info });
		expect(d.check).toHaveBeenCalledWith('google', 'AIza-valid-key-4321');
		expect(d.save).toHaveBeenCalledWith('u1', 'google', 'AIza-valid-key-4321');
	});

	it('does not save a key the provider rejects', async () => {
		const d = deps({ ok: false, reason: 'rejected', message: 'The provider rejected this key.' });
		const outcome = await saveProviderKey(input, d.bundle);
		expect(outcome).toEqual({ status: 'rejected', message: 'The provider rejected this key.' });
		expect(d.save).not.toHaveBeenCalled();
	});

	it('saves but warns when the provider cannot be reached', async () => {
		const d = deps({ ok: false, reason: 'unreachable', message: 'Could not reach the provider.' });
		const outcome = await saveProviderKey(input, d.bundle);
		expect(outcome).toMatchObject({
			status: 'saved',
			verified: false,
			note: 'Could not reach the provider.'
		});
		expect(d.save).toHaveBeenCalled();
	});

	it('saves but warns when the provider is rate limiting', async () => {
		const d = deps({ ok: false, reason: 'rate_limited', message: 'Rate limited.' });
		const outcome = await saveProviderKey(input, d.bundle);
		expect(outcome).toMatchObject({ status: 'saved', verified: false });
	});

	it('rejects an invalid key before calling the provider or the database', async () => {
		const d = deps({ ok: true });
		const outcome = await saveProviderKey({ ...input, rawKey: 'two words here' }, d.bundle);
		expect(outcome).toMatchObject({ status: 'invalid' });
		expect(d.check).not.toHaveBeenCalled();
		expect(d.save).not.toHaveBeenCalled();
	});
});
