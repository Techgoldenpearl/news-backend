const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const consoleErrors = [];
  const failedReqs = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push("PAGE ERROR: " + err.message));
  page.on("response", (res) => { if (res.status() >= 400) failedReqs.push(`${res.status()} ${res.url()}`); });

  await page.goto("http://localhost:3001/home", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1200);

  // Click the "राष्ट्रीय" (National) nav link
  const navLink = page.locator('header a:has-text("राष्ट्रीय")').first();
  const href = await navLink.getAttribute("href");
  console.log("Nav link href:", href);
  await navLink.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);

  console.log("URL after click:", page.url());
  await page.screenshot({ path: "check-category-click.png", fullPage: true });

  const bodyText = await page.locator("body").innerText();
  console.log("\nBody text length:", bodyText.length);
  console.log("Body text sample:\n", bodyText.slice(0, 600));

  console.log("\nFailed requests:", JSON.stringify(failedReqs));
  console.log("Console errors:", JSON.stringify(consoleErrors));

  await browser.close();
})();
