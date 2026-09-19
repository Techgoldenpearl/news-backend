import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto('http://localhost:3000/home', { waitUntil: 'load' });
await page.waitForTimeout(1000);

await page.click('button[aria-haspopup="true"]:has-text("लॉगिन") >> visible=true');
await page.waitForTimeout(400);
await page.click('button:has-text("नया खाता") >> visible=true');
await page.waitForTimeout(500);

const html = await page.$eval('a[href="/privacy"]', el => el.outerHTML);
console.log('privacy link outerHTML:', html);

await browser.close();
