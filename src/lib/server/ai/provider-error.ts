import { APICallError, RetryError } from 'ai';
import { LIMITS } from '#lib/limits.js';
import { VaultError } from '../crypto/vault.js';

export type ErrorClass =
	| 'auth'
	| 'refused'
	| 'rate_limited'
	| 'not_found'
	| 'bad_request'
	| 'server'
	| 'timeout'
	| 'network'
	| 'key_unreadable'
	| 'unknown';

export interface InterpretedError {
	class: ErrorClass;
	retryable: boolean;
	headline: string;
	action: string;
	detail: string | null;
	message: string;
}

const COPY: Record<ErrorClass, { headline: string; action: string }> = {
	auth: { headline: 'The provider rejected your key.', action: 'Check it in Settings.' },
	refused: {
		headline: 'The provider refused this request for this model.',
		action: 'Try another model, or check the key in Settings.'
	},
	rate_limited: {
		headline: 'The provider is rate limiting this model or key.',
		action: 'Wait a moment and resume.'
	},
	not_found: { headline: 'The provider does not know this model.', action: 'Pick another one.' },
	bad_request: {
		headline: 'The provider could not accept this request.',
		action: 'Try again, or pick another model.'
	},
	server: { headline: 'The provider had a problem.', action: 'Resume in a moment.' },
	timeout: { headline: 'The provider took too long to answer.', action: 'Resume in a moment.' },
	network: {
		headline: 'Could not reach the provider.',
		action: 'Check your connection and resume.'
	},
	key_unreadable: {
		headline: 'The saved key can no longer be read.',
		action: 'Add it again in Settings.'
	},
	unknown: {
		headline: 'Something went wrong while writing the plan.',
		action: 'Resume to try again.'
	}
};

const DETAIL_KEYS = new Set(['raw', 'message', 'detail', 'error_description']);
const MAX_WALK_DEPTH = 6;

const CODE_KEYS = new Set(['reason', 'type', 'code', 'status']);
const CODE_CLASSES: Record<string, ErrorClass> = {
	api_key_invalid: 'auth',
	invalid_api_key: 'auth',
	authentication_error: 'auth',
	unauthenticated: 'auth',
	permission_denied: 'refused',
	permission_error: 'refused',
	rate_limit_exceeded: 'rate_limited',
	rate_limit_error: 'rate_limited',
	resource_exhausted: 'rate_limited',
	overloaded_error: 'server'
};

export function rootAiError(error: unknown): unknown {
	return RetryError.isInstance(error) ? error.lastError : error;
}

export function classifyStatus(status: number | undefined): ErrorClass {
	if (status === undefined) return 'unknown';
	if (status === 401) return 'auth';
	if (status === 403) return 'refused';
	if (status === 404) return 'not_found';
	if (status === 429) return 'rate_limited';
	if (status >= 500) return 'server';
	if (status >= 400) return 'bad_request';
	return 'unknown';
}

function parseJson(value: string): unknown {
	const trimmed = value.trim();
	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
	try {
		return JSON.parse(trimmed);
	} catch {
		return undefined;
	}
}

interface Candidate {
	text: string;
	depth: number;
}

function collect(value: unknown, depth: number, found: Candidate[]) {
	if (depth > MAX_WALK_DEPTH || value === null || typeof value !== 'object') return;
	for (const [key, child] of Object.entries(value)) {
		if (typeof child === 'string' && DETAIL_KEYS.has(key)) {
			const nested = parseJson(child);
			if (nested !== undefined) collect(nested, depth + 1, found);
			else if (child.trim()) found.push({ text: child, depth });
		} else if (typeof child === 'object') {
			collect(child, depth + 1, found);
		}
	}
}

function withoutLinks(text: string): string {
	const sentences = text.split(/(?<=[.!?])\s+/);
	const kept = sentences.filter((sentence) => !/https?:\/\//.test(sentence));
	return kept.length > 0 ? kept.join(' ') : text.replace(/https?:\/\/\S+/g, '');
}

function tidy(text: string): string {
	const clean = withoutLinks(text)
		.replace(/\s+/g, ' ')
		.replace(/[\s:;,]+$/, '')
		.trim();
	const max = LIMITS.providerMessageMax;
	return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function extractDetail(...sources: unknown[]): string | null {
	for (const source of sources) {
		const data = typeof source === 'string' ? parseJson(source) : source;
		const found: Candidate[] = [];
		collect(data, 0, found);
		const best = found.reduce<Candidate | null>(
			(top, item) => (top === null || item.depth > top.depth ? item : top),
			null
		);
		const text = best ? tidy(best.text) : '';
		if (text) return text;
	}
	return null;
}

function collectCodes(value: unknown, depth: number, codes: string[]) {
	if (depth > MAX_WALK_DEPTH || value === null || typeof value !== 'object') return;
	for (const [key, child] of Object.entries(value)) {
		if (typeof child === 'string' && CODE_KEYS.has(key)) codes.push(child.toLowerCase());
		else if (typeof child === 'object') collectCodes(child, depth + 1, codes);
	}
}

function classFromCodes(...sources: unknown[]): ErrorClass | null {
	for (const source of sources) {
		const data = typeof source === 'string' ? parseJson(source) : source;
		const codes: string[] = [];
		collectCodes(data, 0, codes);
		const hit = codes.find((code) => code in CODE_CLASSES);
		if (hit) return CODE_CLASSES[hit];
	}
	return null;
}

const isTimeout = (error: unknown) =>
	error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');

function build(
	errorClass: ErrorClass,
	retryable: boolean,
	detail: string | null
): InterpretedError {
	const { headline, action } = COPY[errorClass];
	const said = detail ? ` It said: "${detail}"` : '';
	return {
		class: errorClass,
		retryable,
		headline,
		action,
		detail,
		message: `${headline}${said} ${action}`
	};
}

export function interpretAiError(error: unknown): InterpretedError {
	const root = rootAiError(error);
	if (APICallError.isInstance(root)) {
		if (root.statusCode === undefined) {
			return build('network', true, extractDetail(root.data, root.responseBody));
		}
		const detail = extractDetail(root.data, root.responseBody) ?? (tidy(root.message) || null);
		const errorClass =
			classFromCodes(root.data, root.responseBody) ?? classifyStatus(root.statusCode);
		return build(errorClass, root.isRetryable, detail);
	}
	if (root instanceof VaultError) return build('key_unreadable', false, null);
	if (isTimeout(root)) return build('timeout', true, null);
	return build('unknown', false, null);
}

export function describeAiError(error: unknown): string {
	return interpretAiError(error).message;
}
