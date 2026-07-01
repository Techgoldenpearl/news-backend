import { test, expect } from "@playwright/test";
import { gotoAuthed } from "../helpers";

test.describe("Admin Dashboard", () => {
  test("dashboard shows stat cards", async ({ page }) => {
    await gotoAuthed(page, "/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Total Articles")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Total Users")).toBeVisible();
  });

  test("sidebar navigation is visible", async ({ page }) => {
    await gotoAuthed(page, "/dashboard");
    await expect(page.getByText("NewsAdmin")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Articles" })).toBeVisible();
  });

  test("articles page loads", async ({ page }) => {
    await gotoAuthed(page, "/articles");
    await expect(page.getByRole("heading", { name: /Articles/ })).toBeVisible({ timeout: 10000 });
  });

  test("categories page shows data", async ({ page }) => {
    await gotoAuthed(page, "/categories");
    await expect(page.getByRole("heading", { name: /Categories/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });
  });

  test("sites page shows data", async ({ page }) => {
    await gotoAuthed(page, "/sites");
    await expect(page.getByText("The Local Leader")).toBeVisible({ timeout: 15000 });
  });

  test("analytics page loads", async ({ page }) => {
    await gotoAuthed(page, "/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible({ timeout: 15000 });
  });

  test("settings page loads", async ({ page }) => {
    await gotoAuthed(page, "/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 15000 });
  });

  test("page builder loads", async ({ page }) => {
    await gotoAuthed(page, "/page-builder");
    await expect(page.getByRole("heading", { name: "Page Builder" })).toBeVisible({ timeout: 15000 });
  });

  test("membership page loads", async ({ page }) => {
    await gotoAuthed(page, "/membership");
    await expect(page.getByRole("heading", { name: "Membership" })).toBeVisible({ timeout: 15000 });
  });
});
