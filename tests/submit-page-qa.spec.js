import { test, expect } from '@playwright/test';

test.describe('SubmitPage QA Verification', () => {
  test('should login and navigate to SubmitPage', async ({ page }) => {
    console.log('=== SUBMITPAGE QA VERIFICATION ===');
    console.log('Opening application at http://localhost:5173');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Check for visible errors on initial page load
    const pageErrors = await page.locator('text=/^(error|Error|ERROR)/i').count();
    console.log(`Initial page load errors: ${pageErrors}`);

    // Wait for login form to appear
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });

    // Log in as kai.nguyen@pomelo.com
    console.log('Logging in as kai.nguyen@pomelo.com');
    await page.fill('input[type="email"]', 'kai.nguyen@pomelo.com');
    await page.fill('input[type="password"]', 'User123!');

    const loginButton = page.locator('button').filter({ hasText: /^(Login|Sign In|Log In)$/i }).first();
    await loginButton.click();

    await page.waitForLoadState('networkidle');
    console.log('Login completed');

    // Find and click Submit Ticket button
    console.log('Looking for Submit Ticket button');
    const submitTicketButton = page.locator('button, a').filter({ hasText: /submit.*ticket/i }).first();

    await expect(submitTicketButton).toBeVisible({ timeout: 5000 });
    console.log('Submit Ticket button found');

    await submitTicketButton.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on SubmitPage. This SPA uses internal section state (no URL
    // routing), so assert on the page heading rather than the URL.
    console.log('Verifying navigation to SubmitPage');
    await expect(page.locator('text=Submit a Ticket').first()).toBeVisible({ timeout: 5000 });

    // Check for stuck loading indicators
    const spinners = await page.locator('[role="status"], .spinner, .loading').count();
    const skeletons = await page.locator('.skeleton, .skeleton-loader').count();
    console.log(`Loading spinners found: ${spinners}`);
    console.log(`Skeleton loaders found: ${skeletons}`);

    // Small delay to ensure rendering
    await page.waitForTimeout(500);

    // Check for raw markdown
    const bodyText = await page.textContent('body');
    const hasRawMarkdown = /\*\*/.test(bodyText) || /#+ /.test(bodyText);
    console.log(`Raw markdown detected: ${hasRawMarkdown}`);

    if (hasRawMarkdown) {
      console.log('WARNING: Raw markdown found in page text');
    }

    // Take screenshot of form
    console.log('Taking screenshot of form');
    await page.screenshot({ path: '/Users/quenton-d/techops/test-results/submit-form.png' });

    // Verify form fields exist
    console.log('Checking form fields');

    // Try multiple selectors for title field
    let titleField = page.locator('input[name="title"]');
    if (await titleField.count() === 0) {
      titleField = page.locator('input[placeholder*="title" i]');
    }
    if (await titleField.count() === 0) {
      titleField = page.locator('input[id*="title" i]');
    }

    // Try multiple selectors for description field
    let descField = page.locator('textarea[name="description"]');
    if (await descField.count() === 0) {
      descField = page.locator('textarea[placeholder*="description" i]');
    }
    if (await descField.count() === 0) {
      descField = page.locator('textarea[id*="description" i]');
    }

    // Fill form fields
    if (await titleField.count() > 0) {
      console.log('Filling title field');
      await titleField.first().fill('Test Ticket - QA Verification');
    } else {
      console.log('WARNING: Could not find title field');
    }

    if (await descField.count() > 0) {
      console.log('Filling description field');
      await descField.first().fill('This is a test ticket submitted during SubmitPage QA verification.');
    } else {
      console.log('WARNING: Could not find description field');
    }

    // Find and click submit button
    console.log('Submitting form');
    const submitBtn = page.locator('button').filter({ hasText: /^(Submit|Create|Send)$/i }).first();

    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');
      console.log('Form submitted');

      // Take screenshot after submission
      await page.screenshot({ path: '/Users/quenton-d/techops/test-results/submit-result.png' });

      // Check for success indicators
      const successText = page.locator('text=/success|created|submitted|completed/i');
      const successVisible = await successText.count() > 0;
      console.log(`Success message visible: ${successVisible}`);

    } else {
      console.log('ERROR: Could not find submit button');
    }

    console.log('=== QA VERIFICATION COMPLETE ===');
  });
});
