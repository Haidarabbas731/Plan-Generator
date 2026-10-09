export const FIRST_RUN_PATH = '/plans';

export function verifyEmailPath(email: string, next?: string): string {
	const base = `/verify-email?email=${encodeURIComponent(email)}`;
	return next ? `${base}&next=${encodeURIComponent(next)}` : base;
}
