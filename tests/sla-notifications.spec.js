// tests/sla-notifications.spec.js
// Phase 2 (ITSM expansion) — SLA policy editor + server notification bell.
// Requires dev servers + Postgres (npm run dev:all) and the seeded superadmin.

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('SLA & notifications', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  async function login(page) {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Submit')).toBeVisible({ timeout: 10_000 });
  }

  test('SLA page shows live policies with edit affordance for admins', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Resources")');
    await page.click('[role="menuitem"]:has-text("SLA")');
    await expect(page.locator('text=Our committed response and resolution times')).toBeVisible();
    // Live policy table (from /api/sla/policies) with admin edit button.
    await expect(page.locator('button:has-text("Edit targets")')).toBeVisible();
    await expect(page.locator('td:has-text("4 hours")').first()).toBeVisible(); // Critical resolution
    // Enter edit mode and cancel — inputs appear and disappear.
    await page.click('button:has-text("Edit targets")');
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('button:has-text("Edit targets")')).toBeVisible();
  });

  test('bell shows server-persisted SLA notifications', async ({ page }) => {
    await login(page);
    // The API-backed feed is fetched on auth; SLA breach rows exist from the
    // engine verification run.
    await page.click('button[aria-label*="Notifications"]');
    await expect(page.locator('text=/SLA breached on TKT-/').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
