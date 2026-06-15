// E2E coverage for the RBAC + Developer Portal feature set.
// Mirrors the freshLogin helper from admin-features.spec.js so each test
// boots from clean seed state and the boot-time migration can run.

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ADMIN = { email: 'alex.lee@pomelo.com', password: 'Admin123!' };
const USER  = { email: 'kai.nguyen@pomelo.com', password: 'User123!' };

async function freshLogin(page, { email, password }) {
  await page.goto(BASE + '/');
  await page.evaluate(() => {
    sessionStorage.clear();
    Object.keys(localStorage).filter(k => k.startsWith('pomelo:')).forEach(k => localStorage.removeItem(k));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('button[aria-label*="Notification"]', { timeout: 8000 });
}

async function openAdminTool(page, label) {
  await page.click('button[aria-label="Admin tools"]');
  await page.click(`[role="menuitem"]:has-text("${label}")`);
}

// ─── Migration ────────────────────────────────────────────────────────────────

test.describe('RBAC migration', () => {
  test('Quenton seed user has the pomelofashion.com email', async ({ page }) => {
    await freshLogin(page, ADMIN);
    const users = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:users')));
    const quenton = users.find(u => u.name === 'Quenton Dupont');
    expect(quenton.email).toBe('quentond.d@pomelofashion.com');
    expect(quenton.roleId).toBe('role_superadmin');
  });

  test('seed roles are present and superadmin holds every capability', async ({ page }) => {
    await freshLogin(page, ADMIN);
    const roles = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:roles')));
    const ids = roles.map(r => r.id).sort();
    expect(ids).toEqual(['role_admin', 'role_developer', 'role_superadmin', 'role_user']);
    const sa = roles.find(r => r.id === 'role_superadmin');
    expect(sa.capabilities.length).toBeGreaterThanOrEqual(20);
  });
});

// ─── Per-role nav visibility ──────────────────────────────────────────────────

test.describe('Per-role nav visibility', () => {
  test('superadmin sees Roles & Access and Developer Portal', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await expect(page.locator('button:has-text("Developer Portal")')).toBeVisible();
    await page.click('button[aria-label="Admin tools"]');
    await expect(page.locator('[role="menuitem"]:has-text("Roles & Access")')).toBeVisible();
  });

  test('regular user sees neither Roles & Access nor Developer Portal', async ({ page }) => {
    await freshLogin(page, USER);
    await expect(page.locator('button:has-text("Developer Portal")')).toHaveCount(0);
    await expect(page.locator('button[aria-label="Admin tools"]')).toHaveCount(0);
  });
});

// ─── Roles & Access page ──────────────────────────────────────────────────────

test.describe('Roles & Access page', () => {
  test('shows all seed roles in the left rail', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openAdminTool(page, 'Roles & Access');
    for (const label of ['Superadmin', 'Admin', 'Developer', 'User']) {
      await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible();
    }
  });

  test('default assignee strip is editable for system.settings_edit holders', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openAdminTool(page, 'Roles & Access');
    const emailInput = page.locator('input[placeholder*="pomelofashion"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue('quentond.d@pomelofashion.com');
  });

  test('superadmin capabilities are read-only', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await openAdminTool(page, 'Roles & Access');
    // Superadmin is selected by default (first in registry). Every capability
    // checkbox should be checked and disabled.
    const checkboxes = page.locator('label:has(input[type="checkbox"]) input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(20);
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
      await expect(checkboxes.nth(i)).toBeDisabled();
    }
  });
});

// ─── Default ticket assignment ────────────────────────────────────────────────

test.describe('Default ticket assignment', () => {
  test('a new ticket from a regular user lands assigned to the default admin', async ({ page }) => {
    await freshLogin(page, USER);
    await page.click('button:has-text("Submit Ticket")');
    await page.fill('input[aria-label="Email"]', USER.email);
    await page.fill('input[aria-label="Ticket title"]', 'RBAC default-assignee smoke test');
    await page.fill('textarea[aria-label="Description"]', 'Auto-routed to admin for triage.');
    await page.fill('textarea[aria-label="Current result"]', 'unrouted');
    await page.fill('textarea[aria-label="Expected result"]', 'routed to default admin');
    await page.click('button:has-text("Submit Ticket")');
    // The submit handler navigates to My Tickets on success.
    await page.waitForSelector('text=My Tickets', { timeout: 8000 });
    const tickets = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:tickets') || '[]'));
    const newest = tickets.find(t => t.title === 'RBAC default-assignee smoke test');
    expect(newest).toBeTruthy();
    expect(newest.assigneeEmail).toBe('quentond.d@pomelofashion.com');
  });
});

// ─── Developer Portal ─────────────────────────────────────────────────────────

test.describe('Developer Portal', () => {
  test('superadmin sees the Developer Portal tab and can open it', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await page.click('button:has-text("Developer Portal")');
    await expect(page.locator('text=Developer Portal').first()).toBeVisible();
    await expect(page.locator('text=Tickets assigned to you')).toBeVisible();
  });
});
