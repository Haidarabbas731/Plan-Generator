import { expect, test } from '@playwright/test';
import { open } from './helpers.js';

test('landing page shows the headline, example plan and sign up link', async ({ page }) => {
	await open(page, '/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Turn a goal into a day-by-day plan'
	);
	await expect(page.getByLabel('Example plan')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/signup');
});

test('theme toggle switches between light and dark', async ({ page }) => {
	await open(page, '/');
	const html = page.locator('html');
	const toggle = page.getByRole('button', { name: 'Toggle light and dark theme' });
	const wasDark = await html.evaluate((el) => el.classList.contains('dark'));
	await toggle.click();
	await expect(html).toHaveClass(wasDark ? /^((?!dark).)*$/ : /dark/);
	await toggle.click();
	await expect(html).toHaveClass(wasDark ? /dark/ : /^((?!dark).)*$/);
});

test('unknown route shows the error page with a way home', async ({ page }) => {
	const response = await open(page, '/does-not-exist');
	expect(response?.status()).toBe(404);
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
	await page.getByRole('link', { name: 'Back to home' }).click();
	await expect(page).toHaveURL('/');
});

test('skip link moves focus to the main content', async ({ page }) => {
	await open(page, '/');
	await page.keyboard.press('Tab');
	const skip = page.getByRole('link', { name: 'Skip to content' });
	await expect(skip).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/#main$/);
});
