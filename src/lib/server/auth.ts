import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
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
import {
	AUTH_RATE_LIMIT,
	EMAIL_CODE,
	EMAIL_SEND,
	PASSWORD_RESET_EXPIRY_MINUTES
} from './config.js';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { createEmailSender } from './email.js';
import { createRedisOutbox } from './email-outbox.js';
import { renderPasswordResetEmail, renderVerificationCodeEmail } from './email-templates.js';
import { logger } from './logger.js';
import { redis } from './redis.js';
import { createSendGate } from './send-gate.js';

export const oauthProviders = {
	google: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
	github: Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET)
};

export const email = createEmailSender({
	apiKey: RESEND_API_KEY,
	from: EMAIL_FROM,
	outbox: createRedisOutbox(redis)
});

export const sendGate = createSendGate(redis, EMAIL_SEND);

export const auth = betterAuth({
	baseURL: BETTER_AUTH_URL,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: LIMITS.passwordMin,
		maxPasswordLength: LIMITS.passwordMax,
		requireEmailVerification: email.enabled,
		resetPasswordTokenExpiresIn: PASSWORD_RESET_EXPIRY_MINUTES * 60,
		...(email.enabled && {
			sendResetPassword: async ({ user, url }) => {
				void email.send({
					to: user.email,
					...renderPasswordResetEmail({
						to: user.email,
						url,
						expiryMinutes: PASSWORD_RESET_EXPIRY_MINUTES
					})
				});
			}
		})
	},
	user: { deleteUser: { enabled: true } },
	...(email.enabled && {
		emailVerification: {
			sendOnSignUp: true,
			sendOnSignIn: true,
			autoSignInAfterVerification: true
		}
	}),
	onAPIError: { errorURL: '/auth-error' },
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
			},
			'/email-otp/verify-email': {
				window: AUTH_RATE_LIMIT.verifyCode.windowSeconds,
				max: AUTH_RATE_LIMIT.verifyCode.maxRequests
			},
			'/email-otp/send-verification-otp': {
				window: AUTH_RATE_LIMIT.sendCode.windowSeconds,
				max: AUTH_RATE_LIMIT.sendCode.maxRequests
			}
		}
	},
	plugins: [
		emailOTP({
			otpLength: EMAIL_CODE.length,
			expiresIn: EMAIL_CODE.expiresSeconds,
			allowedAttempts: EMAIL_CODE.allowedAttempts,
			storeOTP: 'encrypted',
			resendStrategy: 'reuse',
			overrideDefaultEmailVerification: true,
			async sendVerificationOTP({ email: to, otp, type }) {
				if (!email.enabled || type !== 'email-verification') return;
				const turn = await sendGate.take(to).catch((error) => {
					logger.warn({ err: error }, 'Could not check the email send limits');
					return { ok: true } as const;
				});
				if (!turn.ok) return;
				void email.send({
					to,
					...renderVerificationCodeEmail({
						to,
						code: otp,
						expiryMinutes: Math.round(EMAIL_CODE.expiresSeconds / 60)
					})
				});
			}
		}),
		sveltekitCookies(getRequestEvent)
	]
});
