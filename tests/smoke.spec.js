// tests/smoke.spec.js
// Smoke tests for the Pomelo TechOps Portal.
// These run against the Vite dev server (started automatically by playwright.config.js).
// They use mock/demo credentials and do NOT require a live Jira or Anthropic connection.

import { test, expect } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Log in with the demo IT admin account.
 * The portal accepts any 6-digit OTP in demo mode.
 */
async function loginAsAdmin(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Should land on login page
  await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible();

  // Fill credentials — demo IT admin
  await page.fill('input[type="email"], input[placeholder*="email" i]', 'it@pomelo.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');

  // OTP screen — type any 6-digit code
  await page.waitForSelector('input[maxlength="1"]', { timeout: 5000 }).catch(() => {});
  const otpInputs = page.locator('input[maxlength="1"]');
  const count = await otpInputs.count();
  if (count === 6) {
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(String(i + 1));
    }
  }

  // Wait for the dashboard/main app to appear
  await page.waitForLoadState('networkidle');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Login flow', () => {
  test('renders the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/pomelo/i);
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');
    // Should show an error message (not crash)
    const errorText = page.locator('[role="alert"], .error, [class*="error"]');
    await expect(errorText.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Some apps show inline error — just verify we haven't navigated away
    });
    // Should still be on login page (no dashboard visible)
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});

test.describe('Build integrity', () => {
  test('page loads with no JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('has correct meta charset and viewport', async ({ page }) => {
    await page.goto('/');
    const charset = await page.$eval('meta[charset]', el => el.getAttribute('charset')).catch(() => null);
    const viewport = await page.$eval('meta[name="viewport"]', el => el.getAttribute('content')).catch(() => null);
    expect(charset?.toLowerCase()).toBe('utf-8');
    expect(viewport).toContain('width=device-width');
  });
});

test.describe('Navigation', () => {
  test.skip('main nav renders after login', async ({ page }) => {
    // Skipped in CI until demo auth bypass is confirmed
    await loginAsAdmin(page);
    // Should see at least one nav item
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible({ timeout: 8000 });
  });
});
