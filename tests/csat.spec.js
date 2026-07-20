// tests/csat.spec.js
// Phase 8 (ITSM expansion) — native CSAT prompt. Requires dev servers +
// Postgres and the seeded superadmin. Self-seeding: creates and resolves a
// ticket through the session (Vite proxies /api), then expects the modal.

import { test, expect } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const EMAIL = process.env.SEED_SUPERADMIN_EMAIL;
const PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD;

test.describe('CSAT', () => {
  test.skip(!EMAIL || !PASSWORD, 'Seeded superadmin credentials not configured');

  test('resolving a ticket prompts the requester with a 5-star survey', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Sign In")');
    // Wait for a post-login element — "Submit" alone also matches marketing
    // copy on the login screen and races the session cookie.
    await expect(page.locator('nav >> button:has-text("Submit Ticket")')).toBeVisible({
      timeout: 10_000,
    });

    // Seed: create + resolve a ticket in-session (cookie rides the fetch).
    const title = `E2E CSAT ${Date.now().toString(36)}`;
    const seeded = await page.evaluate(async t => {
      // Relative URLs ride the Vite dev proxy (same-origin → cookie included).
      const created = await fetch('/api/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, description: 'csat e2e', priority: 'Low' }),
      }).then(r => r.json());
      if (!created.id) return { error: JSON.stringify(created) };
      const patched = await fetch(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Live' }),
      }).then(r => r.json());
      return { key: created.key, status: patched.status };
    }, title);
    expect(seeded.error, seeded.error).toBeUndefined();
    expect(seeded.status).toBe('Live');

    // The prompt polls on auth; reload to trigger the pending-survey fetch.
    await page.reload();
    await expect(page.locator('[role="dialog"][aria-label="Rate your support experience"]')).toBeVisible({
      timeout: 10_000,
    });
    await page.click('button[aria-label="5 stars"]');
    await page.fill('textarea[placeholder*="Anything we could do better"]', 'Great service (E2E).');
    await page.click('button:has-text("Submit rating")');
    await expect(page.locator('[role="dialog"][aria-label="Rate your support experience"]')).toBeHidden({
      timeout: 10_000,
    });
  });
});
