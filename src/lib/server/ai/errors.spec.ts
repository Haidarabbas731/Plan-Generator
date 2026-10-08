import { APICallError, RetryError } from 'ai';
import { describe, expect, it } from 'vitest';
import { describeAiError } from './errors.js';

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
