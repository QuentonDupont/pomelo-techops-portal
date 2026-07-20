// tests/changes.spec.js
// Phase 7 (ITSM expansion) — change management UI. Requires dev servers +
// Postgres and the seeded superadmin; Phase 7 verification data (completed
// CHG with window + emergency hotfix) exists.

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('Changes', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  test('changes list shows type/risk/approval badges and calendar renders windows', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Submit')).toBeVisible({ timeout: 10_000 });

    await page.click('button[aria-label="Operations"]');
    await page.click('[role="menuitem"]:has-text("Changes")');
    await expect(page.locator('text=Planned modifications')).toBeVisible();
    const row = page.locator('button:has-text("Upgrade Postgres to 16.15")').first();
    await expect(row).toBeVisible();
    await expect(page.locator('span:has-text("Successful")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Emergency")').first()).toBeVisible();

    // Detail shows plans + approvals.
    await row.click();
    await expect(page.locator('textarea').first()).toHaveValue(/Rolling upgrade/);
    await expect(page.locator('text=CAB ok')).toBeVisible();
    await page.click('button:has-text("All changes")');

    // Calendar view renders the change window block. The window is today+7d —
    // flip to next month first when that crosses the boundary.
    await page.click('button:has-text("Calendar")');
    const now = new Date();
    const target = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    if (target.getMonth() !== now.getMonth()) {
      await page.click('button[aria-label="Next month"]');
    }
    await expect(page.locator('button[title*="Upgrade Postgres"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
