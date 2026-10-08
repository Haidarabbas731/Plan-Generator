import { describe, expect, it } from 'vitest';
import { validateDefaults } from './prefs-validation.js';

describe('validateDefaults', () => {
	it('accepts a connected provider with a model', () => {
		expect(validateDefaults({ provider: 'google', model: ' gemini-x ' }, ['google'])).toEqual({
			ok: true,
			value: { provider: 'google', model: 'gemini-x' }
		});
	});

	it('clears the defaults when both are empty', () => {
		expect(validateDefaults({ provider: '', model: '' }, ['google'])).toEqual({
			ok: true,
			value: null
		});
	});

	it('rejects a provider without a key or an unknown one', () => {
		expect(validateDefaults({ provider: 'openai', model: 'm' }, ['google'])).toMatchObject({
			ok: false,
			errors: { provider: expect.any(String) }
		});
		expect(validateDefaults({ provider: 'nope', model: 'm' }, ['google']).ok).toBe(false);
	});

	it('needs a model and limits its length', () => {
		expect(validateDefaults({ provider: 'google', model: '' }, ['google'])).toMatchObject({
			ok: false,
			errors: { model: 'Choose a model.' }
		});
		expect(validateDefaults({ provider: 'google', model: 'x'.repeat(201) }, ['google']).ok).toBe(
			false
		);
	});
});
