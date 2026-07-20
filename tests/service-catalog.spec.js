// tests/service-catalog.spec.js
// Phase 1 (ITSM expansion) — service catalog end-to-end against the DB-backed
// backend. Requires the BFF + Postgres running (npm run dev:all) and the
// seeded superadmin from .env.local (SEED_SUPERADMIN_EMAIL/PASSWORD).

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('Service catalog', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  async function login(page) {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Submit')).toBeVisible({ timeout: 10_000 });
  }

  test('catalog grid renders on the submit page and files a typed request', async ({ page }) => {
    await login(page);
    await page.goto('/#submit');

    // Starter types from seed.js grouped by category.
    await expect(page.locator('text=What do you need help with?')).toBeVisible();
    await expect(page.locator('button:has-text("Hardware request")')).toBeVisible();
    await expect(page.locator('button:has-text("Something else")')).toBeVisible();

    // Open the access-request form and exercise validation.
    await page.click('button:has-text("Access request")');
    await expect(page.locator('text=System or application')).toBeVisible();
    await page.click('button:has-text("Submit request")');
    await expect(page.locator('text=Required').first()).toBeVisible();

    // Fill and submit.
    await page.fill('input[placeholder*="Short summary" i]', 'E2E: Looker access');
    const textInputs = page.locator('.pomelo-app input[type="text"], input:not([type])');
    await page
      .locator('label:has-text("System or application")')
      .locator('xpath=following-sibling::input[1]')
      .fill('Looker Studio');
    await page.selectOption('select', 'Read-only');
    await page
      .locator('label:has-text("Why do you need access?")')
      .locator('xpath=following-sibling::textarea[1]')
      .fill('Playwright end-to-end verification.');
    await page.click('button:has-text("Submit request")');

    await expect(page.locator('text=Request submitted')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=/TKT-\\d{4}-\\d+/')).toBeVisible();
  });

  test('catalog admin page lists request types', async ({ page }) => {
    await login(page);
    // Navigate via the Admin tools dropdown — a hard deep-link reload races
    // the roles fetch and SECTION_CAPS bounces to home before can() hydrates.
    await page.click('button[aria-label="Admin tools"]');
    await page.click('[role="menuitem"]:has-text("Service Catalog")');
    await expect(page.locator('text=Define the request types')).toBeVisible();
    await expect(page.locator('td:has-text("Access request")')).toBeVisible();
    await expect(page.locator('button:has-text("New request type")')).toBeVisible();
  });
});
