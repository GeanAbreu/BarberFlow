import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(__dirname, '../api/.env') });

export default defineConfig({
  testDir: './e2e', fullyParallel: false, retries: 0, reporter: 'list', timeout: 30000,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node dist/server.js', url: 'http://localhost:4000/health', reuseExistingServer: true, cwd: '../api' },
    { command: 'node ../../node_modules/next/dist/bin/next start -p 3000', url: 'http://localhost:3000/login', reuseExistingServer: true, cwd: '.' }
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
