import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import {
	BETTER_AUTH_SECRET,
	BETTER_AUTH_URL,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
	GOOGLE_CLIENT_ID,
	EMAIL_FROM,
	GOOGLE_CLIENT_SECRET,
	RESEND_API_KEY
} from '$app/env/private';
import { LIMITS } from '#lib/limits.js';
import { AUTH_RATE_LIMIT } from './config.js';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { createEmailSender } from './email.js';

export const oauthProviders = {
	google: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
	github: Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET)
};

export const email = createEmailSender({ apiKey: RESEND_API_KEY, from: EMAIL_FROM });

export const auth = betterAuth({
	baseURL: BETTER_AUTH_URL,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: LIMITS.passwordMin,
		maxPasswordLength: LIMITS.passwordMax,
		...(email.enabled && {
			sendResetPassword: async ({ user, url }) => {
				void email.send({
					to: user.email,
					subject: 'Reset your Plan Generator password',
					text: `Use this link to choose a new password:\n\n${url}\n\nIf you did not ask for this, you can ignore this email.`
				});
			}
		})
	},
	user: { deleteUser: { enabled: true } },
	...(email.enabled && {
		emailVerification: {
			sendOnSignUp: true,
			sendVerificationEmail: async ({ user, url }) => {
				void email.send({
					to: user.email,
					subject: 'Confirm your Plan Generator email',
					text: `Confirm your email address with this link:\n\n${url}`
				});
			}
		}
	}),
	socialProviders: {
		...(oauthProviders.google && {
			google: { clientId: GOOGLE_CLIENT_ID!, clientSecret: GOOGLE_CLIENT_SECRET! }
		}),
		...(oauthProviders.github && {
			github: { clientId: GITHUB_CLIENT_ID!, clientSecret: GITHUB_CLIENT_SECRET! }
		})
	},
	rateLimit: {
		enabled: true,
		window: AUTH_RATE_LIMIT.windowSeconds,
		max: AUTH_RATE_LIMIT.maxRequests,
		customRules: {
			'/sign-in/email': {
				window: AUTH_RATE_LIMIT.signIn.windowSeconds,
				max: AUTH_RATE_LIMIT.signIn.maxRequests
			},
			'/sign-up/email': {
				window: AUTH_RATE_LIMIT.signUp.windowSeconds,
				max: AUTH_RATE_LIMIT.signUp.maxRequests
			}
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
