import { expect, test, type Page } from '@playwright/test';
import { emailVerificationOn } from './email.js';
import { open, PASSWORD, signUp } from './helpers.js';

async function signIn(page: Page, email: string, password: string) {
	await open(page, '/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
}

test('the settings pages need a signed-in user', async ({ page }) => {
	for (const path of ['models', 'account', 'data']) {
		await open(page, `/settings/${path}`);
		await expect(page).toHaveURL(/\/login/);
	}
});

test('the settings tabs lead to every page', async ({ page }) => {
	await signUp(page);
	const nav = page.getByRole('navigation', { name: 'Settings' });
	await nav.getByRole('link', { name: 'Model' }).click();
	await expect(page).toHaveURL(/\/settings\/models$/);
	await expect(page.getByRole('heading', { name: 'Default model' })).toBeVisible();
	await nav.getByRole('link', { name: 'Account' }).click();
	await expect(page).toHaveURL(/\/settings\/account$/);
	await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
	await nav.getByRole('link', { name: 'Data & privacy' }).click();
	await expect(page).toHaveURL(/\/settings\/data$/);
	await expect(page.getByRole('heading', { name: 'What we keep' })).toBeVisible();
});

test('changing the name is saved and kept after a reload', async ({ page }) => {
	await signUp(page, 'Old Name');
	await open(page, '/settings/account');
	await page.getByLabel('Name').fill('New Name');
	await page.getByRole('button', { name: 'Save name' }).click();
	await expect(page.getByText('Name saved')).toBeVisible();
	await page.reload();
	await expect(page.getByLabel('Name')).toHaveValue('New Name');
});

test('the name cannot be empty', async ({ page }) => {
	await signUp(page);
	await open(page, '/settings/account');
	await page.getByLabel('Name').fill('   ');
	await page.getByRole('button', { name: 'Save name' }).click();
	await expect(page.getByText('Enter your name.')).toBeVisible();
});

test('changing the password needs the right current one and works for the next sign-in', async ({
	page
}) => {
	const email = await signUp(page);
	await open(page, '/settings/account');

	await page.getByLabel('Current password').fill('wrong-password-123');
	await page.getByLabel('New password').fill('Brand-new-password-1!');
	await page.getByRole('button', { name: 'Change password' }).click();
	await expect(page.getByText('The current password is not correct.')).toBeVisible();

	await page.getByLabel('Current password').fill(PASSWORD);
	await page.getByLabel('New password').fill('Brand-new-password-1!');
	await page.getByRole('button', { name: 'Change password' }).click();
	await expect(page.getByText('Password changed')).toBeVisible();

	await page.context().clearCookies();
	await signIn(page, email, 'Brand-new-password-1!');
	await expect(page).toHaveURL(/\/plans$/);
});

test('data can be exported as a JSON file named after the day', async ({ page }) => {
	const email = await signUp(page);
	await open(page, '/settings/data');
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Download my data' }).click();
	const file = await download;
	expect(file.suggestedFilename()).toMatch(/^plan-generator-export-\d{4}-\d{2}-\d{2}\.json$/);
	const stream = await file.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk as Buffer);
	const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
	expect(body.profile.email).toBe(email);
	expect(body.plans).toEqual([]);
});

test('deleting the account needs the phrase and the password, then removes the account', async ({
	page
}) => {
	const email = await signUp(page);
	await open(page, '/settings/data');
	await page.getByRole('button', { name: 'Delete account' }).click();
	const dialog = page.getByRole('alertdialog');
	const confirm = dialog.getByRole('button', { name: 'Delete account' });
	await expect(confirm).toBeDisabled();

	await dialog.getByLabel(/Type/).fill('delete my account');
	await expect(confirm).toBeEnabled();
	await dialog.getByLabel('Your password').fill('not-the-password');
	await confirm.click();
	await expect(dialog.getByText('The password is not correct.')).toBeVisible();

	await dialog.getByLabel('Your password').fill(PASSWORD);
	await confirm.click();
	await expect(page).toHaveURL('/');

	await page.context().clearCookies();
	await signIn(page, email, PASSWORD);
	await expect(page.getByText('The email or password is not correct.')).toBeVisible();
});

test('the password reset pages follow whether email is set up', async ({ page, request }) => {
	const emailOn = await emailVerificationOn(request);
	const response = await open(page, '/forgot-password');
	expect(response?.status()).toBe(emailOn ? 200 : 404);
	await open(page, '/login');
	await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveCount(emailOn ? 1 : 0);
});
