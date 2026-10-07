import { expect, test, type Page } from '@playwright/test';
import { open, signUp as signUpUser } from './helpers.js';

const signUp = (page: Page) => signUpUser(page, 'Keys User');

function card(page: Page, name: string) {
	return page.locator('[data-slot="card"]').filter({ hasText: name });
}

test('the keys page requires sign-in', async ({ page }) => {
	await open(page, '/settings/keys');
	await expect(page).toHaveURL(/\/login\?redirectTo=%2Fsettings%2Fkeys$/);
});

test('a new user lands on a welcome prompt with every provider not connected', async ({ page }) => {
	await signUp(page);
	await expect(page.getByText('Connect your AI key to start')).toBeVisible();
	for (const name of ['Google Gemini', 'OpenRouter', 'Anthropic', 'OpenAI']) {
		await expect(card(page, name).getByText('Not connected')).toBeVisible();
		await expect(card(page, name).getByRole('link', { name: /Get a key/ })).toHaveAttribute(
			'target',
			'_blank'
		);
	}
});

test('each key field is named after its provider', async ({ page }) => {
	await signUp(page);
	for (const name of ['Google Gemini', 'OpenRouter', 'Anthropic', 'OpenAI']) {
		await expect(page.getByLabel(`API key for ${name}`)).toBeVisible();
	}
});

test('saving an empty key shows a message and does not save anything', async ({ page }) => {
	await signUp(page);
	const google = card(page, 'Google Gemini');
	await google.getByRole('button', { name: 'Save' }).click();
	await expect(google.getByRole('alert')).toHaveText('Paste your API key.');
	await expect(google.getByText('Not connected')).toBeVisible();
});

test('a key with spaces is rejected before it reaches any provider', async ({ page }) => {
	await signUp(page);
	const openai = card(page, 'OpenAI');
	await openai.getByLabel('API key for OpenAI').fill('two words here');
	await openai.getByRole('button', { name: 'Save' }).click();
	await expect(openai.getByRole('alert')).toContainText('cannot contain spaces');
	await expect(openai.getByText('Not connected')).toBeVisible();
});

test('the key field hides what is typed', async ({ page }) => {
	await signUp(page);
	await expect(page.getByLabel('API key for Anthropic')).toHaveAttribute('type', 'password');
});

test('the plans page prompts a new user to connect a key', async ({ page }) => {
	await signUp(page);
	await open(page, '/plans');
	await expect(page.getByText('Connect your AI key')).toBeVisible();
	await page.getByRole('link', { name: 'Add a key' }).click();
	await expect(page).toHaveURL(/\/settings\/keys$/);
});

test('the settings link in the header opens the keys page', async ({ page }) => {
	await signUp(page);
	await open(page, '/plans');
	await page
		.getByRole('navigation', { name: 'Main' })
		.getByRole('link', { name: 'Settings' })
		.click();
	await expect(page).toHaveURL(/\/settings\/keys$/);
	await expect(page.getByRole('heading', { name: 'AI keys', level: 2 })).toBeVisible();
});
