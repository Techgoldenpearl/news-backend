import { test, expect } from "@playwright/test";
import { gotoAuthed } from "../helpers";

test.describe("Membership Management", () => {
  test("membership page loads with plans and tabs", async ({ page }) => {
    await gotoAuthed(page, "/membership");
    await expect(page.getByRole("heading", { name: "Membership" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Plans \(/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Subscriptions \(/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Plan" })).toBeVisible();
  });

  test("subscriptions tab shows table with user column", async ({ page }) => {
    await gotoAuthed(page, "/membership");
    await page.getByRole("button", { name: /Subscriptions \(/ }).click();
    await expect(page.locator("th:has-text('Plan')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("th:has-text('User')")).toBeVisible();
    await expect(page.getByText(/unique subscriber/)).toBeVisible({ timeout: 10000 });
  });

  test("subscriptions table shows subscriber email, not just plan info", async ({ page, request }) => {
    // Ensure at least one subscription exists so the table has a row to check
    const email = `pw-admin-sub-check-${Date.now()}@example.com`;
    const registerRes = await request.post("http://localhost:5000/api/auth/register", {
      data: { email, password: "testpass123" },
    });
    const { token: userToken } = await registerRes.json();
    const plans = await (await request.get("http://localhost:5000/api/membership/plans")).json();
    await request.post("http://localhost:5000/api/membership/subscribe", {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { planId: plans[0].id, paymentId: "pw-admin-check" },
    });

    await gotoAuthed(page, "/membership");
    await page.getByRole("button", { name: /Subscriptions \(/ }).click();
    await expect(page.getByText(email)).toBeVisible({ timeout: 10000 });
  });

  test("admin can deactivate and reactivate a user's subscription from the table", async ({ page, request }) => {
    const email = `pw-admin-sub-toggle-${Date.now()}@example.com`;
    const registerRes = await request.post("http://localhost:5000/api/auth/register", {
      data: { email, password: "testpass123" },
    });
    const { token: userToken } = await registerRes.json();
    const plans = await (await request.get("http://localhost:5000/api/membership/plans")).json();
    await request.post("http://localhost:5000/api/membership/subscribe", {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { planId: plans[0].id, paymentId: "pw-admin-toggle-check" },
    });

    await gotoAuthed(page, "/membership");
    await page.getByRole("button", { name: /Subscriptions \(/ }).click();
    const row = page.locator("tr", { hasText: email });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.getByText("active", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Deactivate" }).click();
    await expect(row.getByText("cancelled", { exact: true })).toBeVisible({ timeout: 10000 });

    await row.getByRole("button", { name: "Activate" }).click();
    await expect(row.getByText("active", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("create, edit, and delete a plan end-to-end", async ({ page }) => {
    const planName = `PW Test Plan ${Date.now()}`;
    const planSlug = `pw-test-plan-${Date.now()}`;

    await gotoAuthed(page, "/membership");
    await expect(page.getByRole("heading", { name: "Membership" })).toBeVisible({ timeout: 15000 });

    // Create
    await page.getByRole("button", { name: "Add Plan" }).click();
    await expect(page.getByRole("heading", { name: "Add New Plan" })).toBeVisible();
    await page.locator('input[placeholder="Premium"]').fill(planName);
    await page.locator('input[placeholder="premium"]').fill(planSlug);
    await page.locator('input[placeholder="249.00"]').fill("199.00");
    await page.getByRole("button", { name: "Create Plan" }).click();

    await expect(page.getByText(planSlug)).toBeVisible({ timeout: 10000 });

    // Edit — scope to the card containing this test's unique slug, not the name
    // (name text can collide with other cards left over from earlier runs)
    const card = page.locator(".border", { hasText: planSlug }).first();
    await card.getByTitle("Edit").click();
    await expect(page.getByRole("heading", { name: "Edit Plan" })).toBeVisible();
    const nameInput = page.locator('input[placeholder="Premium"]');
    await nameInput.fill(`${planName} Updated`);
    await page.getByRole("button", { name: "Update Plan" }).click();
    await expect(card.getByText(`${planName} Updated`)).toBeVisible({ timeout: 10000 });

    // Deactivate toggle
    await card.getByRole("button", { name: "Deactivate" }).click();
    await expect(card.getByText("Inactive")).toBeVisible({ timeout: 10000 });

    // Delete (soft-delete: accept the confirm dialog, plan stays visible but marked Inactive)
    page.once("dialog", (dialog) => dialog.accept());
    await card.getByTitle("Delete").click();
    await expect(card.getByText("Inactive")).toBeVisible({ timeout: 10000 });
  });
});
