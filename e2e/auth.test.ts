import { expect, test, type Page } from '@playwright/test';
import { emailVerificationOn, verifyWithEmailedCode } from './email.js';
import { open, PASSWORD } from './helpers.js';

function uniqueEmail() {
	return `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signUp(page: Page, email: string, name = 'E2E User') {
	await open(page, '/signup');
	await page.getByLabel('Name').fill(name);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();
	await page.waitForURL(/\/(settings\/keys\?welcome=1|verify-email\?)/);
	if (page.url().includes('/verify-email')) await verifyWithEmailedCode(page, email);
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
	await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();

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

test('the password rules show while typing and a weak password is refused with the first missing rule', async ({
	page
}) => {
	await open(page, '/signup');
	const password = page.getByLabel('Password', { exact: true });
	const rules = page.getByRole('list').filter({ hasText: 'One uppercase letter' });
	await expect(rules).toBeHidden();

	await password.fill('longenough');
	await expect(rules).toBeVisible();
	await expect(rules.getByText('At least 8 characters')).toContainText('met');
	await expect(rules.getByText('One uppercase letter')).toContainText('not met');

	await password.fill('Longenough1!');
	await expect(rules.getByText('One special character')).toContainText('met');
	await expect(page.getByRole('status').filter({ hasText: /Strong|Very strong/ })).toBeVisible();

	await page.getByLabel('Name').fill('Weak Tester');
	await page.getByLabel('Email').fill(uniqueEmail());
	await password.fill('longenough');
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByText('Add at least one uppercase letter.')).toBeVisible();
	await expect(page).toHaveURL(/\/signup/);
});

test('the sign-up endpoint itself refuses a weak password', async ({ request }) => {
	const response = await request.post('/api/auth/sign-up/email', {
		data: { name: 'Weak Direct', email: uniqueEmail(), password: 'longenough1' },
		headers: { origin: new URL(process.env.BASE_URL ?? 'http://localhost:5173').origin }
	});
	expect(response.status()).toBe(400);
	expect((await response.json()).code).toBe('PASSWORD_TOO_WEAK');
});

test('sign up with an email that already has an account is rejected', async ({ page, request }) => {
	const email = uniqueEmail();
	await signUp(page, email);
	await signOut(page);

	await open(page, '/signup');
	await page.getByLabel('Name').fill('Someone Else');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();

	if (await emailVerificationOn(request)) {
		await expect(page).toHaveURL(/\/verify-email\?email=/);
		await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
	} else {
		await expect(page.getByText('An account with this email already exists.')).toBeVisible();
		await expect(page).toHaveURL(/\/signup/);
	}
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

test('a failed provider sign-in shows a plain explanation, not a code', async ({ page }) => {
	await open(page, '/auth-error?error=account_not_linked');
	await expect(
		page.getByRole('heading', { name: 'Sign in with your password first' })
	).toBeVisible();
	await expect(page.getByText('account_not_linked')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
		'href',
		'/login'
	);

	await open(page, '/auth-error?error=whatever_new');
	await expect(page.getByRole('heading', { name: "Sign-in didn't work" })).toBeVisible();
});

test('the sign-in library never shows its own error page', async ({ page }) => {
	await open(page, '/api/auth/error?error=state_not_found');
	await expect(page).toHaveURL(/\/auth-error\?error=state_not_found$/);
	await expect(page.getByRole('heading', { name: 'That sign-in link expired' })).toBeVisible();
	await expect(page.getByText(/CODE:/)).toHaveCount(0);
});
