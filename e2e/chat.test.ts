import { expect, test, type Page } from '@playwright/test';
import { open, signUp } from './helpers.js';

test.skip(process.env.AI_FAKE !== '1', 'needs the dev server to run with AI_FAKE=1');

async function createPlan(page: Page) {
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

async function openChat(page: Page) {
	await page.getByRole('button', { name: 'Ask' }).click();
	const chat = page.getByRole('region', { name: 'Chat about this plan' });
	await expect(chat).toBeVisible();
	await expect(chat.getByRole('textbox', { name: 'Message' })).toBeEnabled();
	return chat;
}

test('a question gets an answer in the chat', async ({ page }) => {
	await createPlan(page);
	const chat = await openChat(page);
	await chat.getByRole('textbox', { name: 'Message' }).fill('How long is each session?');
	await chat.getByRole('button', { name: 'Send' }).click();
	await expect(chat.getByText('Fake answer: How long is each session?')).toBeVisible();
});

test('Enter sends and Shift+Enter adds a new line', async ({ page }) => {
	await createPlan(page);
	const chat = await openChat(page);
	const box = chat.getByRole('textbox', { name: 'Message' });
	await box.fill('first line');
	await page.keyboard.press('Shift+Enter');
	await page.keyboard.type('second line');
	await expect(box).toHaveValue('first line\nsecond line');
	await page.keyboard.press('Enter');
	await expect(box).toHaveValue('');
	await expect(chat.getByText('Fake answer:')).toBeVisible();
});

test('a chat edit can be undone', async ({ page }) => {
	await createPlan(page);
	const chat = await openChat(page);
	await chat.getByRole('textbox', { name: 'Message' }).fill('Make block 1 easier');
	await chat.getByRole('button', { name: 'Send' }).click();
	await expect(chat.getByText('Done. The plan has been updated.')).toBeVisible({
		timeout: 30_000
	});
	await expect(page.getByText('Revised: Make block 1 easier').first()).toBeVisible();

	await chat.getByRole('button', { name: 'Undo' }).click();
	await expect(page.getByText('Revised: Make block 1 easier')).toHaveCount(0);
});

test('the chat works with the keyboard alone', async ({ page }) => {
	await createPlan(page);
	await page.getByRole('button', { name: 'Ask' }).focus();
	await page.keyboard.press('Enter');
	const chat = page.getByRole('region', { name: 'Chat about this plan' });
	await expect(chat).toBeVisible();
	const box = chat.getByRole('textbox', { name: 'Message' });
	await expect(box).toBeEnabled();
	await box.focus();
	await page.keyboard.type('Show me block 1');
	await page.keyboard.press('Enter');
	await expect(chat.getByText('Done. The plan has been updated.')).toBeVisible({
		timeout: 30_000
	});
});

test('the chat opens as a sheet on a phone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await createPlan(page);
	await page.getByRole('button', { name: 'Ask' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByRole('textbox', { name: 'Message' }).fill('hello there');
	await dialog.getByRole('button', { name: 'Send' }).click();
	await expect(dialog.getByText('Fake answer: hello there')).toBeVisible();
});
