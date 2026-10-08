import { expect, test, type Page } from '@playwright/test';
import { open, signUp } from './helpers.js';

const WEEKDAY_NAMES = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday'
];

function chip(page: Page, day: string) {
	return page.getByRole('group', { name: 'Study days' }).getByRole('button', { name: day });
}

test('the plan pages require sign-in', async ({ page }) => {
	await open(page, '/plans');
	await expect(page).toHaveURL(/\/login\?redirectTo=%2Fplans$/);
	await open(page, '/plans/new');
	await expect(page).toHaveURL(/\/login\?redirectTo=%2Fplans%2Fnew$/);
});

test('a plan page that does not exist shows not found', async ({ page }) => {
	await signUp(page);
	const response = await open(page, '/plans/00000000-0000-4000-8000-000000000000');
	expect(response?.status()).toBe(404);
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('exports of a plan that does not exist are not found', async ({ page }) => {
	await signUp(page);
	const id = '00000000-0000-4000-8000-000000000000';
	for (const format of ['markdown', 'ics']) {
		const response = await page.request.get(`/plans/${id}/export/${format}`);
		expect(response.status()).toBe(404);
	}
});

test('a new user sees an empty history and can start a plan', async ({ page }) => {
	await signUp(page);
	await open(page, '/plans');
	await expect(page.getByText('No plans yet')).toBeVisible();

	const header = page.locator('header').first();
	await expect(header).not.toHaveAttribute('data-scrolled', '');
	await page.setViewportSize({ width: 390, height: 844 });
	const bar = page.getByRole('navigation', { name: 'Main' });
	await expect(bar.getByRole('link', { name: 'Plans' })).toHaveAttribute('aria-current', 'page');
	await page.getByRole('button', { name: 'Account menu' }).click();
	await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
	await expect(page.getByRole('menuitem', { name: 'Settings' })).toHaveCount(0);
	await page.keyboard.press('Escape');
	await bar.getByRole('link', { name: 'Settings' }).click();
	await expect(page).toHaveURL(/\/settings/);
	await expect(bar.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
	await page.evaluate(() => window.scrollTo(0, 400));
	await expect(header).toHaveAttribute('data-scrolled', '');
	await bar.getByRole('link', { name: 'Plans' }).click();
	await page.setViewportSize({ width: 1280, height: 720 });
	await expect(page).toHaveURL(/\/plans$/);
	await page.getByRole('link', { name: 'New plan' }).click();
	await expect(page).toHaveURL(/\/plans\/new$/);
	await expect(page.getByRole('heading', { name: 'New plan' })).toBeVisible();
});

test('without an AI key the form explains what to do and cannot be submitted', async ({ page }) => {
	await signUp(page);
	await open(page, '/plans/new');
	await expect(page.getByText('Connect your AI key first')).toBeVisible();
	await page.getByLabel('What do you want to learn?').fill('Learn to cook risotto');
	await expect(page.getByRole('button', { name: 'Generate plan' })).toBeDisabled();
	await expect(page.getByRole('link', { name: 'Add a key' })).toHaveAttribute(
		'href',
		'/settings/keys'
	);
});

test('study days start on every day and the presets change them', async ({ page }) => {
	await signUp(page);
	await open(page, '/plans/new');

	for (const day of WEEKDAY_NAMES) {
		await expect(chip(page, day)).toHaveAttribute('data-state', 'on');
	}
	await expect(page.getByRole('button', { name: 'Every day' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	await page.getByRole('button', { name: 'Weekdays only' }).click();
	await expect(chip(page, 'Saturday')).toHaveAttribute('data-state', 'off');
	await expect(chip(page, 'Sunday')).toHaveAttribute('data-state', 'off');
	await expect(chip(page, 'Monday')).toHaveAttribute('data-state', 'on');
	await expect(page.getByRole('button', { name: 'Weekdays only' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	await chip(page, 'Saturday').click();
	await expect(chip(page, 'Saturday')).toHaveAttribute('data-state', 'on');
	await expect(page.getByRole('button', { name: 'Weekdays only' })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
});

test('turning off every study day shows a message', async ({ page }) => {
	await signUp(page);
	await open(page, '/plans/new');
	for (const day of WEEKDAY_NAMES) await chip(page, day).click();
	await expect(page.getByText('Choose at least one day of the week.')).toBeVisible();
});

test('the summary follows the numbers in the form', async ({ page }) => {
	await signUp(page);
	await open(page, '/plans/new');
	const summary = page.getByRole('region', { name: 'Plan summary' });
	await expect(summary).toContainText('30 sessions');
	await expect(summary).toContainText('30 hours in total');
	await expect(summary).toContainText('6 blocks');

	await page.getByLabel('Study sessions').fill('10');
	await page.getByLabel('Hours per session').fill('2');
	await expect(summary).toContainText('10 sessions');
	await expect(summary).toContainText('20 hours in total');
	await expect(summary).toContainText('2 blocks');
});

test('the form works with the keyboard alone', async ({ page }) => {
	await signUp(page);
	await open(page, '/plans/new');
	await page.getByLabel('What do you want to learn?').focus();
	await page.keyboard.type('Learn to play the piano');
	await page.keyboard.press('Tab');
	const beginner = page.getByRole('radio', { name: 'Beginner' });
	await expect(beginner).toBeFocused();
	await page.keyboard.press('Space');
	await expect(beginner).toHaveAttribute('aria-checked', 'true');
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('radio', { name: 'Some experience' })).toBeFocused();
});
