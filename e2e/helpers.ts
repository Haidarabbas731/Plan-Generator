import { expect, type Page } from '@playwright/test';
import { verifyWithEmailedCode } from './email.js';

export const PASSWORD = 'Correct-horse-battery-9!';

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
	await page.waitForURL(/\/(settings\/keys\?welcome=1|verify-email\?)/);
	if (page.url().includes('/verify-email')) await verifyWithEmailedCode(page, email);
	await expect(page).toHaveURL(/\/settings\/keys\?welcome=1$/);
	return email;
}

export async function createFakePlan(page: Page) {
	await signUp(page);
	await open(page, '/plans/new');
	await page.getByLabel('What do you want to learn?').fill('Learn to cook risotto');
	await page.getByLabel('Study sessions').fill('6');
	await page.getByLabel('Days per block').fill('3');
	await page.getByRole('button', { name: 'Model', exact: true }).click();
	await page.getByRole('option', { name: 'Fake model' }).click();
	await page.getByRole('button', { name: 'Generate plan' }).click();
	await expect(page).toHaveURL(/\/plans\/[0-9a-f-]{36}$/);
	await expect(page.getByText('Day 6 · Lesson 6')).toBeAttached({ timeout: 30_000 });
}
