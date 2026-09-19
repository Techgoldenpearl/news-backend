import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto('http://localhost:3000/home', { waitUntil: 'load' });
await page.waitForTimeout(1000);

await page.click('button[aria-haspopup="true"]:has-text("लॉगिन") >> visible=true');
await page.waitForTimeout(400);

await page.click('button:has-text("नया खाता") >> visible=true');
await page.waitForTimeout(500);

const checkbox = await page.$('input[type="checkbox"]');
console.log('checkbox present:', !!checkbox);

const submitBtn = await page.$('button[type="submit"]');
console.log('submit button text:', submitBtn ? (await submitBtn.textContent())?.trim() : null);
console.log('submit disabled before check:', submitBtn ? await submitBtn.isDisabled() : null);

const privacyLink = await page.$('a[href="/privacy"]');
const termsLink = await page.$('a[href="/terms"]');
console.log('privacy link present:', !!privacyLink, 'target=', privacyLink ? await privacyLink.getAttribute('target') : null);
console.log('terms link present:', !!termsLink, 'target=', termsLink ? await termsLink.getAttribute('target') : null);

if (checkbox) {
  await checkbox.check();
  await page.waitForTimeout(200);
  console.log('submit disabled after check:', await submitBtn.isDisabled());
  await checkbox.uncheck();
  await page.waitForTimeout(200);
  console.log('submit disabled after uncheck:', await submitBtn.isDisabled());
}

await page.screenshot({ path: 'C:\Users\DELL\AppData\Local\Temp\claude\c--Users-DELL-Desktop-news\c50480e0-4d08-49aa-aa67-59bac8525a80\scratchpad\signup_modal.png', fullPage: false });
console.log('screenshot saved');

await browser.close();
