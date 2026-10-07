import { defineEnvVars } from '@sveltejs/kit/env';
import {
	base64Key32,
	booleanFlag,
	httpUrl,
	optionalString,
	positiveInt
} from '#lib/env-validators.js';

export const variables = defineEnvVars({
	DATABASE_URL: {
		schema: optionalString,
		description: 'PostgreSQL connection string'
	},
	BETTER_AUTH_SECRET: {
		schema: optionalString,
		description: 'Secret used to sign sessions'
	},
	BETTER_AUTH_URL: {
		schema: httpUrl,
		description: 'Public base URL of the app'
	},
	ENCRYPTION_KEY: {
		schema: base64Key32,
		description: '32 bytes, base64. Encrypts saved provider API keys'
	},
	GOOGLE_CLIENT_ID: { schema: optionalString },
	GOOGLE_CLIENT_SECRET: { schema: optionalString },
	GITHUB_CLIENT_ID: { schema: optionalString },
	GITHUB_CLIENT_SECRET: { schema: optionalString },
	RESEND_API_KEY: {
		schema: optionalString,
		description: 'Enables verification and password reset emails'
	},
	EMAIL_FROM: { schema: optionalString },
	LIMIT_AI_PER_HOUR: {
		schema: positiveInt(30),
		description: 'AI requests per user per hour'
	},
	LIMIT_PLANS_PER_USER: {
		schema: positiveInt(50),
		description: 'Saved plans per user'
	},
	LIMIT_CHAT_CHARS: {
		schema: positiveInt(2000),
		description: 'Maximum characters in one chat message'
	},
	AI_FAKE: {
		schema: booleanFlag,
		description: 'Tests only. Replaces providers with a deterministic fake model'
	}
});
