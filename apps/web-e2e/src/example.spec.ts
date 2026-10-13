import { test, expect } from '@playwright/test';

test.describe('Personal Loan Portal', () => {
  test('displays the login screen', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /sign in|login/i }),
    ).toBeVisible();
  });

  test('customer can sign in and view their loan dashboard', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel(/email/i).fill('seed.customer.001@example.com');
    await page.getByLabel(/password/i).fill('CustomerDemo123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await page.waitForTimeout(3000);

    console.log('URL after login:', page.url());
    console.log('Page content:', await page.locator('body').innerText());

    await expect(
      page.getByRole('heading', { name: 'Good to see you' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('admin can sign in and view all applications', async ({ page }) => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    test.skip(!email || !password, 'Set ADMIN_EMAIL and ADMIN_PASSWORD for the admin E2E test');

    await page.goto('/');

    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // The admin dashboard should display its applications table.
    await expect(
      page.getByRole('columnheader', { name: /applicant/i }),
    ).toBeVisible({ timeout: 15000 });
  });
});