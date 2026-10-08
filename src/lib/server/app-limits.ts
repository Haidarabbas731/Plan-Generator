import { LIMIT_AI_PER_HOUR, LIMIT_CHAT_CHARS, LIMIT_PLANS_PER_USER } from '$app/env/private';

export const appLimits = {
	aiPerHour: LIMIT_AI_PER_HOUR,
	plansPerUser: LIMIT_PLANS_PER_USER,
	chatChars: LIMIT_CHAT_CHARS
} as const;
