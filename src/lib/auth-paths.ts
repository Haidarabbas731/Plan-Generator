export const FIRST_RUN_PATH = '/settings/keys?welcome=1';

export function verifyEmailPath(email: string): string {
	return `/verify-email?email=${encodeURIComponent(email)}`;
}
