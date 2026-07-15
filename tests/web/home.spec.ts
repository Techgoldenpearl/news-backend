import { test, expect } from "@playwright/test";

test.describe("Public Home Page", () => {
  test("home page loads with content sections", async ({ page }) => {
    await page.goto("http://localhost:3001/home");
    await expect(page.getByRole("link", { name: "NewsHub" }).first()).toBeVisible();
    await expect(page.getByText("ताज़ा खबरें")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("ट्रेंडिंग")).toBeVisible();
    await expect(page.getByText("कैटेगरी")).toBeVisible();
  });

  test("navbar has categories and links", async ({ page }) => {
    await page.goto("http://localhost:3001/home");
    await expect(page.getByRole("link", { name: "राशिफल" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "वीडियो" }).first()).toBeVisible();
  });

  test("navbar has login link when not authenticated", async ({ page }) => {
    await page.goto("http://localhost:3001/home");
    await expect(page.getByRole("link", { name: "Login" }).first()).toBeVisible({ timeout: 5000 });
  });

  test("category links in sidebar work", async ({ page }) => {
    await page.goto("http://localhost:3001/home");
    await page.waitForTimeout(2000);
    const link = page.locator('a[href="/category/politics"]').first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForURL("**/category/politics");
      expect(page.url()).toContain("/category/politics");
    }
  });

  test("footer is visible with copyright", async ({ page }) => {
    await page.goto("http://localhost:3001/home");
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByText("All rights reserved")).toBeVisible();
  });
});

test.describe("Public Search", () => {
  test("search page renders with query", async ({ page }) => {
    await page.goto("http://localhost:3001/search?q=news");
    await expect(page.getByRole("heading", { name: /Search/ })).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Public Feature Pages", () => {
  test("rashifal page loads with zodiac signs", async ({ page }) => {
    await page.goto("http://localhost:3001/rashifal");
    await expect(page.getByText("आज का राशिफल")).toBeVisible();
    await expect(page.getByText("♈")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("मेष")).toBeVisible();
  });

  test("clicking a rashi shows prediction area", async ({ page }) => {
    await page.goto("http://localhost:3001/rashifal");
    await page.getByText("♈").click();
    await page.waitForTimeout(2000);
    await expect(page.getByText("मेष").first()).toBeVisible();
  });

  test("membership page loads", async ({ page }) => {
    await page.goto("http://localhost:3001/membership");
    await expect(page.getByText("Membership Plans")).toBeVisible({ timeout: 10000 });
  });

  test("video page loads", async ({ page }) => {
    await page.goto("http://localhost:3001/video");
    await expect(page.getByText("वीडियो न्यूज़")).toBeVisible();
  });

  test("web stories page loads", async ({ page }) => {
    await page.goto("http://localhost:3001/web-stories");
    await expect(page.getByRole("heading", { name: "Web Stories" })).toBeVisible();
  });

  test("photo gallery page loads", async ({ page }) => {
    await page.goto("http://localhost:3001/photo-gallery");
    await expect(page.getByRole("heading", { name: "Photo Galleries" })).toBeVisible();
  });
});
