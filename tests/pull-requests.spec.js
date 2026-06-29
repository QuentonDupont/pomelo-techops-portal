// tests/pull-requests.spec.js
// E2E sign-off for the GitHub development integration on tickets, modelled on
// Jira's "Development" panel:
//   - the dev chip ("symbol") on the ticket row when dev activity is linked
//   - the Development panel in the ticket detail (branches / commits / pull
//     requests + status badge / build health)
//   - the pull-request breakdown popup, its per-PR detail, and the deep-link to
//     the exact PR on GitHub
//   - tickets without dev activity render neither chip nor panel
// Runs non-headless per the QA charter (see playwright.config.js).

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ADMIN = { email: 'alex.lee@pomelo.com', password: 'Admin123!' };

// TKT-2026-0042 — 4 branches, 12 commits, 3 PRs (1 merged / 1 open / 1 draft),
// 1 failing build.
const DEV_TICKET = 'Cannot access Shopify admin panel';
// TKT-2026-0031 — no development activity.
const NO_DEV_TICKET = 'New laptop setup request';

async function freshLogin(page, { email, password }) {
  await page.goto(BASE + '/');
  await page.evaluate(() => {
    sessionStorage.clear();
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pomelo:'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('button[aria-label*="Notification"]', { timeout: 8000 });
}

async function openMyTickets(page) {
  await page.click('button:has-text("My Tickets")');
  await expect(page.locator('text=My Tickets').first()).toBeVisible();
}

test.describe('GitHub development integration', () => {
  test('a ticket with dev activity shows the dev chip on its row', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openMyTickets(page);
    const chip = page.locator('[aria-label="Development: 3 pull requests"]');
    await expect(chip.first()).toBeVisible();
    await expect(chip.first()).toContainText('3');
  });

  test('the ticket detail renders the Jira-style Development panel', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openMyTickets(page);
    await page.locator(`text=${DEV_TICKET}`).first().click();

    await expect(page.locator('text=🧬 Development')).toBeVisible();
    await expect(page.locator('text=4 branches')).toBeVisible();
    await expect(page.locator('text=12 commits')).toBeVisible();

    // The pull-requests line carries the latest PR's status badge
    const prLine = page.locator('button[aria-label="3 pull requests"]');
    await expect(prLine).toBeVisible();
    await expect(prLine).toContainText('OPEN');

    // The build line reflects the failing CI
    const buildLine = page.locator('button[aria-label="Build status"]');
    await expect(buildLine).toBeVisible();
    await expect(buildLine).toContainText('build failing');
  });

  test('the pull-request line opens the breakdown popup and deep-links to GitHub', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openMyTickets(page);
    await page.locator(`text=${DEV_TICKET}`).first().click();
    await page.locator('button[aria-label="3 pull requests"]').click();

    const dialog = page.locator('[role="dialog"][aria-label="Pull requests"]');
    await expect(dialog).toBeVisible();

    // Breakdown: 1 merged, 2 open (1 OPEN + 1 DRAFT), 1 failing CI
    await expect(dialog.locator('[aria-label="Merged: 1"]')).toBeVisible();
    await expect(dialog.locator('[aria-label="Open: 2"]')).toBeVisible();
    await expect(dialog.locator('[aria-label="Failing: 1"]')).toBeVisible();

    // The PR title links straight to the exact PR on GitHub, in a new tab
    const ghLink = dialog.locator('a[aria-label="Open pull request #482 on GitHub"]');
    await expect(ghLink).toBeVisible();
    await expect(ghLink).toHaveAttribute(
      'href',
      'https://github.com/pomelofashion/shopify-admin/pull/482'
    );
    await expect(ghLink).toHaveAttribute('target', '_blank');

    // Expanding the first PR reveals the full detail (branch flow + review state)
    await dialog.locator('button[aria-label="Expand details"]').first().click();
    await expect(dialog.locator('text=fix/sso-callback-403')).toBeVisible();
    await expect(dialog.locator('text=Changes requested')).toBeVisible();

    // Escape closes the popup
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('a ticket with no dev activity renders neither chip nor panel', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openMyTickets(page);
    await page.locator(`text=${NO_DEV_TICKET}`).first().click();
    await expect(page.locator('text=🧬 Development')).toHaveCount(0);
  });
});
