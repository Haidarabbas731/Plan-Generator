import { defineConfig } from '@playwright/test';

const baseURL = 'http://localhost:5173';

export default defineConfig({
	testDir: 'e2e',
	workers: 1,
	expect: { timeout: 10_000 },
	webServer: {
		command: 'bun run dev',
		url: baseURL,
		reuseExistingServer: true
	},
	use: {
		baseURL,
		channel: 'chrome',
		launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) }
	}
});
