import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 500, height: 900 } });

await page.goto('http://localhost:3000/home', { waitUntil: 'load' });
await page.waitForTimeout(1000);

// Open the account dropdown (top-level pill button with UserIcon + "लॉगिन" label)
await page.click('button[aria-haspopup="true"][aria-expanded]:has-text("लॉगिन")');
await page.waitForTimeout(400);

// Click "नया खाता" menu item to open signup mode directly
await page.click('button:has-text("नया खाता")');
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

  // Try submitting while unchecked to confirm the JS-level guard message too
  await page.fill('input[placeholder="पूरा नाम"]', 'Test User');
  await page.fill('input[type="email"]', 'test-checkbox@example.com');
  const pwFields = await page.$$('input[type="password"]');
  if (pwFields.length >= 2) {
    await pwFields[0].fill('Password123');
    await pwFields[1].fill('Password123');
  }
}

await page.screenshot({ path: 'C:\Users\DELL\AppData\Local\Temp\claude\c--Users-DELL-Desktop-news\c50480e0-4d08-49aa-aa67-59bac8525a80\scratchpad\signup_modal.png', fullPage: false });
console.log('screenshot saved');

await browser.close();
