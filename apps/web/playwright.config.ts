import { defineConfig } from '@playwright/test'

export default defineConfig({
  expect: { timeout: 10_000 },
  fullyParallel: false,
  outputDir: 'test-results/e2e',
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'pnpm --dir ../.. exec vp run dev:services && pnpm --dir ../.. exec vp run db:migrate && pnpm --dir ../.. exec vp run dev',
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 180_000,
    url: 'http://localhost:3000',
  },
  workers: 1,
})
