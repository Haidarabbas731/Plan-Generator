import { APICallError, RetryError } from 'ai';
import { describe, expect, it } from 'vitest';
import {
	classifyStatus,
	describeAiError,
	extractDetail,
	interpretAiError
} from './provider-error.js';

const apiError = (statusCode: number) =>
	new APICallError({
		message: 'failed',
		url: 'https://example.com',
		requestBodyValues: {},
		statusCode
	});

const retryError = (lastError: unknown) =>
	new RetryError({
		message: 'Failed after 3 attempts',
		reason: 'maxRetriesExceeded',
		errors: [lastError]
	});

describe('describeAiError', () => {
	it('explains a rejected key', () => {
		expect(describeAiError(apiError(401))).toContain('rejected your key');
		expect(describeAiError(apiError(403))).toContain('refused this request for this model');
	});

	it('repeats what the provider said when it refuses a request', () => {
		const refused = new APICallError({
			message: 'The request is prohibited due to a violation of provider Terms Of Service.',
			url: 'https://example.com',
			requestBodyValues: {},
			statusCode: 403
		});
		expect(describeAiError(refused)).toContain('violation of provider Terms Of Service');
		expect(describeAiError(refused)).toContain('Try another model');
	});

	it('explains an unknown model, rate limits and provider problems', () => {
		expect(describeAiError(apiError(404))).toContain('does not know this model');
		expect(describeAiError(apiError(429))).toContain('rate limiting');
		expect(describeAiError(apiError(503))).toContain('had a problem');
	});

	it('looks through the retry wrapper to the last error', () => {
		expect(describeAiError(retryError(apiError(429)))).toContain('rate limiting');
		expect(describeAiError(retryError(apiError(500)))).toContain('had a problem');
	});

	it('explains a timeout', () => {
		const timeout = new Error('timed out');
		timeout.name = 'TimeoutError';
		expect(describeAiError(timeout)).toContain('took too long');
		expect(describeAiError(retryError(timeout))).toContain('took too long');
	});

	it('falls back to a general message for anything else', () => {
		expect(describeAiError(new Error('boom'))).toContain('Something went wrong');
		expect(describeAiError('text')).toContain('Something went wrong');
	});
});

const openRouter429 = {
	error: {
		message: 'Provider returned error',
		code: 429,
		metadata: {
			raw: 'google/gemma-4-31b-it:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations',
			provider_name: 'Google AI Studio'
		}
	},
	user_id: 'user_123'
};

describe('extractDetail', () => {
	it('prefers the deepest sentence and drops links', () => {
		const detail = extractDetail(openRouter429);
		expect(detail).toContain('temporarily rate-limited upstream');
		expect(detail).not.toContain('http');
		expect(detail).not.toContain('user_123');
		expect(detail?.endsWith(':')).toBe(false);
	});

	it('reads the shapes of OpenAI, Anthropic and Google', () => {
		expect(extractDetail({ error: { message: 'Incorrect API key', type: 'x', code: 'y' } })).toBe(
			'Incorrect API key'
		);
		expect(
			extractDetail({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })
		).toBe('Overloaded');
		expect(extractDetail({ error: { code: 400, message: 'API key not valid', status: 'X' } })).toBe(
			'API key not valid'
		);
	});

	it('reads a JSON string and a JSON string nested inside a field', () => {
		expect(extractDetail(JSON.stringify({ error: { message: 'plain' } }))).toBe('plain');
		expect(
			extractDetail({
				error: { message: 'wrapper', metadata: { raw: '{"error":{"message":"inner"}}' } }
			})
		).toBe('inner');
	});

	it('returns null for nothing useful and caps long text', () => {
		expect(extractDetail('not json', null, undefined, { a: 1 })).toBeNull();
		expect(extractDetail({ message: 'x'.repeat(500) })?.length).toBeLessThanOrEqual(160);
	});
});

describe('interpretAiError with provider bodies', () => {
	it('shows what OpenRouter said for a rate limit', () => {
		const error = new APICallError({
			message: 'Provider returned error',
			url: 'https://example.com',
			requestBodyValues: {},
			statusCode: 429,
			data: openRouter429,
			isRetryable: true
		});
		const result = interpretAiError(error);
		expect(result.class).toBe('rate_limited');
		expect(result.retryable).toBe(true);
		expect(result.message).toContain('temporarily rate-limited upstream');
	});

	it('shows the provider words for an error class we never planned for', () => {
		const error = new APICallError({
			message: 'Payment required',
			url: 'https://example.com',
			requestBodyValues: {},
			statusCode: 402,
			data: { error: { message: 'Insufficient credits' } }
		});
		const result = interpretAiError(error);
		expect(result.class).toBe('bad_request');
		expect(result.message).toContain('Insufficient credits');
	});

	it('treats an error without a status as a connection problem', () => {
		const error = new APICallError({
			message: 'Cannot connect to API',
			url: 'https://example.com',
			requestBodyValues: {}
		});
		expect(interpretAiError(error).class).toBe('network');
	});
});

describe('classifyStatus', () => {
	it('maps statuses to classes', () => {
		expect(classifyStatus(401)).toBe('auth');
		expect(classifyStatus(403)).toBe('refused');
		expect(classifyStatus(404)).toBe('not_found');
		expect(classifyStatus(429)).toBe('rate_limited');
		expect(classifyStatus(503)).toBe('server');
		expect(classifyStatus(418)).toBe('bad_request');
		expect(classifyStatus(undefined)).toBe('unknown');
	});
});

describe('structured codes', () => {
	it('calls a bad Google key a key problem even though the status is 400', () => {
		const error = new APICallError({
			message: 'API key not valid. Please pass a valid API key.',
			url: 'https://example.com',
			requestBodyValues: {},
			statusCode: 400,
			data: {
				error: {
					code: 400,
					message: 'API key not valid. Please pass a valid API key.',
					status: 'INVALID_ARGUMENT',
					details: [{ '@type': 'x', reason: 'API_KEY_INVALID' }]
				}
			}
		});
		expect(interpretAiError(error).class).toBe('auth');
	});

	it('keeps the sentence before a link and drops the link sentence', () => {
		expect(
			extractDetail({
				error: {
					message: 'Incorrect API key provided. You can find your API key at https://x.test/keys.'
				}
			})
		).toBe('Incorrect API key provided.');
	});
});
