import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs', timeout: 60000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3000', channel: 'chrome', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3000', url: 'http://127.0.0.1:3000', reuseExistingServer: true, timeout: 120000 },
})
