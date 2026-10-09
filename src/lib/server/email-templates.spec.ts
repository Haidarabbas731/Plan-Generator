import { describe, expect, it } from 'vitest';
import {
	escapeHtml,
	renderAlreadyRegisteredEmail,
	renderPasswordResetEmail,
	renderVerificationCodeEmail,
	spaceCode
} from './email-templates.js';

describe('spaceCode', () => {
	it('splits a code in half so it is easy to read', () => {
		expect(spaceCode('482913')).toBe('482 913');
		expect(spaceCode('1234')).toBe('12 34');
	});
});

describe('escapeHtml', () => {
	it('escapes the characters that can break out of text or an attribute', () => {
		expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
			'&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;'
		);
	});
});

describe('verification code email', () => {
	const mail = renderVerificationCodeEmail({
		to: 'reader@gmail.com',
		code: '482913',
		expiryMinutes: 10
	});

	it('puts the code in the subject so it shows in the notification', () => {
		expect(mail.subject).toBe('Your Plan Generator code is 482 913');
	});

	it('shows the code in the HTML as one selectable run of digits', () => {
		expect(mail.html).toContain('>482913</span>');
		expect(mail.html).toContain('The code works for 10 minutes');
	});

	it('has a plain-text twin with the code and the same expiry', () => {
		expect(mail.text).toContain('482913');
		expect(mail.text).toContain('10 minutes');
		expect(mail.text).not.toContain('<');
	});

	it('has a hidden inbox preview, a dark variant and the inline logo', () => {
		expect(mail.html).toContain('display:none');
		expect(mail.html).toContain('prefers-color-scheme: dark');
		expect(mail.html).toContain('cid:plan-generator-logo');
		expect(mail.inlineLogo).toBe(true);
	});

	it('uses the singular for a one-minute code', () => {
		const one = renderVerificationCodeEmail({ to: 'a@x.io', code: '111111', expiryMinutes: 1 });
		expect(one.text).toContain('1 minute.');
	});

	it('escapes the recipient address', () => {
		const hostile = renderVerificationCodeEmail({
			to: '"><script>alert(1)</script>@x.io',
			code: '123456',
			expiryMinutes: 10
		});
		expect(hostile.html).not.toContain('<script>');
		expect(hostile.html).toContain('&lt;script&gt;');
	});
});

describe('password reset email', () => {
	const url =
		'https://plans.example.com/api/auth/reset-password/tok?callbackURL=%2Freset-password&x=1&y=2';
	const mail = renderPasswordResetEmail({ to: 'reader@gmail.com', url, expiryMinutes: 60 });

	it('has a button that links to the reset address, escaped for HTML', () => {
		expect(mail.html).toContain(`href="${escapeHtml(url)}"`);
		expect(mail.html).toContain('Choose a new password');
	});

	it('shows the address as text too in case the button does not work', () => {
		expect(mail.html).toContain('copy this address');
		expect(mail.text).toContain(url);
	});

	it('says how long the link works in hours when it is a whole number of hours', () => {
		expect(mail.html).toContain('works for 1 hour');
		const long = renderPasswordResetEmail({ to: 'a@x.io', url, expiryMinutes: 120 });
		expect(long.text).toContain('2 hours');
		const odd = renderPasswordResetEmail({ to: 'a@x.io', url, expiryMinutes: 45 });
		expect(odd.text).toContain('45 minutes');
	});

	it('reassures a reader who did not ask for it', () => {
		expect(mail.text).toContain('If you did not ask for this');
	});
});

describe('already registered email', () => {
	const mail = renderAlreadyRegisteredEmail({
		to: 'ada@example.com',
		signInUrl: 'https://plans.example.com/login',
		resetUrl: 'https://plans.example.com/forgot-password'
	});

	it('links to sign in and to a password reset, in HTML and plain text', () => {
		expect(mail.html).toContain('href="https://plans.example.com/login"');
		expect(mail.html).toContain('href="https://plans.example.com/forgot-password"');
		expect(mail.text).toContain('https://plans.example.com/login');
		expect(mail.text).toContain('https://plans.example.com/forgot-password');
	});

	it('reassures a reader who did not try to sign up', () => {
		expect(mail.text).toContain('If this was not you, ignore this email');
		expect(mail.subject).toContain('already have');
	});

	it('has a dark variant and the inline logo like the other emails', () => {
		expect(mail.html).toContain('prefers-color-scheme: dark');
		expect(mail.inlineLogo).toBe(true);
	});
});
