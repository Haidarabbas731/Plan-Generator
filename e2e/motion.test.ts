import { expect, test } from '@playwright/test';
import { open } from './helpers.js';

const animationName = (selector: string) => (page: import('@playwright/test').Page) =>
	page
		.locator(selector)
		.nth(2)
		.evaluate((el) => getComputedStyle(el).animationName);

test('entrances slide and stagger by default', async ({ page }) => {
	await open(page, '/');
	expect(await animationName('.reveal')(page)).toBe('reveal');
	const delay = await page
		.locator('.reveal')
		.nth(2)
		.evaluate((el) => getComputedStyle(el).animationDelay);
	expect(delay).toBe('0.12s');
});

test('with reduced motion entrances only fade and do not wait for a stagger', async ({
	browser
}) => {
	const context = await browser.newContext({ reducedMotion: 'reduce' });
	const page = await context.newPage();
	await open(page, '/');
	expect(await animationName('.reveal')(page)).toBe('fade-in');
	const delay = await page
		.locator('.reveal')
		.nth(2)
		.evaluate((el) => getComputedStyle(el).animationDelay);
	expect(delay).toBe('0s');
	await context.close();
});

test('with reduced motion nothing moves when a dialog-style entrance runs', async ({ browser }) => {
	const context = await browser.newContext({ reducedMotion: 'reduce' });
	const page = await context.newPage();
	await open(page, '/');
	const vars = await page.evaluate(() => {
		const el = document.createElement('div');
		el.className = 'animate-in slide-in-from-right-6 zoom-in-95';
		document.body.append(el);
		const style = getComputedStyle(el);
		const result = [
			style.getPropertyValue('--tw-enter-translate-x'),
			style.getPropertyValue('--tw-enter-scale')
		];
		el.remove();
		return result;
	});
	expect(vars.map((value) => value.trim())).toEqual(['0', '1']);
	await context.close();
});

test('buttons shrink slightly while pressed and ease back', async ({ page }) => {
	await open(page, '/login');
	const button = page.getByRole('button', { name: 'Sign in' });
	const transition = await button.evaluate((el) => {
		const style = getComputedStyle(el);
		return { properties: style.transitionProperty, duration: style.transitionDuration };
	});
	expect(transition.properties).toContain('scale');
	expect(transition.duration).toBe('0.14s');

	const box = (await button.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(300);
	expect(await button.evaluate((el) => getComputedStyle(el).scale)).toBe('0.97');
	await page.mouse.up();
});

test('with reduced motion the press still gives feedback but does not animate', async ({
	browser
}) => {
	const context = await browser.newContext({ reducedMotion: 'reduce' });
	const page = await context.newPage();
	await open(page, '/login');
	const button = page.getByRole('button', { name: 'Sign in' });
	const properties = await button.evaluate((el) => getComputedStyle(el).transitionProperty);
	expect(properties).not.toContain('scale');
	expect(properties).not.toContain('transform');
	const box = (await button.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	expect(await button.evaluate((el) => getComputedStyle(el).scale)).toBe('0.97');
	await page.mouse.up();
	await context.close();
});
