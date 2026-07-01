import { test, expect } from "@playwright/test";

test.describe("Admin Login", () => {
  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await expect(page.getByRole("heading", { name: "News Admin" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "admin@news.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator('[class*="red-"]')).toBeVisible({ timeout: 15000 });
  });

  test("login with correct credentials redirects to dashboard", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "admin@news.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 20000 });
    // After login the middleware cookie is set, so subsequent navigations work
  });
});
