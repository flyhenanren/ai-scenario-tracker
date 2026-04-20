import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,  // 串行执行避免 scene_code 冲突
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'rm -f ../data/scenarios.db && python3 -m uvicorn backend.main:app --port 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    cwd: '../',
  },
  retries: 1,
});
