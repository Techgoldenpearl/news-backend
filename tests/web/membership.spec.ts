import { test, expect } from "@playwright/test";

const API = "http://localhost:5000/api";

test.describe("Public Membership — my subscription", () => {
  test("membership page shows plan picker when logged out", async ({ page }) => {
    await page.goto("http://localhost:3001/membership");
    await expect(page.getByText("सदस्यता योजनाएं")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "सदस्यता लें" }).first()).toBeVisible();
  });

  test("logged-in user with no subscription still sees plan picker", async ({ page }) => {
    const email = `pw-membership-${Date.now()}@example.com`;
    await page.goto("http://localhost:3001/register");
    await page.locator('input[placeholder="Full Name"]').fill("Playwright User");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("testpass123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|profile|login)/, { timeout: 15000 });

    await page.goto("http://localhost:3001/membership");
    await expect(page.getByText("सदस्यता योजनाएं")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "सदस्यता लें" }).first()).toBeVisible();
    await expect(page.getByText("आपकी सदस्यता")).not.toBeVisible();
  });

  test("subscribing shows the status card with cancel option", async ({ page, request }) => {
    const email = `pw-membership-sub-${Date.now()}@example.com`;
    const registerRes = await request.post(`${API}/auth/register`, {
      data: { email, password: "testpass123" },
    });
    const { token } = await registerRes.json();

    const plans = await (await request.get(`${API}/membership/plans`)).json();
    const planId = plans[0].id;

    await page.context().addCookies([
      { name: "token", value: token, domain: "localhost", path: "/" },
    ]);

    await request.post(`${API}/membership/subscribe`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { planId, paymentId: "pw-web-test-payment" },
    });

    await page.goto("http://localhost:3001/membership");
    await expect(page.getByText("आपकी सदस्यता")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("सक्रिय")).toBeVisible();
    await expect(page.getByRole("button", { name: "सदस्यता रद्द करें" })).toBeVisible();
    // Plan picker should be hidden while an active subscription exists
    await expect(page.getByRole("button", { name: "सदस्यता लें" })).not.toBeVisible();

    // Cancel it
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "सदस्यता रद्द करें" }).click();
    await expect(page.getByText("आपकी सदस्यता")).not.toBeVisible({ timeout: 10000 });

    // Plan picker should reappear, and past-plan note should show
    await expect(page.getByRole("button", { name: "सदस्यता लें" }).first()).toBeVisible();
    await expect(page.getByText("आपकी पिछली सदस्यता")).toBeVisible();
  });
});
