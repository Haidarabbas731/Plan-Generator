import { expect, test, type Page } from '@playwright/test';
import { createFakePlan as createPlan } from './helpers.js';

test.skip(process.env.AI_FAKE !== '1', 'needs the dev server to run with AI_FAKE=1');

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

test('chats stay apart: start a new one, switch back and delete', async ({ page }) => {
	await createPlan(page);
	const chat = await openChat(page);
	const box = chat.getByRole('textbox', { name: 'Message' });
	await box.fill('How long is each session?');
	await chat.getByRole('button', { name: 'Send' }).click();
	await expect(chat.getByText('Fake answer: How long is each session?')).toBeVisible();

	await chat.getByRole('button', { name: 'New chat' }).click();
	await expect(chat.getByText('Fake answer: How long is each session?')).toHaveCount(0);
	await box.fill('What is block 2?');
	await chat.getByRole('button', { name: 'Send' }).click();
	await expect(chat.getByText('Fake answer: What is block 2?')).toBeVisible();

	await chat.getByRole('button', { name: /Switch chat/ }).click();
	await page.getByRole('button', { name: /^How long is each session\?/ }).click();
	await expect(chat.getByText('Fake answer: How long is each session?')).toBeVisible();
	await expect(chat.getByText('Fake answer: What is block 2?')).toHaveCount(0);

	await chat.getByRole('button', { name: /Switch chat/ }).click();
	await page.getByRole('button', { name: 'Delete What is block 2?' }).click();
	await page.getByRole('button', { name: 'Confirm delete What is block 2?' }).click();
	await expect(page.getByRole('button', { name: 'Delete What is block 2?' })).toHaveCount(0);
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

test('on a phone the ask bar is docked and the chat grows into a sheet', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await createPlan(page);
	await expect(page.getByRole('button', { name: 'Ask AI' })).toBeHidden();

	const grip = page.getByRole('slider', { name: 'Resize chat' });
	await expect(grip).toHaveAttribute('aria-valuetext', 'Collapsed');
	const chat = page.getByRole('region', { name: 'Chat about this plan' });
	const box = chat.getByRole('textbox', { name: 'Message' });

	await box.click();
	await expect(grip).toHaveAttribute('aria-valuetext', 'Half height');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

	await box.fill('hello there');
	await chat.getByRole('button', { name: 'Send' }).click();
	await expect(chat.getByText('Fake answer: hello there')).toBeVisible();

	await grip.focus();
	await page.keyboard.press('ArrowUp');
	await expect(grip).toHaveAttribute('aria-valuetext', 'Full height');
	await page.keyboard.press('Escape');
	await expect(grip).toHaveAttribute('aria-valuetext', 'Half height');
	await page.keyboard.press('End');
	await expect(grip).toHaveAttribute('aria-valuetext', 'Collapsed');
});

test('Enter adds a new line on a touch screen and only the button sends', async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true
	});
	const page = await context.newPage();
	await createPlan(page);
	const chat = page.getByRole('region', { name: 'Chat about this plan' });
	const box = chat.getByRole('textbox', { name: 'Message' });
	await box.click();
	await box.fill('first line');
	await page.keyboard.press('Enter');
	await page.keyboard.type('second line');
	await expect(box).toHaveValue('first line\nsecond line');
	await expect(chat.getByText('Fake answer:')).toHaveCount(0);
	await context.close();
});
