// tests/problems.spec.js
// Phase 6 (ITSM expansion) — problem management UI. Requires dev servers +
// Postgres and the seeded superadmin; Phase 6 verification data (PRB known
// error linked to the checkout incident) exists.

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('Problems', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  test('problems list shows known-error badge and detail shows root cause + linked incident', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Submit')).toBeVisible({ timeout: 10_000 });

    await page.click('button[aria-label="Operations"]');
    await page.click('[role="menuitem"]:has-text("Problems")');
    await expect(page.locator('text=Root causes behind recurring incidents')).toBeVisible();
    const row = page.locator('button:has-text("Root cause: Checkout API")').first();
    await expect(row).toBeVisible();
    await expect(page.locator('span:has-text("Known error")').first()).toBeVisible();

    await row.click();
    await expect(page.locator('textarea').nth(1)).toHaveValue(/unmigrated schema change/);
    await expect(page.locator('b:has-text("TKT-2026-")').first()).toBeVisible(); // linked incident
  });
});
