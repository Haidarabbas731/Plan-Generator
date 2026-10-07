import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.js';

const PASSWORD = 'correct-horse-battery';

function uniqueEmail() {
	return `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signUp(page: Page, email: string, name = 'E2E User') {
	await open(page, '/signup');
	await page.getByLabel('Name').fill(name);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/settings\/keys\?welcome=1$/);
}

async function signOut(page: Page) {
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Account menu' }).click();
	await page.getByRole('menuitem', { name: 'Sign out' }).click();
	await expect(page).toHaveURL('/');
}

test('sign up, sign out, protected page redirects, then sign in', async ({ page }) => {
	const email = uniqueEmail();
	await signUp(page, email);

	await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
	await signOut(page);
	await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

	await open(page, '/plans');
	await expect(page).toHaveURL(/\/login\?redirectTo=%2Fplans$/);

	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/plans');
	await expect(page.getByRole('heading', { name: 'Your plans' })).toBeVisible();
});

test('sign in with a wrong password shows a clear error and keeps the email', async ({ page }) => {
	const email = uniqueEmail();
	await signUp(page, email);
	await signOut(page);

	await open(page, '/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill('not-the-password');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByRole('alert')).toContainText('The email or password is not correct.');
	await expect(page.getByLabel('Email')).toHaveValue(email);
	await expect(page).toHaveURL(/\/login/);
});

test('sign up shows a message for each invalid field', async ({ page }) => {
	await open(page, '/signup');
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page.getByText('Enter your name.')).toBeVisible();
	await expect(page.getByText('Enter your email address.')).toBeVisible();
	await expect(page.getByText('Enter a password.')).toBeVisible();
	await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
});

test('sign up with an email that already has an account is rejected', async ({ page }) => {
	const email = uniqueEmail();
	await signUp(page, email);
	await signOut(page);

	await open(page, '/signup');
	await page.getByLabel('Name').fill('Someone Else');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page.getByText('An account with this email already exists.')).toBeVisible();
	await expect(page).toHaveURL(/\/signup/);
});

test('the password can be shown and hidden', async ({ page }) => {
	await open(page, '/login');
	const password = page.getByLabel('Password', { exact: true });
	await expect(password).toHaveAttribute('type', 'password');
	await page.getByRole('button', { name: 'Show password' }).click();
	await expect(password).toHaveAttribute('type', 'text');
	await page.getByRole('button', { name: 'Hide password' }).click();
	await expect(password).toHaveAttribute('type', 'password');
});

test('a signed-in visitor is sent away from the login page', async ({ page }) => {
	await signUp(page, uniqueEmail());
	await open(page, '/login');
	await expect(page).toHaveURL('/plans');
});
