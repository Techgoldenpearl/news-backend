import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 500, height: 900 } });
page.on('pageerror', err => console.log('PAGEERROR:', err.message));
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

await page.goto('http://localhost:3000/home', { waitUntil: 'load' });
await page.waitForTimeout(1000);

// Find and click something that opens the auth modal - inspect header buttons
const headerButtons = await page.$$eval('header button, nav button', els => els.map(e => e.textContent?.trim()).filter(Boolean));
console.log('header/nav buttons found:', JSON.stringify(headerButtons));

