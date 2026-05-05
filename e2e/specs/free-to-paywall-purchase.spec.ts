// e2e/specs/free-to-paywall-purchase.spec.ts
// ROADMAP 4.0 E6 — Free user hits Build-a-Plate daily limit → paywall opens;
// purchase succeeds → premium unlocks within 5s; Restore Purchases works;
// cancellation reflected in 1 polling interval.

import { test, expect } from '@playwright/test';

const FREE_DAILY_PLATE_LIMIT = 3;

async function loginAsFreeUser(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(process.env.E2E_FREE_USER_EMAIL ?? 'free@sazon.test');
  await page.getByTestId('login-password-input').fill(process.env.E2E_FREE_USER_PASSWORD ?? 'Password123!');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('today-screen')).toBeVisible({ timeout: 10_000 });
}

test.describe('Free → paywall → purchase (E6)', () => {
  test('hits the daily limit, sees paywall, completes purchase, premium unlocks', async ({ page }) => {
    await loginAsFreeUser(page);

    // Trigger Build-a-Plate generation up to the free limit + 1.
    await page.getByTestId('tab-week').click();
    await expect(page.getByTestId('build-a-plate-cta')).toBeVisible({ timeout: 5_000 });

    for (let i = 0; i < FREE_DAILY_PLATE_LIMIT; i += 1) {
      await page.getByTestId('build-a-plate-cta').click();
      await expect(page.getByTestId('build-a-plate-result')).toBeVisible({ timeout: 8_000 });
      await page.getByTestId('build-a-plate-back').click();
    }

    // The (LIMIT+1)-th attempt should open the paywall.
    await page.getByTestId('build-a-plate-cta').click();
    await expect(page.getByTestId('paywall-modal')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('paywall-cta-annual')).toContainText(/\$60/);

    // Drive the purchase. Web build can use Stripe Checkout test mode;
    // native builds drive StoreKit / Play Billing sandbox via separate
    // platform helpers — out of scope for the web spec.
    await page.getByTestId('paywall-cta-annual').click();
    await page.waitForURL(/checkout\.stripe\.com/);
    await page.locator('input[name="cardNumber"]').fill('4242 4242 4242 4242');
    await page.locator('input[name="cardExpiry"]').fill('12 / 34');
    await page.locator('input[name="cardCvc"]').fill('123');
    await page.locator('input[name="billingName"]').fill('E2E Test');
    await page.getByRole('button', { name: /pay/i }).click();

    // Return to app and confirm premium unlocked.
    await page.waitForURL(/\/(?:tabs|today|week)/, { timeout: 30_000 });
    const t0 = Date.now();
    await expect(page.getByTestId('membership-badge')).toContainText(/Membership/i, { timeout: 5_000 });
    expect(Date.now() - t0).toBeLessThan(5_000);

    // Restore Purchases roundtrip.
    await page.getByTestId('profile-avatar').click();
    await page.getByTestId('profile-sheet-row-account').click();
    await page.getByTestId('account-restore-purchases').click();
    await expect(page.getByTestId('toast-restore-success')).toBeVisible({ timeout: 5_000 });
  });
});
