// e2e/specs/cooking-celebration.spec.ts
// ROADMAP 4.0 E6 — Kitchen → saved recipe → Cook now → Kitchen mode →
// final step → chef-kiss + nutrition reveal; persists to meal history;
// taste rating prompt appears; 5★ rating updates affinity.

import { test, expect } from '@playwright/test';

async function loginAsTestUser(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(process.env.E2E_TEST_USER_EMAIL ?? 'cooking@sazon.test');
  await page.getByTestId('login-password-input').fill(process.env.E2E_TEST_USER_PASSWORD ?? 'Password123!');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('today-screen')).toBeVisible({ timeout: 10_000 });
}

test.describe('Cooking celebration (E6)', () => {
  test('saved recipe → cook → final step → chef-kiss + nutrition + 5★', async ({ page }) => {
    await loginAsTestUser(page);

    // Kitchen tab → saved row.
    await page.getByTestId('tab-kitchen').click();
    await expect(page.getByTestId('kitchen-saved-row')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('kitchen-saved-row').click();

    // Pick the first saved recipe.
    const firstSaved = page.getByTestId('saved-recipe-card').first();
    await expect(firstSaved).toBeVisible({ timeout: 5_000 });
    await firstSaved.click();

    // Cook now.
    await page.getByTestId('recipe-cook-now-btn').click();
    await expect(page.getByTestId('kitchen-mode')).toBeVisible({ timeout: 5_000 });

    // Walk through every step.
    let step = 0;
    while (step < 50 /* sanity cap */) {
      const next = page.getByTestId('kitchen-mode-next-step');
      const finish = page.getByTestId('kitchen-mode-finish');
      if (await finish.isVisible().catch(() => false)) {
        await finish.click();
        break;
      }
      await next.click();
      step += 1;
    }
    expect(step).toBeLessThan(50);

    // Chef-kiss + nutrition reveal.
    await expect(page.getByTestId('cooking-celebration-chef-kiss')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('cooking-celebration-nutrition-reveal')).toBeVisible({ timeout: 5_000 });

    // Taste rating prompt.
    await expect(page.getByTestId('taste-rating-prompt')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('taste-rating-5').click();
    await expect(page.getByTestId('taste-rating-confirmed')).toBeVisible({ timeout: 5_000 });

    // Persists to meal history.
    await page.getByTestId('cooking-celebration-close').click();
    await page.getByTestId('tab-kitchen').click();
    await page.getByTestId('kitchen-journey-row').click();
    await expect(page.getByTestId('journey-recently-cooked').first()).toBeVisible({ timeout: 5_000 });

    // Affinity moves on 5★ — open Sazon (Coach) seeded with that recipe and
    // confirm a hint references the recipe.
    await page.getByTestId('tab-sazon').click();
    await expect(page.getByTestId('sazon-hint-recent-5star')).toBeVisible({ timeout: 5_000 });
  });
});
