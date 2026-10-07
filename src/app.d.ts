declare global {
	namespace App {
		interface AuthUser {
			id: string;
			name: string;
			email: string;
			image?: string | null;
		}

		interface AuthSession {
			id: string;
			userId: string;
			expiresAt: Date;
		}

		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
			user: AuthUser | null;
			session: AuthSession | null;
		}
	}
}

export {};
