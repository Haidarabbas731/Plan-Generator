import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';

function capture() {
	const lines: string[] = [];
	const stream = new Writable({
		write(chunk, _encoding, done) {
			lines.push(chunk.toString());
			done();
		}
	});
	return { lines, stream };
}

describe('logger', () => {
	it('uses the requested level', () => {
		expect(createLogger({ level: 'warn' }).level).toBe('warn');
	});

	it('redacts keys, tokens and authorization headers', () => {
		const { lines, stream } = capture();
		createLogger({}, stream).info({
			apiKey: 'sk-secret-1',
			provider: { token: 'tok-secret-2' },
			headers: { authorization: 'Bearer secret-3', accept: 'json' }
		});
		const output = lines.join('');
		expect(output).not.toMatch(/secret/);
		expect(output).toContain('[redacted]');
		expect(output).toContain('json');
	});
});
