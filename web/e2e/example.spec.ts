import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/E-numismatica/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');

  await page.click('text=Auctions');
  await expect(page).toHaveURL(/.*auctions/);
});