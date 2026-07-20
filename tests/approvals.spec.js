// tests/approvals.spec.js
// Phase 3 (ITSM expansion) — approvals queue end-to-end. Requires dev servers
// + Postgres and the seeded superadmin; the access-request catalog type must
// be approval-gated (the Phase 3 verification leaves it that way).

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('Approvals', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  test('catalog submission lands in the approvals queue and can be approved', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('nav >> button:has-text("Submit Ticket")')).toBeVisible({
      timeout: 10_000,
    });

    // A pending CSAT survey from another spec run would modal over the page
    // and swallow clicks — dismiss if present.
    const csatDialog = page.locator('[role="dialog"][aria-label="Rate your support experience"]');
    if (await csatDialog.isVisible().catch(() => false)) {
      await page.click('button[aria-label="Dismiss survey"]');
    }

    // File an approval-gated access request.
    await page.goto('/#submit');
    await page.click('button:has-text("Access request")');
    const title = `E2E approval ${Date.now().toString(36)}`;
    await page.fill('input[placeholder*="Short summary" i]', title);
    await page
      .locator('label:has-text("System or application")')
      .locator('xpath=following-sibling::input[1]')
      .fill('Metabase');
    await page.selectOption('select', 'Read-only');
    await page
      .locator('label:has-text("Why do you need access?")')
      .locator('xpath=following-sibling::textarea[1]')
      .fill('E2E approval flow.');
    await page.click('button:has-text("Submit request")');
    await expect(page.locator('text=Request submitted')).toBeVisible({ timeout: 10_000 });

    // The pending approval shows in the queue; approve OUR card (older
    // pending approvals from other runs may sit above it).
    await page.click('button:has-text("Approvals")');
    const card = page.locator('[data-testid="approval-card"]').filter({ hasText: title });
    await expect(card).toBeVisible();
    await card.locator('button:has-text("Approve")').click();
    await expect(card).toBeHidden({ timeout: 10_000 });
  });
});
