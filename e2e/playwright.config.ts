// e2e/playwright.config.ts
// ROADMAP 4.0 E6 — Playwright config for the 3 launch-blocker E2E specs.
//
// Targets Expo's web build for cross-platform coverage (Playwright doesn't
// drive iOS/Android natively; Maestro/Detox would, but the launch-blocker
// flow is reachable through the web bundle for verification of the
// behavioral contracts: cold start, paywall, cooking celebration).
//
// On failure: artifacts (screenshots, video, trace) get uploaded for triage.

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // Auth state isn't isolated between specs in v1.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'expo-web-mobile-iphone',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'expo-web-mobile-android',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'cd ../frontend && npx expo start --web --port 8081',
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
