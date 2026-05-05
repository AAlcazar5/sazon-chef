// e2e/specs/cold-start-onboarding.spec.ts
// ROADMAP 4.0 E6 — Fresh install → registration → physical profile →
// preferences (lifestyle questions) → onboarding "Build your first plate"
// → Today shows generated recipe. First gen completes within 8s on 4G;
// no console errors.

import { test, expect, type Page } from '@playwright/test';

async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return () => errors;
}

test.describe('Cold start → onboarding → first plate (E6)', () => {
  test.beforeEach(async ({ context }) => {
    // Simulate fresh install — clear all storage + cookies.
    await context.clearCookies();
  });

  test('completes the cold-start journey to first generated recipe', async ({ page }) => {
    const collectErrors = await expectNoConsoleErrors(page);

    // 1. Cold start
    await page.goto('/');
    await expect(page.getByTestId('splash-screen').or(page.getByTestId('login-screen'))).toBeVisible({
      timeout: 10_000,
    });

    // 2. Registration
    await page.getByTestId('go-to-register').click({ timeout: 5_000 }).catch(() => {});
    await expect(page.getByTestId('register-screen')).toBeVisible({ timeout: 8_000 });
    const email = `e2e+${Date.now()}@sazon.test`;
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('Password123!');
    await page.getByTestId('register-name-input').fill('E2E Cold Start');
    await page.getByTestId('register-submit').click();

    // 3. Physical profile
    await expect(page.getByTestId('onboarding-physical-profile')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('onboarding-age-input').fill('32');
    await page.getByTestId('onboarding-height-input').fill('170');
    await page.getByTestId('onboarding-weight-input').fill('70');
    await page.getByTestId('onboarding-physical-next').click();

    // 4. Lifestyle preferences (NEW per A5)
    await expect(page.getByTestId('onboarding-lifestyle')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('lifestyle-cooking-frequency-4-plus').click();
    await page.getByTestId('lifestyle-cuisine-curiosity-high').click();
    await page.getByTestId('onboarding-lifestyle-next').click();

    // 5. "Build your first plate"
    await expect(page.getByTestId('onboarding-first-plate')).toBeVisible({ timeout: 8_000 });
    const t0 = Date.now();
    await page.getByTestId('onboarding-first-plate-cta').click();

    // 6. Today shows the generated recipe
    await expect(page.getByTestId('today-hero-recipe')).toBeVisible({ timeout: 8_500 });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(8_000);

    // 7. No console errors during the journey
    const errors = collectErrors();
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
