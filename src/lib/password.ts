import { LIMITS } from './limits.js';

export interface PasswordRequirement {
	id: 'length' | 'uppercase' | 'number' | 'special';
	label: string;
	message: string;
	test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
	{
		id: 'length',
		label: `At least ${LIMITS.passwordMin} characters`,
		message: `Use at least ${LIMITS.passwordMin} characters.`,
		test: (password) => password.length >= LIMITS.passwordMin
	},
	{
		id: 'uppercase',
		label: 'One uppercase letter',
		message: 'Add at least one uppercase letter.',
		test: (password) => /\p{Lu}/u.test(password)
	},
	{
		id: 'number',
		label: 'One number',
		message: 'Add at least one number.',
		test: (password) => /\p{Nd}/u.test(password)
	},
	{
		id: 'special',
		label: 'One special character',
		message: 'Add at least one special character, such as ! or @.',
		test: (password) => /[^\p{L}\p{N}\s]/u.test(password)
	}
];

export const STRENGTH_LABELS = ['Very weak', 'Weak', 'Medium', 'Strong', 'Very strong'] as const;

export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
	if (!password) return 0;
	const met = PASSWORD_REQUIREMENTS.filter((requirement) => requirement.test(password)).length;
	if (met === PASSWORD_REQUIREMENTS.length) {
		return password.length >= LIMITS.passwordStrong ? 4 : 3;
	}
	return Math.max(met - 1, 0) as 0 | 1 | 2;
}

export function firstPasswordProblem(password: string): string | undefined {
	return PASSWORD_REQUIREMENTS.find((requirement) => !requirement.test(password))?.message;
}
