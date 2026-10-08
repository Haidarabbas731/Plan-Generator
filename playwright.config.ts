import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
	testDir: 'e2e',
	workers: 1,
	expect: { timeout: 10_000 },
	webServer: process.env.BASE_URL
		? undefined
		: {
				command: 'bun run dev',
				url: baseURL,
				reuseExistingServer: true
			},
	use: {
		baseURL,
		extraHTTPHeaders: process.env.BASE_URL
			? {
					'x-forwarded-proto': new URL(baseURL).protocol.replace(':', ''),
					'x-forwarded-host': new URL(baseURL).host
				}
			: undefined,
		channel: 'chrome',
		launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) }
	}
});
