import { expect, test } from '@playwright/test';
import { open } from './helpers.js';

test('landing page shows the headline, example plan and sign up links', async ({ page }) => {
	await open(page, '/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Turn any goal into a plan for every single day'
	);
	await expect(page.getByLabel('Example plan')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Create my first plan' }).first()).toHaveAttribute(
		'href',
		'/signup'
	);
	await expect(page.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/signup');
});

test('the example plan on the landing page can be ticked and reset', async ({ page }) => {
	await open(page, '/');
	const card = page.getByLabel('Example plan');
	await expect(card.getByText('7 of 30 days done')).toBeVisible();
	await card.getByRole('checkbox', { name: 'Mark Day 8 done in the example' }).click();
	await expect(card.getByText('8 of 30 days done')).toBeVisible();
	await card.getByRole('button', { name: 'Reset example' }).click();
	await expect(card.getByText('7 of 30 days done')).toBeVisible();
});

test('the landing FAQ opens by keyboard and is also published as FAQ data', async ({ page }) => {
	await open(page, '/');
	const question = page.getByRole('button', { name: 'Do I need my own AI key?' });
	await question.focus();
	await page.keyboard.press('Enter');
	await expect(question).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText('You add it once in Settings.')).toBeVisible();

	const data = await page
		.locator('script[type="application/ld+json"]')
		.evaluate((node) => JSON.parse(node.textContent ?? '{}'));
	expect(data['@type']).toBe('FAQPage');
	expect(data.mainEntity).toHaveLength(8);
});

test('the landing anchors move to their sections and update the address', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('link', { name: 'See how it works' }).click();
	await expect(page).toHaveURL(/#how-it-works$/);
	await expect(page.getByRole('heading', { name: 'How it works', level: 2 })).toBeInViewport();
	await page
		.getByRole('navigation', { name: 'Product' })
		.getByRole('link', { name: 'FAQ' })
		.click();
	await expect(page).toHaveURL(/#faq$/);
	await expect(page.getByRole('heading', { name: 'Questions', level: 2 })).toBeInViewport();
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
