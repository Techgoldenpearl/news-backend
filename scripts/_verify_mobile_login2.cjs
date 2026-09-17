const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Users/DELL/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("http://localhost:3000/home", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

  await page.locator("header button").first().click();
  await page.waitForTimeout(600);

  // Target the login button specifically within the sidebar aside
  const sidebarLoginBtn = page.locator("aside").locator("button", { hasText: "लॉगिन" });
  console.log("sidebar login button count:", await sidebarLoginBtn.count());
  console.log("sidebar login button visible:", await sidebarLoginBtn.first().isVisible());

  await sidebarLoginBtn.first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "C:/Users/DELL/Desktop/news/news-backend/scripts/_mobile_login_menu2.png" });

  const bodyText = await page.locator("body").innerText();
  console.log("shows पाठक (Reader) menu section:", bodyText.includes("पाठक"));

  await browser.close();
})();
