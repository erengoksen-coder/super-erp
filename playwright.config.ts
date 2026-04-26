import path from 'path'
import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const useAuth = !!process.env.PLAYWRIGHT_TEST_USER
const authFile = path.join(process.cwd(), 'e2e', '.auth', 'user.json')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !useAuth,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : useAuth ? 1 : 0,
  workers: process.env.CI ? 1 : useAuth ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium-unauth',
      testMatch: /smoke-unauth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: useAuth ? authFile : undefined,
        launchOptions: process.env.PLAYWRIGHT_SLOW_MO
          ? { slowMo: Number(process.env.PLAYWRIGHT_SLOW_MO) || 800 }
          : undefined,
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /smoke-unauth\.spec\.ts/, /smoke\.spec\.ts/],
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'npm run build && npm run start',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 300_000,
      }
    : undefined,
})
