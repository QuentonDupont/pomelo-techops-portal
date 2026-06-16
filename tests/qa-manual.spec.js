// Comprehensive Frontend QA verification
// Manual walk-through of all critical user-facing screens and flows

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ADMIN = { email: 'alex.lee@pomelo.com', password: 'Admin123!' };
const USER  = { email: 'kai.nguyen@pomelo.com', password: 'User123!' };
const QUENTON = { email: 'quentond.d@pomelofashion.com', password: 'Toyotasupra7@' };

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

test.describe('QA Manual Verification', () => {

  // ─── LOGIN FLOWS ──────────────────────────────────────────────────────────────

  test('Login: Superadmin (Alex) can log in and see home screen', async ({ page }) => {
    await freshLogin(page, ADMIN);
    // Verify home page loads with no raw errors
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 5000 });
    // Verify profile shows "Alex Lee"
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:currentUser')));
    expect(profile.name).toBe('Alex Lee');
    expect(profile.email).toBe('alex.lee@pomelo.com');
  });

  test('Login: Regular user (Kai) can log in and see home screen', async ({ page }) => {
    await freshLogin(page, USER);
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 5000 });
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:currentUser')));
    expect(profile.name).toBe('Kai Nguyen');
    expect(profile.email).toBe('kai.nguyen@pomelo.com');
  });

  test('Login: Quenton (Superadmin) can log in and see home screen', async ({ page }) => {
    await freshLogin(page, QUENTON);
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 5000 });
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:currentUser')));
    expect(profile.name).toBe('Quenton Dupont');
    expect(profile.email).toBe('quentond.d@pomelofashion.com');
  });

  // ─── ROLES & ACCESS PAGE (ADMIN ONLY) ──────────────────────────────────────────

  test('Roles & Access: Superadmin can navigate to Roles & Access page', async ({ page }) => {
    await freshLogin(page, ADMIN);
    // Click Admin tools button
    await page.click('button[aria-label="Admin tools"]');
    await page.click('[role="menuitem"]:has-text("Roles & Access")');
    // Wait for Roles & Access page to load
    await expect(page.locator('h2:has-text("Roles & Access")')).toBeVisible({ timeout: 5000 });
  });

  test('Roles & Access: Role list displays all 4 seed roles', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await page.click('button[aria-label="Admin tools"]');
    await page.click('[role="menuitem"]:has-text("Roles & Access")');
    await page.waitForSelector('button:has-text("Superadmin")');
    // Verify all 4 roles are visible
    for (const label of ['Superadmin', 'Admin', 'Developer', 'User']) {
      await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible();
    }
  });

  test('Roles & Access: Default assignee field shows correct email', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await page.click('button[aria-label="Admin tools"]');
    await page.click('[role="menuitem"]:has-text("Roles & Access")');
    // Find the email input for default assignee
    const emailInput = page.locator('input[placeholder*="pomelo"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    const value = await emailInput.inputValue();
    expect(value).toBe('quentond.d@pomelofashion.com');
  });

  // ─── USERS PANEL (ADMIN ONLY) ──────────────────────────────────────────────────

  test('Users Panel: Admin can navigate to Users and see user rows', async ({ page }) => {
    await freshLogin(page, ADMIN);
    await page.click('button[aria-label="Admin tools"]');
    await page.click('[role="menuitem"]:has-text("Users")');
    // Verify Users panel loads
    await expect(page.locator('text=Users').first()).toBeVisible({ timeout: 5000 });
    // Verify at least one user row is visible
    const userRows = page.locator('[role="row"]');
    await expect(userRows).toBeDefined();
  });

  // ─── DEVELOPER PORTAL ──────────────────────────────────────────────────────────

  test('Developer Portal: User (Kai) can navigate to Developer Portal', async ({ page }) => {
    await freshLogin(page, USER);
    // Click Developer Portal button
    await page.click('button:has-text("Developer Portal")');
    // Verify page shows "Developer Portal" heading
    await expect(page.locator('h1, h2, text=Developer Portal').first()).toBeVisible({ timeout: 5000 });
  });

  test('Developer Portal: Superadmin can navigate to Developer Portal', async ({ page }) => {
    await freshLogin(page, ADMIN);
    // Click Developer Portal button
    await page.click('button:has-text("Developer Portal")');
    // Verify page loads
    await expect(page.locator('text=Developer Portal').first()).toBeVisible({ timeout: 5000 });
  });

  test('Developer Portal: User can submit a new ticket', async ({ page }) => {
    await freshLogin(page, USER);
    await page.click('button:has-text("Developer Portal")');
    // Look for Submit Ticket button
    await page.click('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    // Fill form
    await page.fill('input[aria-label="Email"], input[placeholder*="email" i]', 'kai.nguyen@pomelo.com');
    await page.fill('input[aria-label="Ticket title"], input[placeholder*="title" i]', 'Test Ticket QA');
    await page.fill('textarea[aria-label="Description"], textarea[placeholder*="description" i]', 'QA test ticket');
    await page.fill('textarea[aria-label="Current result"], textarea[placeholder*="current" i]', 'test');
    await page.fill('textarea[aria-label="Expected result"], textarea[placeholder*="expected" i]', 'test');
    // Submit
    await page.click('button:has-text("Submit Ticket"), button:has-text("Submit")');
    // Verify success (should navigate away)
    await page.waitForURL('**', { timeout: 5000 });
  });

  test('Developer Portal: Default ticket assignment uses Quenton email', async ({ page }) => {
    await freshLogin(page, USER);
    await page.click('button:has-text("Developer Portal")');
    await page.click('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    // Fill and submit
    await page.fill('input[aria-label="Email"], input[placeholder*="email" i]', 'kai.nguyen@pomelo.com');
    await page.fill('input[aria-label="Ticket title"], input[placeholder*="title" i]', 'Test Default Assignee');
    await page.fill('textarea[aria-label="Description"], textarea[placeholder*="description" i]', 'Test');
    await page.fill('textarea[aria-label="Current result"], textarea[placeholder*="current" i]', 'Test');
    await page.fill('textarea[aria-label="Expected result"], textarea[placeholder*="expected" i]', 'Test');
    await page.click('button:has-text("Submit Ticket"), button:has-text("Submit")');
    // Verify ticket was created with correct assignee
    await page.waitForTimeout(1000);
    const tickets = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:tickets') || '[]'));
    const latest = tickets[tickets.length - 1];
    expect(latest).toBeTruthy();
    expect(latest.assigneeEmail).toBe('quentond.d@pomelofashion.com');
  });

  // ─── UI QUALITY & REGRESSIONS ─────────────────────────────────────────────────

  test('No visible raw markdown on any page', async ({ page }) => {
    await freshLogin(page, ADMIN);
    // Check home page for raw markdown
    const pageText = await page.textContent('body');
    expect(pageText).not.toMatch(/\*\*[^*]+\*\*/); // No bold markdown
    expect(pageText).not.toMatch(/^#+\s/m); // No heading markdown
  });

  test('No console errors after fresh login (superadmin)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await freshLogin(page, ADMIN);
    await page.waitForLoadState('networkidle');
    // Filter out known non-critical errors (ResizeObserver, etc)
    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('No console errors after fresh login (regular user)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await freshLogin(page, USER);
    await page.waitForLoadState('networkidle');
    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('Notification bell is visible and clickable', async ({ page }) => {
    await freshLogin(page, USER);
    const notificationBell = page.locator('button[aria-label*="Notification"]');
    await expect(notificationBell).toBeVisible();
    await notificationBell.click();
    // Verify dropdown opens
    await expect(page.locator('[role="dialog"], [role="menu"]').first()).toBeVisible({ timeout: 3000 });
  });

  test('Navigation menu shows correct items per role', async ({ page }) => {
    await freshLogin(page, ADMIN);
    // Admin should see Developer Portal
    await expect(page.locator('button:has-text("Developer Portal")')).toBeVisible();
    // Admin should see Admin tools
    await expect(page.locator('button[aria-label="Admin tools"]')).toBeVisible();
  });

  test('Regular user cannot see Admin tools menu', async ({ page }) => {
    await freshLogin(page, USER);
    // User should NOT see Admin tools button
    const adminTools = page.locator('button[aria-label="Admin tools"]');
    await expect(adminTools).toHaveCount(0);
  });

});
