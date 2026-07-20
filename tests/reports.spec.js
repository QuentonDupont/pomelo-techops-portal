// tests/reports.spec.js
// Phase 9 (ITSM expansion) — KPI dashboard. Requires dev servers + Postgres
// and the seeded superadmin; data accumulated by earlier phase specs exists.

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('Reports', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  test('dashboard renders tiles, trend, SLA, volume, CSAT, and change charts', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('nav >> button:has-text("Submit Ticket")')).toBeVisible({ timeout: 10_000 });

    // Dismiss a possible CSAT prompt left pending by other specs.
    const dialog = page.locator('[role="dialog"][aria-label="Rate your support experience"]');
    if (await dialog.isVisible().catch(() => false)) {
      await page.click('button[aria-label="Dismiss survey"]');
    }

    await page.click('button[aria-label="Admin tools"]');
    await page.click('[role="menuitem"]:has-text("Reports")');
    await expect(page.locator('text=Service desk KPIs')).toBeVisible();

    // Headline tiles + each chart card.
    await expect(page.locator('text=SLA compliance').first()).toBeVisible();
    await expect(page.locator('text=Created vs resolved')).toBeVisible();
    await expect(page.locator('svg[aria-label*="Trend chart"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=SLA compliance by priority')).toBeVisible();
    await expect(page.locator('text=Customer satisfaction')).toBeVisible();
    await expect(page.locator('text=Change success')).toBeVisible();
    // Volume grouping switch works.
    await page.selectOption('select[aria-label="Group volume by"]', 'priority');
    await expect(page.locator('div[aria-label^="Bar chart"]').first()).toBeVisible();
  });
});
