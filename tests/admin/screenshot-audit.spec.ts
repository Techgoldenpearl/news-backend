import { test, expect } from "@playwright/test";
import { gotoAuthed } from "../helpers";

const PAGES = [
  { path: "/login", name: "01-login", auth: false },
  { path: "/dashboard", name: "02-dashboard", auth: true },
  { path: "/articles", name: "03-articles", auth: true },
  { path: "/articles/new", name: "04-article-editor", auth: true },
  { path: "/categories", name: "05-categories", auth: true },
  { path: "/media", name: "06-media", auth: true },
  { path: "/web-stories", name: "07-web-stories", auth: true },
  { path: "/photo-galleries", name: "08-photo-galleries", auth: true },
  { path: "/live-blogs", name: "09-live-blogs", auth: true },
  { path: "/rashifal", name: "10-rashifal", auth: true },
  { path: "/ads", name: "11-ads", auth: true },
  { path: "/analytics", name: "12-analytics", auth: true },
  { path: "/reporters", name: "13-reporters", auth: true },
  { path: "/users", name: "14-users", auth: true },
  { path: "/comments", name: "15-comments", auth: true },
  { path: "/sites", name: "16-sites", auth: true },
  { path: "/page-builder", name: "17-page-builder", auth: true },
  { path: "/membership", name: "18-membership", auth: true },
  { path: "/audit-log", name: "19-audit-log", auth: true },
  { path: "/settings", name: "20-settings", auth: true },
];

test.describe("Admin Screenshot Audit", () => {
  for (const p of PAGES) {
    test(`${p.name}: ${p.path}`, async ({ page }) => {
      if (p.auth) {
        await gotoAuthed(page, p.path);
      } else {
        await page.goto(`http://localhost:3000${p.path}`);
      }

      await page.waitForTimeout(3000);

      // Check for errors
      const errorText = await page.locator("text=/error|Error|TypeError|ReferenceError/i").first().isVisible().catch(() => false);

      await page.screenshot({
        path: `test-results/screenshots/${p.name}.png`,
        fullPage: true
      });

      // Basic checks
      const bodyText = await page.textContent("body") || "";
      expect(bodyText.length).toBeGreaterThan(10);

      if (errorText) {
        console.log(`⚠️  ${p.name} has error visible on page`);
      }
    });
  }
});
