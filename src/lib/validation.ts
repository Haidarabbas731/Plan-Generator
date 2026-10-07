export interface SignUpInput {
	name: string;
	email: string;
	password: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
	if (!email) return 'Enter your email address.';
	if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
}

export function validatePassword(password: string): string | undefined {
	if (!password) return 'Enter a password.';
	if (password.length < 8) return 'Use at least 8 characters.';
	if (password.length > 128) return 'Use at most 128 characters.';
}

export function validateSignUp(input: SignUpInput): FieldErrors<SignUpInput> {
	const errors: FieldErrors<SignUpInput> = {};
	const name = input.name.trim();
	if (!name) errors.name = 'Enter your name.';
	else if (name.length > 80) errors.name = 'Use at most 80 characters.';
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
