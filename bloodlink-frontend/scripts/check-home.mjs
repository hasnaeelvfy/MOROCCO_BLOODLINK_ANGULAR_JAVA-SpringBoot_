import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://127.0.0.1:4200/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2500);

const bodyText = await page.locator('body').innerText();
const hasTitle = bodyText.includes('One drop') || bodyText.includes('Become a donor');
const hasNav = bodyText.toLowerCase().includes('bloodlink');
await page.screenshot({ path: 'scripts/home-check.png', fullPage: false });

console.log(JSON.stringify({ hasTitle, hasNav, errors, snippet: bodyText.slice(0, 500) }, null, 2));
await browser.close();
process.exit(hasTitle ? 0 : 1);
