import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct-horse-battery';

export async function open(page: Page, url: string) {
	const response = await page.goto(url);
	await page.locator('html[data-hydrated]').waitFor();
	return response;
}

export async function signUp(page: Page, name = 'E2E User') {
	const email = `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
	await open(page, '/signup');
	await page.getByLabel('Name').fill(name);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/settings\/keys\?welcome=1$/);
	return email;
}
