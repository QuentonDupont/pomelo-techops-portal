// tests/doc-studio.spec.js
// E2E sign-off for the Documentation Studio feature (Confluence-style authoring).
// Covers: admin gating, template creation, live preview rendering, the rich
// toolbar + slash menu, save → list, version history + diff, and table of
// contents. Runs non-headless per the QA charter (see playwright.config.js).

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ADMIN = { email: 'alex.lee@pomelo.com', password: 'Admin123!' };
const USER = { email: 'kai.nguyen@pomelo.com', password: 'User123!' };

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

async function openStudio(page) {
  await page.click('button[aria-label="Admin tools"]');
  await page.click('[role="menuitem"]:has-text("Doc Studio")');
  await expect(page.locator('text=📚 Doc Studio')).toBeVisible();
}

const editor = (page) => page.locator('textarea[placeholder^="# Heading"]');

test.describe('Documentation Studio', () => {
  test('admin can open the Studio from Admin tools', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openStudio(page);
    await expect(page.locator('button:has-text("+ New Page")').first()).toBeVisible();
  });

  test('create a page from a template and see it render in the live preview', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openStudio(page);

    await page.click('button:has-text("+ New Page")');
    // Template picker modal
    await expect(page.locator('[role="dialog"][aria-label="Choose a template"]')).toBeVisible();
    await page.click('button:has-text("Runbook")');

    // Editor opens with the runbook scaffold
    await expect(editor(page)).toBeVisible();
    await expect(editor(page)).toHaveValue(/Runbook:/);

    // Title
    await page.fill('input[aria-label="Page title"]', 'QA Signoff Runbook');

    // Switch to Preview and confirm rich rendering (heading + callout panel)
    await page.click('button:has-text("preview")');
    const preview = page.locator('h1:has-text("QA Signoff Runbook")');
    await expect(preview).toBeVisible();
    await expect(page.locator('h2:has-text("Purpose")')).toBeVisible();
    // The :::info callout body renders its text
    await expect(page.locator('text=Last reviewed').first()).toBeVisible();
  });

  test('rich toolbar (bold) and slash menu work', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openStudio(page);
    await page.click('button:has-text("+ New Page")');
    await page.click('button:has-text("Blank Page")');

    const ta = editor(page);
    await ta.click();
    await ta.fill('hello world');
    // Select all then apply Bold from the toolbar
    await ta.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.click('button[title^="Bold"]');
    await expect(ta).toHaveValue(/\*\*hello world\*\*/);

    // Slash menu: type "/" on a new line and expect block options
    await ta.press('End');
    await ta.pressSequentially('\n/');
    await expect(page.locator('button:has-text("Table")')).toBeVisible();
    await expect(page.locator('button:has-text("Code block")')).toBeVisible();
    // Pick Table via keyboard
    await ta.press('Escape');
  });

  test('save persists the page to the list, then versions + diff appear on edit', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openStudio(page);

    // Create + save
    await page.click('button:has-text("+ New Page")');
    await page.click('button:has-text("How-To Guide")');
    await page.fill('input[aria-label="Page title"]', 'QA Signoff HowTo');
    await page.click('button:has-text("Save")');

    // Appears in the sidebar list
    await expect(page.locator('aside button:has-text("QA Signoff HowTo")')).toBeVisible({ timeout: 8000 });

    // Edit + save again → version history records the prior state
    const ta = editor(page);
    await ta.click();
    await ta.press(process.platform === 'darwin' ? 'Meta+End' : 'Control+End');
    await ta.pressSequentially('\n\nAppended during QA signoff.');
    await page.click('button:has-text("Save")');

    // Open History panel and confirm a version with a diff
    await page.click('button:has-text("History")');
    await expect(page.locator('text=Most recent')).toBeVisible({ timeout: 8000 });
    await page.click('button:has-text("Most recent")');
    await expect(page.locator('text=vs current')).toBeVisible();
    await expect(page.locator('button:has-text("Restore")').first()).toBeVisible();
  });

  test('table of contents lists headings', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openStudio(page);
    await page.click('button:has-text("+ New Page")');
    await page.click('button:has-text("Blank Page")');

    const ta = editor(page);
    await ta.click();
    await ta.fill('# Alpha Section\n\ntext\n\n## Beta Section\n\nmore');
    // Outline tab is default; headings should appear in the right panel
    await expect(page.locator('nav[aria-label="Page outline"] button:has-text("Alpha Section")')).toBeVisible();
    await expect(page.locator('nav[aria-label="Page outline"] button:has-text("Beta Section")')).toBeVisible();
  });

  test('non-admin cannot access the Studio (RBAC)', async ({ page }) => {
    await freshLogin(page, USER);
    // Regular users do not see the Admin tools dropdown at all.
    await expect(page.locator('button[aria-label="Admin tools"]')).toHaveCount(0);
  });
});
