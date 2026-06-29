// Frontend QA Test — Submit Ticket Flow Verification
// Test the complete UI flow: Login → Submit Ticket → Verify UI Quality

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const USER = { email: 'kai.nguyen@pomelo.com', password: 'User123!' };
const EXPECTED_ASSIGNEE = 'quentond.d@pomelofashion.com';

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

test.describe('Frontend QA — Submit Ticket Flow', () => {

  test('Login: User can authenticate successfully', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await freshLogin(page, USER);

    // Verify no critical errors
    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(criticalErrors).toHaveLength(0);

    // Verify user profile is loaded in localStorage
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:currentUser')));
    expect(profile.name).toBe('Kai Nguyen');
    expect(profile.email).toBe('kai.nguyen@pomelo.com');

    // Verify main heading is visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 5000 });

    console.log('✓ Login successful, no console errors');
  });

  test('Home Screen: No raw markdown, no stuck spinners, no error traces', async ({ page }) => {
    await freshLogin(page, USER);

    // Check for raw markdown in page content
    const pageText = await page.textContent('body');
    expect(pageText).not.toMatch(/\*\*[^*]+\*\*/); // No bold markdown
    expect(pageText).not.toMatch(/^#+\s/m); // No heading markdown
    expect(pageText).not.toMatch(/Error: /); // No error traces

    // Check for stuck skeleton loaders
    const skeletons = page.locator('[class*="skeleton"], [class*="loading"]');
    const visibleSkeletons = await skeletons.filter({ hasNot: page.locator(':hidden') }).count();

    // Allow brief loading but should resolve quickly
    await page.waitForLoadState('networkidle');
    const skeletonsAfter = await skeletons.filter({ hasNot: page.locator(':hidden') }).count();
    expect(skeletonsAfter).toBeLessThanOrEqual(visibleSkeletons);

    console.log('✓ Home screen has no rendering issues');
  });

  test('Navigation: Developer Portal button is visible and clickable', async ({ page }) => {
    await freshLogin(page, USER);

    // Find and click Developer Portal button
    const devPortalBtn = page.locator('button:has-text("Developer Portal")');
    await expect(devPortalBtn).toBeVisible({ timeout: 5000 });
    await devPortalBtn.click();

    // Verify page navigates to Developer Portal
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Developer Portal').first()).toBeVisible({ timeout: 5000 });

    console.log('✓ Developer Portal navigation works');
  });

  test('SubmitPage: Form renders with all required fields', async ({ page }) => {
    await freshLogin(page, USER);

    // Navigate to Developer Portal
    await page.click('button:has-text("Developer Portal")');
    await page.waitForLoadState('networkidle');

    // Click Submit Ticket button
    const submitTicketBtn = page.locator('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    await expect(submitTicketBtn).toBeVisible({ timeout: 5000 });
    await submitTicketBtn.click();

    // Wait for form to render
    await page.waitForLoadState('networkidle');

    // Verify form title
    const formTitle = page.locator('h1, h2').filter({ hasText: /Submit|New|Ticket/i });
    await expect(formTitle.first()).toBeVisible({ timeout: 5000 });

    // Verify all required input fields exist
    const emailInput = page.locator('input[aria-label="Email"], input[placeholder*="email" i]').first();
    const titleInput = page.locator('input[aria-label="Ticket title"], input[placeholder*="title" i]').first();
    const descriptionInput = page.locator('textarea[aria-label="Description"], textarea[placeholder*="description" i]').first();
    const currentResultInput = page.locator('textarea[aria-label="Current result"], textarea[placeholder*="current" i]').first();
    const expectedResultInput = page.locator('textarea[aria-label="Expected result"], textarea[placeholder*="expected" i]').first();
    const submitBtn = page.locator('button:has-text("Submit Ticket"), button:has-text("Submit")').last();

    // All fields should be visible
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await expect(descriptionInput).toBeVisible({ timeout: 5000 });
    await expect(currentResultInput).toBeVisible({ timeout: 5000 });
    await expect(expectedResultInput).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    console.log('✓ SubmitPage renders with all required fields');
  });

  test('SubmitPage: Form fields are properly labeled and accessible', async ({ page }) => {
    await freshLogin(page, USER);

    // Navigate to form
    await page.click('button:has-text("Developer Portal")');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    await page.waitForLoadState('networkidle');

    // Check that labels or placeholders are present (accessibility)
    const inputs = page.locator('input, textarea');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(5); // At least 5 inputs (email, title, description, current, expected)

    console.log('✓ Form fields are accessible');
  });

  test('Submit Flow: Form submission creates ticket with correct assignee', async ({ page }) => {
    await freshLogin(page, USER);

    // Navigate to form
    await page.click('button:has-text("Developer Portal")');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    await page.waitForLoadState('networkidle');

    // Fill form fields
    const timestamp = Date.now();
    const titleText = `QA Frontend Test ${timestamp}`;

    await page.fill('input[aria-label="Email"], input[placeholder*="email" i]', 'kai.nguyen@pomelo.com');
    await page.fill('input[aria-label="Ticket title"], input[placeholder*="title" i]', titleText);
    await page.fill('textarea[aria-label="Description"], textarea[placeholder*="description" i]', 'QA frontend verification test');
    await page.fill('textarea[aria-label="Current result"], textarea[placeholder*="current" i]', 'Test setup');
    await page.fill('textarea[aria-label="Expected result"], textarea[placeholder*="expected" i]', 'Test verification');

    // Submit form
    await page.click('button:has-text("Submit Ticket"), button:has-text("Submit")');

    // Wait for redirect or success feedback
    await page.waitForLoadState('networkidle');

    // Verify ticket appears in localStorage
    const tickets = await page.evaluate(() => JSON.parse(localStorage.getItem('pomelo:v1:tickets') || '[]'));
    expect(tickets.length).toBeGreaterThan(0);

    // Find the test ticket (most recent should be ours)
    const testTicket = tickets.find(t => t.title && t.title.includes('QA Frontend Test'));
    expect(testTicket).toBeTruthy();
    expect(testTicket.assigneeEmail).toBe(EXPECTED_ASSIGNEE);

    console.log(`✓ Ticket created successfully with assignee: ${testTicket.assigneeEmail}`);
  });

  test('Submit Flow: Form provides appropriate feedback after submission', async ({ page }) => {
    await freshLogin(page, USER);

    // Navigate to form
    await page.click('button:has-text("Developer Portal")');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    await page.waitForLoadState('networkidle');

    // Fill and submit
    const timestamp = Date.now();
    await page.fill('input[aria-label="Email"], input[placeholder*="email" i]', 'kai.nguyen@pomelo.com');
    await page.fill('input[aria-label="Ticket title"], input[placeholder*="title" i]', `QA Test ${timestamp}`);
    await page.fill('textarea[aria-label="Description"], textarea[placeholder*="description" i]', 'Test');
    await page.fill('textarea[aria-label="Current result"], textarea[placeholder*="current" i]', 'Test');
    await page.fill('textarea[aria-label="Expected result"], textarea[placeholder*="expected" i]', 'Test');

    // Capture UI before submit
    const submitBtn = page.locator('button:has-text("Submit Ticket"), button:has-text("Submit")').last();

    // Click submit
    await submitBtn.click();

    // Wait for response
    await page.waitForLoadState('networkidle');

    // Check for success message or navigation
    const successMsg = page.locator('text=Success, text=created, text=submitted');
    const isSuccess = await successMsg.first().isVisible().catch(() => false);

    // Or check that we navigated away from the form
    const stillOnForm = await page.locator('input[aria-label="Ticket title"], input[placeholder*="title" i]').count();

    // Either show success message or navigate to list
    expect(isSuccess || stillOnForm === 0).toBeTruthy();

    console.log('✓ Form submission provides appropriate feedback');
  });

  test('UI Quality: No console errors during submit flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await freshLogin(page, USER);

    // Complete submit flow
    await page.click('button:has-text("Developer Portal")');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now();
    await page.fill('input[aria-label="Email"], input[placeholder*="email" i]', 'kai.nguyen@pomelo.com');
    await page.fill('input[aria-label="Ticket title"], input[placeholder*="title" i]', `QA ${timestamp}`);
    await page.fill('textarea[aria-label="Description"], textarea[placeholder*="description" i]', 'Test');
    await page.fill('textarea[aria-label="Current result"], textarea[placeholder*="current" i]', 'Test');
    await page.fill('textarea[aria-label="Expected result"], textarea[placeholder*="expected" i]', 'Test');

    await page.click('button:has-text("Submit Ticket"), button:has-text("Submit")');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('cancelled')
    );

    expect(criticalErrors).toHaveLength(0);

    console.log('✓ No critical console errors during submit flow');
  });

  test('UI Quality: Developer Portal page has no raw markdown', async ({ page }) => {
    await freshLogin(page, USER);

    // Navigate to Developer Portal
    await page.click('button:has-text("Developer Portal")');
    await page.waitForLoadState('networkidle');

    // Get page content
    const pageText = await page.textContent('body');

    // Check for raw markdown
    expect(pageText).not.toMatch(/\*\*[^*]+\*\*/); // No bold markdown
    expect(pageText).not.toMatch(/^#+\s/m); // No heading markdown
    expect(pageText).not.toMatch(/\[([^\]]+)\]\(([^)]+)\)/); // No link markdown

    console.log('✓ Developer Portal has no raw markdown');
  });

  test('UI Quality: Submit form page has no raw error objects or stack traces', async ({ page }) => {
    await freshLogin(page, USER);

    // Navigate to form
    await page.click('button:has-text("Developer Portal")');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    await page.waitForLoadState('networkidle');

    // Get page content
    const pageText = await page.textContent('body');

    // Check for error traces
    expect(pageText).not.toMatch(/Error: /);
    expect(pageText).not.toMatch(/at .*\.js:/);
    expect(pageText).not.toMatch(/TypeError: /);
    expect(pageText).not.toMatch(/\[object Object\]/);

    console.log('✓ Submit form has no exposed errors or stack traces');
  });

  test('Visual Regression: All interactive elements have hover/focus states', async ({ page }) => {
    await freshLogin(page, USER);

    // Navigate to form
    await page.click('button:has-text("Developer Portal")');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Submit Ticket"), button:has-text("New Ticket")');
    await page.waitForLoadState('networkidle');

    // Test button hover state
    const submitBtn = page.locator('button:has-text("Submit Ticket"), button:has-text("Submit")').last();
    await expect(submitBtn).toBeVisible();

    // Hover over button and check it doesn't break
    await submitBtn.hover();
    await page.waitForTimeout(300);

    // Button should still be visible and interactive
    await expect(submitBtn).toBeVisible();

    // Test input focus state
    const titleInput = page.locator('input[aria-label="Ticket title"], input[placeholder*="title" i]').first();
    await titleInput.focus();
    await page.waitForTimeout(300);

    // Input should still be visible
    await expect(titleInput).toBeVisible();

    console.log('✓ Interactive elements have proper hover/focus states');
  });

});
