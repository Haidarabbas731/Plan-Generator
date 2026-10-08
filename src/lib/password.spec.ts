import { describe, expect, it } from 'vitest';
import { LIMITS } from './limits.js';
import {
	firstPasswordProblem,
	getPasswordStrength,
	PASSWORD_REQUIREMENTS,
	STRENGTH_LABELS
} from './password.js';

const passing = (id: string, password: string) =>
	PASSWORD_REQUIREMENTS.find((requirement) => requirement.id === id)!.test(password);

describe('requirements', () => {
	it('checks the length against the shared minimum', () => {
		expect(passing('length', 'a'.repeat(LIMITS.passwordMin - 1))).toBe(false);
		expect(passing('length', 'a'.repeat(LIMITS.passwordMin))).toBe(true);
	});

	it('checks each character class on its own', () => {
		expect(passing('uppercase', 'abc')).toBe(false);
		expect(passing('uppercase', 'abC')).toBe(true);
		expect(passing('number', 'abc')).toBe(false);
		expect(passing('number', 'ab3')).toBe(true);
		expect(passing('special', 'abc123 ')).toBe(false);
		expect(passing('special', 'abc!')).toBe(true);
		expect(passing('special', 'abc~')).toBe(true);
		expect(passing('special', 'abc_')).toBe(true);
	});
});

describe('firstPasswordProblem', () => {
	it('reports the first unmet rule in the order the rules are shown', () => {
		expect(firstPasswordProblem('short')).toBe(PASSWORD_REQUIREMENTS[0].message);
		expect(firstPasswordProblem('longenough')).toBe(PASSWORD_REQUIREMENTS[1].message);
		expect(firstPasswordProblem('Longenough')).toBe(PASSWORD_REQUIREMENTS[2].message);
		expect(firstPasswordProblem('Longenough1')).toBe(PASSWORD_REQUIREMENTS[3].message);
	});

	it('accepts a password that meets every rule, including a very long one', () => {
		expect(firstPasswordProblem('Correct-horse-9')).toBeUndefined();
		expect(firstPasswordProblem(`Aa1!${'x'.repeat(LIMITS.passwordMax - 4)}`)).toBeUndefined();
	});
});

describe('getPasswordStrength', () => {
	it('is zero for nothing and for a password that only has length', () => {
		expect(getPasswordStrength('')).toBe(0);
		expect(getPasswordStrength('abcdefgh')).toBe(0);
	});

	it('grows with every rule that is met', () => {
		expect(getPasswordStrength('Abcdefgh')).toBe(1);
		expect(getPasswordStrength('Abcdefg1')).toBe(2);
	});

	it('reaches strong with every rule and very strong at the strong length', () => {
		const short = 'Abcdef1!';
		const long = `Abcdefghij1!`.slice(0, LIMITS.passwordStrong - 2) + '1!';
		expect(short.length).toBeLessThan(LIMITS.passwordStrong);
		expect(getPasswordStrength(short)).toBe(3);
		expect(long.length).toBe(LIMITS.passwordStrong);
		expect(getPasswordStrength(long)).toBe(4);
	});

	it('has a label for every level', () => {
		expect(STRENGTH_LABELS).toHaveLength(5);
	});
});
