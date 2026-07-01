import { test, expect } from "@playwright/test";

test("localhost:3000 shows login form when not authenticated", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page.getByRole("heading", { name: "News Admin" })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
  await page.screenshot({ path: "test-results/screenshots/proof-root-login.png", fullPage: true });
});

test("full login flow from root URL", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  await page.fill('input[type="email"]', "admin@news.com");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: "test-results/screenshots/proof-dashboard-from-root.png", fullPage: true });
});
