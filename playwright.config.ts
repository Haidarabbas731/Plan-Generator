import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	webServer: {
		command: 'bun run build && bun run preview --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	// Use the Google Chrome installed on this machine, so no Chromium download is needed.
	use: {
		baseURL: 'http://localhost:4173',
		channel: 'chrome',
		// SLOWMO=800 makes each step visible when running headed.
		launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) }
	}
});
