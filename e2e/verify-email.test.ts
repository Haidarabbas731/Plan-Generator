import { expect, test, type Page } from '@playwright/test';
import {
	clearSendHistory,
	codeInput,
	emailVerificationOn,
	readCode,
	readSubject,
	typeCode,
	verifyWithEmailedCode
} from './email.js';
import { open, PASSWORD } from './helpers.js';

let emailOn = false;

test.beforeAll(async ({ request }) => {
	emailOn = await emailVerificationOn(request);
});

test.beforeEach(() => {
	test.skip(!emailOn, 'needs email to be set up on the server');
});

const uniqueEmail = () => `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

async function startSignUp(page: Page, email: string) {
	await open(page, '/signup');
	await page.getByLabel('Name').fill('Code Tester');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/verify-email\?email=/);
}

test('signing up asks for the emailed code and the right code signs you in', async ({ page }) => {
	const email = uniqueEmail();
	await startSignUp(page, email);
	await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
	await expect(page.getByText(email)).toBeVisible();
	await expect(page.getByText(/Send a new code in \d+ seconds/)).toBeVisible();

	await verifyWithEmailedCode(page, email);
	await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test('a wrong code shakes, says so, clears the boxes and lets you try again', async ({ page }) => {
	const email = uniqueEmail();
	await startSignUp(page, email);
	const real = await readCode(email);
	const wrong = real === '000000' ? '111111' : '000000';

	await typeCode(page, wrong);
	await expect(page.getByRole('alert')).toContainText("That code isn't right");
	await expect(codeInput(page)).toHaveValue('');
	await expect(codeInput(page)).toBeFocused();
	await expect(page).toHaveURL(/\/verify-email/);

	await typeCode(page, real);
	await expect(page).toHaveURL(/\/plans$/);
});

test('a code can be pasted with a space in it', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const email = uniqueEmail();
	await startSignUp(page, email);
	const code = await readCode(email);

	await page.evaluate(
		(value) => navigator.clipboard.writeText(`${value.slice(0, 3)} ${value.slice(3)}`),
		code
	);
	await codeInput(page).focus();
	await page.keyboard.press('ControlOrMeta+V');
	await expect(page).toHaveURL(/\/plans$/);
});

test('signing in before verifying sends you to the code page', async ({ page }) => {
	const email = uniqueEmail();
	await startSignUp(page, email);

	await open(page, '/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/verify-email\?email=.*&next=%2Fplans$/);

	await typeCode(page, await readCode(email));
	await expect(page).toHaveURL(/\/plans$/);
});

test('the verify page needs an address and does not show to a signed-in user', async ({ page }) => {
	await open(page, '/verify-email');
	await expect(page).toHaveURL(/\/signup$/);
	await open(page, '/verify-email?email=not-an-email');
	await expect(page).toHaveURL(/\/signup$/);
});

test('the code boxes follow the keyboard and show the typed digits', async ({ page }) => {
	await startSignUp(page, uniqueEmail());
	await codeInput(page).focus();
	await page.keyboard.type('123');
	const keys = page.locator('.keycap');
	await expect(keys).toHaveCount(6);
	await expect(keys.nth(0)).toHaveText('1');
	await expect(keys.nth(2)).toHaveText('3');
	await expect(keys.nth(3)).toHaveAttribute('data-active', 'true');
});

test('signing up again with an unverified address sends a fresh code that works', async ({
	page
}) => {
	const email = uniqueEmail();
	await startSignUp(page, email);
	await clearSendHistory(email);

	await startSignUp(page, email);
	await typeCode(page, await readCode(email));
	await expect(page).toHaveURL(/\/plans$/);
});

test('signing up with an address that already has an account explains how to sign in', async ({
	page,
	browser
}) => {
	const email = uniqueEmail();
	await startSignUp(page, email);
	await typeCode(page, await readCode(email));
	await expect(page).toHaveURL(/\/plans$/);
	await clearSendHistory(email);

	const stranger = await (await browser.newContext()).newPage();
	await startSignUp(stranger, email);
	await expect(await readSubject(email)).toContain('already have');
	await expect(stranger.getByText('Already registered with this address?')).toBeVisible();
	await stranger.getByRole('link', { name: 'Sign in' }).click();
	await expect(stranger).toHaveURL(/\/login$/);
	await stranger.context().close();
});

test('a resent code keeps the address even when the page script did not run', async ({
	page,
	request
}) => {
	const email = uniqueEmail();
	await startSignUp(page, email);
	await clearSendHistory(email);

	const response = await request.post(`/verify-email?/resend&email=${encodeURIComponent(email)}`, {
		form: { email },
		headers: { accept: 'text/html' },
		maxRedirects: 0
	});
	expect(response.status()).toBe(200);
});
