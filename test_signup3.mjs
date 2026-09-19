import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 500, height: 900 } });

await page.goto('http://localhost:3000/home', { waitUntil: 'load' });
await page.waitForTimeout(1000);

await page.click('button:has-text("लॉगिन")');
await page.waitForTimeout(500);

const modalButtons = await page.$$eval('div[class*="modal" i] button, [role="dialog"] button, .fixed button', els => els.map(e => e.textContent?.trim()).filter(Boolean));
console.log('modal buttons after clicking लॉगिन:', JSON.stringify(modalButtons));

// switch to signup
const regBtn = await page.$('button:has-text("नया खाता")');
console.log('register-switch button found:', !!regBtn);
if (regBtn) { await regBtn.click(); await page.waitForTimeout(400); }

const checkbox = await page.$('input[type="checkbox"]');
console.log('checkbox present:', !!checkbox);

const submitBtn = await page.$('button[type="submit"]');
console.log('submit button text:', submitBtn ? await submitBtn.textContent() : null);
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

await page.screenshot({ path: 'signup_modal_test.png', fullPage: false });
console.log('screenshot saved');

await browser.close();
