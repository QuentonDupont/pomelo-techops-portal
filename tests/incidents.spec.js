// tests/incidents.spec.js
// Phase 5 (ITSM expansion) — incidents view. Requires dev servers + Postgres
// and the seeded superadmin; Phase 5 verification data (SEV1 incident with
// updates + postmortem) exists.

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('Incidents', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  test('incidents list shows severity, expands to comms log and postmortem link', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Submit')).toBeVisible({ timeout: 10_000 });

    await page.click('button[aria-label="Operations"]');
    await page.click('[role="menuitem"]:has-text("Incidents")');
    await expect(page.locator('text=Unplanned interruptions')).toBeVisible();
    const row = page.locator('button:has-text("Checkout API returning 500s")').first();
    await expect(row).toBeVisible();
    await expect(page.locator('span:has-text("SEV1")').first()).toBeVisible();

    // Expand: status updates + postmortem affordance.
    await row.click();
    await expect(page.locator('text=Root cause identified').first()).toBeVisible();
    await expect(page.locator('button:has-text("Open postmortem")')).toBeVisible();
  });
});
