import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
await page.emulateMedia({ reducedMotion: 'no-preference' });
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:4200/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(400);

const duringIntro = await page.evaluate(() => ({
  hasIntro: Boolean(document.querySelector('app-intro, .intro')),
  introVisible: document.querySelector('.intro') ? getComputedStyle(document.querySelector('.intro')).display : null,
  hasLanding: Boolean(document.querySelector('app-landing')),
  hasNav: Boolean(document.querySelector('app-site-nav')),
  text: (document.body.innerText || '').slice(0, 300)
}));
await page.screenshot({ path: 'debug-landing-intro.png', fullPage: false });

await page.waitForTimeout(4500);
const afterIntro = await page.evaluate(() => ({
  hasIntro: Boolean(document.querySelector('.intro:not(.intro--finished)')),
  hasLanding: Boolean(document.querySelector('app-landing')),
  hasHero: Boolean(document.querySelector('app-hero')),
  title: document.querySelector('.hero__title')?.textContent?.replace(/\s+/g, ' ').trim() ?? null
}));
await page.screenshot({ path: 'debug-landing.png', fullPage: false });

await page.locator('.hero__actions a').first().click();
await page.waitForTimeout(1200);
const afterNav = await page.evaluate(() => ({
  pathname: location.pathname,
  text: (document.body.innerText || '').slice(0, 300),
  hasLanding: Boolean(document.querySelector('app-landing'))
}));
await page.screenshot({ path: 'debug-landing-auth.png', fullPage: false });

console.log(JSON.stringify({ errors, duringIntro, afterIntro, afterNav }, null, 2));
await browser.close();
