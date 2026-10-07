export const AUTH_RATE_LIMIT = {
	windowSeconds: 60,
	maxRequests: 100,
	signIn: { windowSeconds: 60, maxRequests: 10 },
	signUp: { windowSeconds: 60, maxRequests: 10 }
} as const;

export const KEY_CHECK_TIMEOUT_MS = 8000;

export const LEDGER_VERBATIM_DAYS = 120;

export const GENERATION_ATTEMPTS = 2;
export const SSE_HEARTBEAT_MS = 15_000;
