// tests/assets.spec.js
// Phase 4 (ITSM expansion) — asset registry UI. Requires dev servers +
// Postgres and the seeded superadmin; Phase 4 verification data (AST-0001
// MacBook) exists.

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('Assets', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  test('assets table lists registry with filters and detail drawer', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Submit')).toBeVisible({ timeout: 10_000 });

    await page.click('button[aria-label="Operations"]');
    await page.click('[role="menuitem"]:has-text("Assets")');
    await expect(page.locator('text=who has what')).toBeVisible();
    await expect(page.locator('td:has-text("AST-0001")')).toBeVisible();
    await expect(page.locator('button:has-text("New asset")')).toBeVisible();

    // Detail drawer opens with assignment history.
    await page.click('td:has-text("AST-0001")');
    await expect(page.locator('text=Assignment history')).toBeVisible();
    await expect(page.locator('text=Prim Srisawat').first()).toBeVisible();
    await page.click('button[aria-label="Close drawer"]');

    // Status filter narrows the table.
    await page.click('button:has-text("Retired ·")');
    await expect(page.locator('td:has-text("No assets match.")')).toBeVisible();
  });
});
