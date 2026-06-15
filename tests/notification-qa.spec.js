// QA spec for the Pomelo TechOps Portal notifications feature.
// Nav labels from source: '🏠 Home', '+ Submit Ticket', '📚 Documentation',
//   '🎯 Priority Guide', '📋 SLA & Standards', '🎟️ My Tickets'
// Message input in TicketDetail is an <input> (not textarea), send button is "Send"
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

// Credentials derived from MOCK_USERS in PomeloTechOpsPortal.jsx
const ADMIN    = { email: 'alex.lee@pomelo.com',   password: 'Admin123!' };
const REG_USER = { email: 'kai.nguyen@pomelo.com', password: 'User123!' };

async function login(page, { email, password }) {
  // Clear session + portal-persisted state so each test starts from seed data
  await page.goto(BASE + '/');
  await page.evaluate(() => {
    sessionStorage.clear();
    Object.keys(localStorage)
      .filter(k => k.startsWith('pomelo:'))
      .forEach(k => localStorage.removeItem(k));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for nav to appear (authenticated state — bell is only in nav)
  await page.waitForSelector('button[aria-label*="Notification"]', { timeout: 8000 });
}

// ─── Regular User Tests ───────────────────────────────────────────────────────

test.describe('Notification Bell — Regular User', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, REG_USER);
  });

  test('bell icon visible in nav after login', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await expect(bell).toBeVisible();
  });

  test('unread badge shows 3 for regular user', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await expect(bell).toHaveAttribute('aria-label', /3 unread/i);
    const badge = bell.locator('span');
    await expect(badge).toHaveText('3');
  });

  test('bell dropdown opens on click', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    await expect(page.locator('button:has-text("Mark all read")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear all")')).toBeVisible();
  });

  test('dropdown closes on outside click', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    await expect(page.locator('button:has-text("Mark all read")')).toBeVisible();
    await page.mouse.click(100, 100);
    await page.waitForTimeout(300);
    await expect(page.locator('button:has-text("Mark all read")')).not.toBeVisible();
  });

  test('notification items render title, body, relative time, and type icon', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    // Title
    await expect(page.locator('text=IT Team replied on TKT-2026-0042')).toBeVisible();
    // Body
    await expect(page.locator('text=/Can you confirm which Shopify store/')).toBeVisible();
    // Relative time
    const timeEl = page.locator('text=/ago|Yesterday|Just now/').first();
    await expect(timeEl).toBeVisible();
    // Type icon present (emoji rendered, not raw icon keys)
    const panelContent = await page.locator('button[aria-label*="Notification"]').evaluate(el =>
      el.nextElementSibling?.textContent ?? ''
    );
    expect(panelContent).not.toMatch(/ticket_message|doc_edit|status_change/);
  });

  test('mark all read clears unread badge and unread indicators', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    await page.click('button:has-text("Mark all read")');
    // Badge span should disappear
    await expect(bell.locator('span')).not.toBeVisible();
    // "Mark all read" button should also disappear (no unread left)
    await expect(page.locator('button:has-text("Mark all read")')).not.toBeVisible();
    // The "3 new" count pill should be gone
    await expect(page.locator('text=/\\d+ new/')).not.toBeVisible();
  });

  test('clear all removes all notifications and shows empty state', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    await page.click('button:has-text("Clear all")');
    await expect(page.locator("text=You're all caught up!")).toBeVisible();
    await expect(bell.locator('span')).not.toBeVisible();
    await expect(page.locator('button:has-text("Clear all")')).not.toBeVisible();
  });

  test('clicking item marks it read and closes dropdown', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    // Click ticket notification item
    const firstItem = page.locator('button').filter({ hasText: 'IT Team replied on TKT-2026-0042' }).first();
    await firstItem.click();
    await page.waitForTimeout(300);
    // Panel closed
    await expect(page.locator('button:has-text("Mark all read")')).not.toBeVisible();
    // Re-open and verify count decreased
    await bell.click();
    const ariaLabel = await bell.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/2 unread/i);
  });

  test('clicking ticket item navigates to mytickets section', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    const ticketItem = page.locator('button').filter({ hasText: 'IT Team replied on TKT-2026-0042' }).first();
    await ticketItem.click();
    await page.waitForTimeout(500);
    // My Tickets page: shows tickets list — look for "My Tickets" nav button being active
    // or for ticket IDs on screen
    await expect(page.locator('text=/TKT-2026-/').first()).toBeVisible({ timeout: 5000 });
  });

  test('clicking doc item navigates to docs section', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    await expect(page.locator('button:has-text("Mark all read")')).toBeVisible();
    const docItem = page.locator('button').filter({ hasText: 'Document updated: New Employee IT Onboarding' }).first();
    await docItem.click();
    await page.waitForTimeout(500);
    // Docs page: shows documentation cards
    await expect(page.locator('text=/VPN Setup Guide|IT Knowledge Base|New Employee/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('sending a ticket message adds a new notification', async ({ page }) => {
    // Navigate to My Tickets via nav (label: '🎟️ My Tickets')
    await page.click('button:has-text("My Tickets")');
    await page.waitForTimeout(500);
    // Click a ticket row to open detail — find one that is NOT Closed
    const ticketRow = page.locator('div').filter({ hasText: /TKT-2026-0042/ }).first();
    await ticketRow.click();
    await page.waitForTimeout(500);
    // Message input is a plain <input> with placeholder "Type a message…"
    const msgInput = page.locator('input[placeholder="Type a message…"]');
    await expect(msgInput).toBeVisible({ timeout: 5000 });
    await msgInput.fill('QA test message from Playwright');
    // Send button
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(400);
    // Bell should now show 4 unread (3 seed + 1 new message)
    const bell = page.locator('button[aria-label*="Notification"]');
    const ariaLabel = await bell.getAttribute('aria-label');
    console.log('Bell aria-label after message send:', ariaLabel);
    expect(ariaLabel).toMatch(/4 unread/i);
    // Open and verify new notification appears — scope to the dropdown panel
    await bell.click();
    // The panel is the div next to the bell button
    const panel = page.locator('div').filter({ has: page.locator('button:has-text("Clear all")') }).first();
    await expect(panel.locator('text=QA test message from Playwright').first()).toBeVisible();
  });
});

// ─── Admin User Tests ─────────────────────────────────────────────────────────

test.describe('Notification Bell — Admin User', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN);
  });

  test('bell icon visible in nav for admin', async ({ page }) => {
    await expect(page.locator('button[aria-label*="Notification"]')).toBeVisible();
  });

  test('unread badge shows 3 for admin', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await expect(bell).toHaveAttribute('aria-label', /3 unread/i);
  });

  test('admin sees their own notification content', async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notification"]');
    await bell.click();
    await expect(page.locator('text=New message on TKT-2026-0042')).toBeVisible();
    await expect(page.locator('text=Document updated: VPN Setup Guide')).toBeVisible();
  });

  test('no raw markdown or stack traces on home page', async ({ page }) => {
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/\*\*[^*]{3,}\*\*/);
    expect(bodyText).not.toMatch(/Error:.*\n\s+at /s);
  });
});

// ─── Visual Regression — Other Pages ─────────────────────────────────────────

test.describe('No regressions on other pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, REG_USER);
  });

  test('bell persists on submit ticket page', async ({ page }) => {
    // Nav label: '+ Submit Ticket'
    await page.click('button:has-text("Submit Ticket")');
    await page.waitForTimeout(500);
    const bell = page.locator('button[aria-label*="Notification"]');
    await expect(bell).toBeVisible();
  });

  test('bell persists on docs page', async ({ page }) => {
    // Documentation now lives under the Resources dropdown
    await page.click('button[aria-label="Resources"]');
    await page.click('[role="menuitem"]:has-text("Documentation")');
    await page.waitForTimeout(500);
    const bell = page.locator('button[aria-label*="Notification"]');
    await expect(bell).toBeVisible();
  });

  test('no console errors on initial page load after fresh login', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    // beforeEach already logged in; just wait and collect any errors
    await page.waitForTimeout(800);
    const filtered = errors.filter(e => !e.includes('ResizeObserver'));
    if (filtered.length > 0) console.log('Console errors:', filtered);
    expect(filtered).toHaveLength(0);
  });
});
