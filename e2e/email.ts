import { readFileSync } from 'node:fs';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { Redis } from 'ioredis';

function setting(name: string): string | undefined {
	if (process.env[name]) return process.env[name];
	try {
		const line = readFileSync(new URL('../.env', import.meta.url), 'utf8')
			.split('\n')
			.find((entry) => entry.startsWith(`${name}=`));
		return line?.slice(name.length + 1).trim();
	} catch {
		return undefined;
	}
}

export async function emailVerificationOn(request: APIRequestContext): Promise<boolean> {
	const response = await request.get('/forgot-password', { maxRedirects: 0 });
	return response.status() !== 404;
}

export async function readCode(address: string, timeoutMs = 15_000): Promise<string> {
	const url = setting('REDIS_URL');
	if (!url) throw new Error('REDIS_URL is needed to read verification codes in the tests');
	const redis = new Redis(url);
	try {
		const key = `email-outbox:${address.toLowerCase()}`;
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			const newest = await redis.lindex(key, 0);
			if (newest) {
				const text = (JSON.parse(newest) as { text: string }).text;
				const code = /\b(\d{6})\b/.exec(text)?.[1];
				if (code) return code;
			}
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
		throw new Error(`No verification email arrived for ${address}`);
	} finally {
		redis.disconnect();
	}
}

export async function clearSendHistory(address: string) {
	const url = setting('REDIS_URL');
	if (!url) throw new Error('REDIS_URL is needed to reset the email limits in the tests');
	const redis = new Redis(url);
	try {
		const name = address.toLowerCase();
		await redis.del(`otp:cooldown:${name}`, `otp:hour:${name}`, `email-outbox:${name}`);
	} finally {
		redis.disconnect();
	}
}

export async function readSubject(address: string, timeoutMs = 15_000): Promise<string> {
	const url = setting('REDIS_URL');
	if (!url) throw new Error('REDIS_URL is needed to read emails in the tests');
	const redis = new Redis(url);
	try {
		const key = `email-outbox:${address.toLowerCase()}`;
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			const newest = await redis.lindex(key, 0);
			if (newest) return (JSON.parse(newest) as { subject: string }).subject;
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
		throw new Error(`No email arrived for ${address}`);
	} finally {
		redis.disconnect();
	}
}

export const codeInput = (page: Page) => page.getByLabel('6-digit verification code');

export async function typeCode(page: Page, code: string) {
	await codeInput(page).focus();
	await page.keyboard.type(code);
}

export async function verifyWithEmailedCode(page: Page, address: string) {
	await expect(page).toHaveURL(/\/verify-email\?email=/);
	await typeCode(page, await readCode(address));
	await expect(page).toHaveURL(/\/plans$/);
}
