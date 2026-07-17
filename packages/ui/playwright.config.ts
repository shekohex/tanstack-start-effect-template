import { defineConfig } from '@playwright/test'

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  fullyParallel: true,
  outputDir: 'test-results/visual',
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  snapshotPathTemplate: '{testDir}/../visual-baselines/{arg}{ext}',
  testDir: './visual',
  use: {
    baseURL: 'http://127.0.0.1:6010',
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  webServer: {
    command: 'pnpm exec storybook dev -p 6010 --ci',
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 120_000,
    url: 'http://127.0.0.1:6010',
  },
})
