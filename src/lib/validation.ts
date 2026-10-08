import { LIMITS } from './limits.js';
import { firstPasswordProblem } from './password.js';

export interface SignUpInput {
	name: string;
	email: string;
	password: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
	if (!email) return 'Enter your email address.';
	if (email.length > LIMITS.emailMax || !EMAIL_PATTERN.test(email))
		return 'Enter a valid email address.';
}

export function validatePassword(password: string): string | undefined {
	if (!password) return 'Enter a password.';
	if (password.length > LIMITS.passwordMax) {
		return `Use at most ${LIMITS.passwordMax} characters.`;
	}
	return firstPasswordProblem(password);
}

export function validateSignUp(input: SignUpInput): FieldErrors<SignUpInput> {
	const errors: FieldErrors<SignUpInput> = {};
	const name = input.name.trim();
	if (!name) errors.name = 'Enter your name.';
	else if (name.length > LIMITS.nameMax) {
		errors.name = `Use at most ${LIMITS.nameMax} characters.`;
	}
	const email = validateEmail(input.email.trim());
	if (email) errors.email = email;
	const password = validatePassword(input.password);
	if (password) errors.password = password;
	return errors;
}

export function validateSignIn(input: Pick<SignUpInput, 'email' | 'password'>) {
	const errors: FieldErrors<Pick<SignUpInput, 'email' | 'password'>> = {};
	const email = validateEmail(input.email.trim());
	if (email) errors.email = email;
	if (!input.password) errors.password = 'Enter your password.';
	return errors;
}

export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
	if (!value) return fallback;
	if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
	return value;
}

export function normalizeApiKey(raw: string): { key: string } | { error: string } {
	const key = raw.trim();
	if (!key) return { error: 'Paste your API key.' };
	if (/\s/.test(key)) return { error: 'The key cannot contain spaces or line breaks.' };
	if (key.length < LIMITS.apiKeyMin) return { error: 'That key looks too short.' };
	if (key.length > LIMITS.apiKeyMax) return { error: 'That key looks too long.' };
	return { key };
}
