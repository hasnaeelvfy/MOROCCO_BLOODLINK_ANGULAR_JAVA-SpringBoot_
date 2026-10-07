import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = 'http://localhost:4200/';
const OUT = 'verify-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'msedge',
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']
});

const problems = [];

async function audit(name, viewport, shots) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 700,
    hasTouch: viewport.width < 700
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  for (const shot of shots) {
    await page.waitForTimeout(shot.waitMs);
    await page.screenshot({ path: `${OUT}/${name}-${shot.label}.png` });
  }

  // Let the intro fully hand off.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${name}-hero.png` });

  const metrics = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right };
    };
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      bodyOverflowHidden: document.body.classList.contains('intro-lock'),
      introPresent: !!document.querySelector('.intro:not(.intro--finished)'),
      canvases: Array.from(document.querySelectorAll('canvas')).map((c) => ({
        cls: c.className,
        w: c.width,
        h: c.height,
        cssW: Math.round(c.getBoundingClientRect().width),
        cssH: Math.round(c.getBoundingClientRect().height)
      })),
      title: rect('.hero__title'),
      stage: rect('.hero__stage'),
      badge: rect('.hero__badge'),
      actions: rect('.hero__actions'),
      nav: rect('.nav'),
      heroSection: rect('.hero')
    };
  });

  // Scroll the whole page to trigger every reveal and catch late layout breaks.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 160));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 500));
  });
  await page.screenshot({ path: `${OUT}/${name}-bottom.png` });

  const afterScroll = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hiddenReveals: Array.from(document.querySelectorAll('.reveal:not(.visible)')).length,
    totalReveals: document.querySelectorAll('.reveal').length
  }));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-top.png` });

  // ---- assertions ----
  if (metrics.docScrollWidth > metrics.innerWidth + 1) {
    problems.push(`[${name}] horizontal overflow: ${metrics.docScrollWidth} > ${metrics.innerWidth}`);
  }
  if (afterScroll.docScrollWidth > afterScroll.innerWidth + 1) {
    problems.push(`[${name}] horizontal overflow after scroll: ${afterScroll.docScrollWidth}`);
  }
  if (metrics.bodyOverflowHidden) {
    problems.push(`[${name}] body still has intro-lock after intro`);
  }
  if (metrics.introPresent) {
    problems.push(`[${name}] intro overlay still in DOM after intro`);
  }
  if (afterScroll.hiddenReveals > 0) {
    problems.push(`[${name}] ${afterScroll.hiddenReveals}/${afterScroll.totalReveals} reveals never became visible`);
  }
  for (const c of metrics.canvases) {
    if (c.w === 0 || c.h === 0) problems.push(`[${name}] canvas "${c.cls}" has zero drawing buffer`);
  }
  if (metrics.title && metrics.badge) {
    const overlapX = metrics.title.right > metrics.badge.x && metrics.badge.right > metrics.title.x;
    const overlapY = metrics.title.bottom > metrics.badge.y && metrics.badge.bottom > metrics.title.y;
    if (overlapX && overlapY) problems.push(`[${name}] hero title overlaps the badge`);
  }
  if (metrics.title && metrics.nav && metrics.title.y < metrics.nav.bottom) {
    problems.push(`[${name}] hero title starts under the nav (${metrics.title.y} < ${metrics.nav.bottom})`);
  }
  if (errors.length) problems.push(`[${name}] console errors: ${errors.slice(0, 4).join(' | ')}`);

  console.log(`\n=== ${name} (${viewport.width}x${viewport.height}) ===`);
  console.log(JSON.stringify({ metrics, afterScroll, errors: errors.slice(0, 5) }, null, 2));

  await context.close();
}

await audit('desktop', { width: 1440, height: 900 }, [
  { label: 'intro-drop', waitMs: 1100 },
  { label: 'intro-flatline', waitMs: 700 },
  { label: 'intro-rhythm', waitMs: 900 },
  { label: 'intro-brand', waitMs: 1300 }
]);

await audit('mobile', { width: 390, height: 844 }, [
  { label: 'intro-rhythm', waitMs: 2600 },
  { label: 'intro-brand', waitMs: 1300 }
]);

await browser.close();

console.log('\n================ PROBLEMS ================');
console.log(problems.length ? problems.join('\n') : 'none');
