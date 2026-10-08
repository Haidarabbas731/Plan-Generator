import { expect, test } from '@playwright/test';
import { createFakePlan, open, signUp } from './helpers.js';

test.skip(process.env.AI_FAKE !== '1', 'needs the dev server to run with AI_FAKE=1');

test('a plan is written and is still there after a reload', async ({ page }) => {
	await createFakePlan(page);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Fake plan');
	await expect(page.getByText('0 of 6 days done')).toBeVisible();

	await page.reload();
	await page.locator('html[data-hydrated]').waitFor();
	await expect(page.getByText('Day 6 · Lesson 6')).toBeAttached();
	await expect(page.getByText('0 of 6 days done')).toBeVisible();
});

test('ticking a day updates progress and survives a reload', async ({ page }) => {
	await createFakePlan(page);
	const today = page.getByRole('checkbox', { name: 'Mark today done: Day 1, Lesson 1' });
	const saved = page.waitForResponse((r) => r.url().includes('?/toggle') && r.ok());
	await today.click();
	await expect(page.getByText('1 of 6 days done')).toBeVisible();
	await saved;

	await page.reload();
	await page.locator('html[data-hydrated]').waitFor();
	await expect(page.getByText('1 of 6 days done')).toBeVisible();
	await expect(
		page.getByRole('checkbox', { name: 'Mark today done: Day 1, Lesson 1' })
	).toBeChecked();

	await page.getByRole('checkbox', { name: 'Mark today done: Day 1, Lesson 1' }).click();
	await expect(page.getByText('0 of 6 days done')).toBeVisible();
});

test('a day can be ticked and unticked with the keyboard alone', async ({ page }) => {
	await createFakePlan(page);
	const today = page.getByRole('checkbox', { name: 'Mark today done: Day 1, Lesson 1' });
	await today.focus();
	await expect(today).toBeFocused();
	await page.keyboard.press('Space');
	await expect(page.getByText('1 of 6 days done')).toBeVisible();
	await expect(today).toBeChecked();
	await page.keyboard.press('Space');
	await expect(page.getByText('0 of 6 days done')).toBeVisible();
});

test('a plan can be exported as Markdown and as a calendar', async ({ page }) => {
	await createFakePlan(page);
	const base = page.url();

	const markdown = await page.request.get(`${base}/export/markdown`);
	expect(markdown.status()).toBe(200);
	expect(markdown.headers()['content-type']).toContain('text/markdown');
	expect(markdown.headers()['content-disposition']).toMatch(/filename="fake-plan[^"]*\.md"/);
	const text = await markdown.text();
	expect(text).toContain('# Fake plan');
	expect(text).toContain('Lesson 6');

	const calendar = await page.request.get(`${base}/export/ics`);
	expect(calendar.status()).toBe(200);
	expect(calendar.headers()['content-type']).toContain('text/calendar');
	const ics = await calendar.text();
	expect(ics).toContain('BEGIN:VCALENDAR');
	expect(ics.match(/UID:plan-[^\r\n]*-day-/g)).toHaveLength(6);
	expect(ics.match(/UID:plan-[^\r\n]*-milestone@/g)).toHaveLength(2);
});

test('another account cannot open or export the plan', async ({ page, browser }) => {
	await createFakePlan(page);
	const url = page.url();

	const stranger = await (await browser.newContext()).newPage();
	await signUp(stranger);
	for (const path of ['', '/export/markdown', '/export/ics']) {
		const response = await stranger.request.get(`${url}${path}`, { maxRedirects: 0 });
		expect(response.status()).toBe(404);
	}
	await stranger.context().close();
});

test('deleting a plan removes it from the list', async ({ page }) => {
	await createFakePlan(page);
	await open(page, '/plans');
	await page.getByRole('button', { name: /^Actions for Fake plan/ }).click();
	await page.getByRole('menuitem', { name: 'Delete plan' }).click();
	const dialog = page.getByRole('alertdialog');
	await dialog.getByRole('button', { name: 'Delete plan' }).click();
	await expect(page.getByText('No plans yet')).toBeVisible();
});
