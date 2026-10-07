import type { Page } from '@playwright/test';

export async function open(page: Page, url: string) {
	const response = await page.goto(url);
	await page.locator('html[data-hydrated]').waitFor();
	return response;
}
