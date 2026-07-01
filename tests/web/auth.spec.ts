import { test, expect } from "@playwright/test";

test.describe("Public Auth", () => {
  test("login page renders form", async ({ page }) => {
    await page.goto("http://localhost:3001/login");
    await expect(page.getByText("Welcome Back")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
  });

  test("register page renders form", async ({ page }) => {
    await page.goto("http://localhost:3001/register");
    await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login with wrong creds shows error", async ({ page }) => {
    await page.goto("http://localhost:3001/login");
    await page.fill('input[type="email"]', "nobody@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    const errorVisible = await page.locator("text=/failed|invalid|error|incorrect/i").first().isVisible().catch(() => false);
    const redVisible = await page.locator('[class*="red"]').first().isVisible().catch(() => false);
    expect(errorVisible || redVisible).toBeTruthy();
  });

  test("login page links to register", async ({ page }) => {
    await page.goto("http://localhost:3001/login");
    await page.getByRole("link", { name: "Register" }).click();
    await page.waitForURL("**/register");
    expect(page.url()).toContain("/register");
  });

  test("register page links to login", async ({ page }) => {
    await page.goto("http://localhost:3001/register");
    await page.getByRole("link", { name: "Sign In" }).click();
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });
});

test.describe("Public Profile (unauthenticated)", () => {
  test("profile page shows login prompt", async ({ page }) => {
    await page.goto("http://localhost:3001/profile");
    await expect(page.getByRole("link", { name: /Login/i })).toBeVisible({ timeout: 10000 });
  });

  test("bookmarks page shows login prompt", async ({ page }) => {
    await page.goto("http://localhost:3001/bookmarks");
    await expect(page.getByRole("link", { name: /Login/i })).toBeVisible({ timeout: 10000 });
  });

  test("history page shows login prompt", async ({ page }) => {
    await page.goto("http://localhost:3001/history");
    await expect(page.getByRole("link", { name: /Login/i })).toBeVisible({ timeout: 10000 });
  });
});
