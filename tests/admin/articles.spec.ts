import { test, expect } from "@playwright/test";
import { gotoAuthed } from "../helpers";

test.describe("Article Management", () => {
  test("articles page loads with table", async ({ page }) => {
    await gotoAuthed(page, "/articles");
    await expect(page.getByRole("heading", { name: /Articles/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("link", { name: "New Article" })).toBeVisible();
    await expect(page.locator("th:has-text('Title')")).toBeVisible({ timeout: 10000 });
  });

  test("status filter dropdown exists", async ({ page }) => {
    await gotoAuthed(page, "/articles");
    const select = page.locator("select").first();
    await expect(select).toBeVisible({ timeout: 10000 });
  });

  test("new article page loads with editor", async ({ page }) => {
    await gotoAuthed(page, "/articles/new");
    await expect(page.getByRole("heading", { name: "New Article" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Save Draft" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
  });

  test("article editor has tabs", async ({ page }) => {
    await gotoAuthed(page, "/articles/new");
    await expect(page.getByRole("button", { name: /content/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /seo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /settings/i })).toBeVisible();
  });

  test("can type in article title", async ({ page }) => {
    await gotoAuthed(page, "/articles/new");
    const titleInput = page.locator('input[placeholder="Enter article title..."]');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.fill("Test Article");
    await expect(titleInput).toHaveValue("Test Article");
  });

  test("category selector has options", async ({ page }) => {
    await gotoAuthed(page, "/articles/new");
    await page.waitForTimeout(3000);
    const sel = page.locator("select").filter({ hasText: "Select category" });
    await expect(sel).toBeVisible({ timeout: 15000 });
  });
});
