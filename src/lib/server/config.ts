export const AUTH_RATE_LIMIT = {
	windowSeconds: 60,
	maxRequests: 100,
	signIn: { windowSeconds: 60, maxRequests: 10 },
	signUp: { windowSeconds: 60, maxRequests: 10 }
} as const;

export const KEY_CHECK_TIMEOUT_MS = 8000;

export const LEDGER_VERBATIM_DAYS = 120;

export const GENERATION_ATTEMPTS = 3;
export const SSE_HEARTBEAT_MS = 15_000;

export const PLAN_QUEUE = {
	concurrency: 2,
	lockDurationMs: 30_000,
	stalledIntervalMs: 30_000,
	maxStalledCount: 3
} as const;

export const MODEL_LIST = {
	ttlMs: 60 * 60 * 1000,
	maxEntries: 500,
	timeoutMs: 10_000
} as const;

export const MODEL_COMPAT = {
	timeoutMs: 30_000,
	maxEntries: 500
} as const;

export const CHAT = {
	historyMessages: 20,
	maxSteps: 6,
	maxReviseBlocks: 3,
	maxMessageChars: 2000
} as const;

export const REVISION_KEEP = 30;
