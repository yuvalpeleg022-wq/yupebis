/**
 * End-to-end smoke test for the showroom (Playwright).
 *   npm run dev   then   node scripts/qa.mjs [baseUrl] [outDir]
 * Exercises navigation, filters, cards, the 3D viewer, paint switching,
 * the form, dialogs, the lightbox, mobile menu and fallbacks, and reports
 * console errors, horizontal overflow and broken images.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? 'qa-output';
mkdirSync(outDir, { recursive: true });

const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ` — ${info}` : ''}`);
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

function watchConsole(page, label) {
  const errs = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/GPU stall|GL Driver/.test(t)) return; // software-renderer noise
    errs.push(t);
  });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => r.status() >= 400 && errs.push(`HTTP ${r.status()}: ${r.url()}`));
  return () => {
    check(`${label}: no console errors / failed requests`, errs.length === 0, errs.slice(0, 5).join(' | '));
  };
}

// Playwright's own scroll-into-view races CSS smooth scrolling under software WebGL.
// The site's nav still smooth-scrolls via JS (behavior: 'smooth'), so that remains tested.
const noCssSmooth = (page) => page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });

const revealAll = (page) =>
  page.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });

async function sectionAligned(page, id) {
  // Poll until smooth scrolling settles (slow under software WebGL), up to ~6s
  const aligned = () =>
    page.evaluate((id) => {
      if (id === 'home') return window.scrollY < 4;
      const top = document.getElementById(id).getBoundingClientRect().top;
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      return Math.abs(top - nav) < 24 || window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
    }, id);
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(300);
    if (await aligned()) return true;
  }
  return false;
}

async function imagesOk(page) {
  await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager')));
  await page.waitForTimeout(1500);
  return page.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && getComputedStyle(i).display !== 'none').map((i) => i.src),
  );
}

const diff = async (page, locator, fn) => {
  const a = await locator.screenshot();
  await fn();
  await page.waitForTimeout(1200);
  const b = await locator.screenshot();
  return !a.equals(b);
};

/* ---------------- Desktop ---------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const done = watchConsole(page, 'desktop');
  await page.goto(base, { waitUntil: 'load' });
  await noCssSmooth(page);
  await page.waitForSelector('.hero__canvas.is-ready', { timeout: 180000 });
  check('hero 3D scene renders', true);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('desktop: no horizontal overflow', overflow <= 0, `${overflow}px`);

  // Nav links
  for (const id of ['motorcycles', 'experience', 'about', 'contact', 'home']) {
    await page.click(`.nav__links a[href="#${id}"]`);
    check(`nav link → #${id}`, await sectionAligned(page, id));
  }
  // Hero CTAs
  await page.click('.hero__actions .btn-primary');
  check('hero "Explore the Collection"', await sectionAligned(page, 'motorcycles'));
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.click('.hero__actions .btn-ghost');
  check('hero "Book a Test Ride" scrolls to form', await sectionAligned(page, 'contact'));
  check(
    'hero booking preselects Strada RS',
    (await page.inputValue('select[name="motorcycleId"]')) === 'strada-rs',
  );

  // Filters
  await page.click('.nav__links a[href="#motorcycles"]');
  await page.waitForTimeout(900);
  await page.click('.collection__filters button:has-text("Adventure")');
  await page.waitForTimeout(400);
  check('filter Adventure → 1 card', (await page.locator('.collection__grid > li').count()) === 1);
  await page.click('.collection__filters button:has-text("All")');
  await page.waitForTimeout(400);
  check('filter All → 3 cards', (await page.locator('.collection__grid > li').count()) === 3);

  // Card → details
  await page.click('.card:has-text("Ventura GT") >> text=View Details');
  check('card "View Details" → details', await sectionAligned(page, 'details'));
  check('details show Ventura GT', (await page.textContent('#details-title'))?.includes('Ventura GT'));

  // Details paint swatch
  await page.click('.details__colors .swatch[aria-label="Desert Bronze"]');
  check('details paint swatch selects', (await page.textContent('.details__colors strong')) === 'Desert Bronze');

  // Lightbox
  await page.click('.details__gallery li:nth-child(2) button');
  await page.waitForSelector('dialog[open] .lightbox');
  const c1 = await page.textContent('.lightbox__count');
  await page.keyboard.press('ArrowRight');
  const c2 = await page.textContent('.lightbox__count');
  await page.click('.lightbox__next');
  const c3 = await page.textContent('.lightbox__count');
  check('lightbox opens & navigates', c1.startsWith('2') && c2.startsWith('3') && c3.startsWith('4'), `${c1} → ${c2} → ${c3}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('lightbox closes on Escape', (await page.locator('dialog[open]').count()) === 0);

  // Card 3D button → viewer with that bike
  await page.click('.nav__links a[href="#motorcycles"]');
  await page.waitForTimeout(900);
  await page.click('.card:has-text("Classica 900") button[aria-label*="3D"]');
  check('card 3D button → viewer', await sectionAligned(page, 'experience'));
  check(
    'viewer tab switched to Classica 900',
    (await page.getAttribute('.viewer__tabs button:has-text("Classica 900")', 'aria-selected')) === 'true',
  );

  const stage = page.locator('#viewer-stage');
  await page.waitForSelector('#viewer-stage canvas', { timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector('#viewer-stage .viewer__loading'), null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  check('viewer: model loaded (no error fallback)', (await page.locator('.viewer__fallback').count()) === 0);

  // Stop auto-rotate by interacting, then test controls
  const box = await stage.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  check(
    'viewer: drag rotates',
    await diff(page, stage, async () => {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 220, cy, { steps: 12 });
      await page.mouse.up();
    }),
  );
  await page.waitForTimeout(1500);
  check('viewer: zoom in button', await diff(page, stage, () => page.click('button[aria-label="Zoom in"]')));
  check('viewer: zoom out button', await diff(page, stage, () => page.click('button[aria-label="Zoom out"]')));
  check('viewer: reset button', await diff(page, stage, () => page.click('button[aria-label="Reset view"]')));
  await page.waitForTimeout(1200);
  check(
    'viewer: ctrl+wheel zooms',
    await diff(page, stage, async () => {
      await page.mouse.move(cx, cy);
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -300);
      await page.keyboard.up('Control');
    }),
  );
  const yBefore = await page.evaluate(() => scrollY);
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, 300);
  let scrolled = false;
  for (let i = 0; i < 15 && !scrolled; i++) {
    await page.waitForTimeout(300);
    scrolled = (await page.evaluate(() => scrollY)) > yBefore;
  }
  check('viewer: plain wheel still scrolls the page', scrolled);
  await page.evaluate(() => document.getElementById('experience').scrollIntoView());
  await page.waitForTimeout(600);
  check(
    'viewer: paint swatch recolours model',
    await diff(page, stage, () => page.click('.viewer__paint .swatch[aria-label="Oxblood"]')),
  );
  await page.click('.viewer__tabs button:has-text("Strada RS")');
  await page.waitForFunction(() => !document.querySelector('#viewer-stage .viewer__loading'), null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  check('viewer: switch bike tab loads Strada RS', (await page.textContent('.viewer__label strong')) === 'Crimson Gloss');
  await stage.screenshot({ path: `${outDir}/viewer-desktop.png` });

  // "Full specifications" link
  await page.click('.viewer__bar .text-link');
  check('viewer "Full specifications" → details', await sectionAligned(page, 'details'));
  await page.click('.details__actions .btn-ghost');
  check('details "View in 3D" → viewer', await sectionAligned(page, 'experience'));
  await page.click('.nav__links a[href="#motorcycles"]');
  await page.waitForTimeout(800);
  await page.click('.card:has-text("Strada RS") >> text=View Details');
  await page.waitForTimeout(900);
  await page.click('.details__actions .btn-primary');
  check('details "Book a Test Ride" → form', await sectionAligned(page, 'contact'));
  check('form preselects Strada RS from details', (await page.inputValue('select[name="motorcycleId"]')) === 'strada-rs');

  // Form validation
  await page.fill('input[name="fullName"]', '');
  await page.selectOption('select[name="motorcycleId"]', { index: 0 }).catch(() => {});
  await page.click('button[type="submit"]');
  await page.waitForTimeout(300);
  const errCount = await page.locator('.field__error').count();
  check('form: empty submit shows errors', errCount >= 5, `${errCount} errors`);
  check('form: focus moves to first invalid field', await page.evaluate(() => document.activeElement?.getAttribute('name') === 'fullName'));
  await page.fill('input[name="email"]', 'not-an-email');
  await page.locator('input[name="email"]').blur();
  check('form: invalid email message', (await page.textContent('.field.has-error:has(input[name="email"]) .field__error'))?.includes('look right'));
  await page.fill('input[name="fullName"]', 'Alex Rider');
  await page.fill('input[name="email"]', 'alex@example.com');
  await page.fill('input[name="phone"]', '+1 555 010 0199');
  await page.selectOption('select[name="motorcycleId"]', 'ventura-gt');
  const d = new Date();
  d.setDate(d.getDate() + 7);
  await page.fill('input[name="preferredDate"]', d.toISOString().slice(0, 10));
  await page.fill('textarea[name="message"]', 'Weekend morning if possible.');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(300);
  check('form: consent required', (await page.locator('.field--check .field__error').count()) === 1);
  await page.click('.check__box');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.testride__success', { timeout: 5000 });
  const success = await page.textContent('.testride__success');
  check('form: success state (demo, honest)', success.includes('Demo mode') && success.includes('no request has been sent'));
  await page.click('text=Submit another request');
  check('form: reset back to empty form', (await page.inputValue('input[name="fullName"]')) === '');

  // Privacy link inside form
  await page.click('.inline-link');
  check('form privacy link opens dialog', (await page.locator('dialog[open] .legal').count()) === 1);
  await page.click('dialog[open] .modal__close');

  // Footer
  await page.click('.footer__bottom button:has-text("Terms")');
  check('footer Terms dialog', (await page.textContent('dialog[open] .legal__title')) === 'Terms of use');
  await page.keyboard.press('Escape');
  await page.click('.footer__bottom button:has-text("Privacy")');
  check('footer Privacy dialog', (await page.textContent('dialog[open] .legal__title')) === 'Privacy policy');
  await page.click('dialog[open] .modal__close');
  await page.click('.footer__col a[href="#about"]');
  check('footer nav link → #about', await sectionAligned(page, 'about'));
  await page.click('.footer__bottom a[href="#home"]');
  check('footer "Back to top"', await sectionAligned(page, 'home'));

  // Dead-link audit: every anchor must have a real target
  const badLinks = await page.evaluate(() =>
    [...document.querySelectorAll('a')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => !h || h === '#' || (h.startsWith('#') && !document.getElementById(h.slice(1)))),
  );
  check('no dead anchors', badLinks.length === 0, badLinks.join(', '));

  const broken = await imagesOk(page);
  check('desktop: no broken images', broken.length === 0, broken.join(', '));

  await revealAll(page);
  await page.screenshot({ path: `${outDir}/desktop-full.png`, fullPage: true });
  done();
  await page.close();
}

/* ---------------- Mobile ---------------- */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const done = watchConsole(page, 'mobile');
  await page.goto(base, { waitUntil: 'load' });
  await noCssSmooth(page);
  await page.waitForTimeout(2000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('mobile: no horizontal overflow', overflow <= 0, `${overflow}px`);
  check('mobile: desktop links hidden', !(await page.isVisible('.nav__links')));

  await page.tap('.nav__toggle');
  check('mobile: menu opens', await page.isVisible('#mobile-menu'));
  await page.screenshot({ path: `${outDir}/mobile-menu.png` });
  await page.tap('#mobile-menu a[href="#experience"]');
  await page.waitForTimeout(1400);
  check('mobile: menu closes after navigating', !(await page.isVisible('#mobile-menu')));
  check('mobile: menu link scrolled to #experience', await sectionAligned(page, 'experience'));

  check('mobile: viewer requires tap to interact', await page.isVisible('.viewer__activate'));
  await page.waitForSelector('#viewer-stage canvas', { timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector('#viewer-stage .viewer__loading'), null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.tap('.viewer__activate');
  check('mobile: tap activates viewer & shows Done', await page.isVisible('.viewer__done'));
  await page.tap('.viewer__done');
  check('mobile: Done restores scroll mode', await page.isVisible('.viewer__activate'));
  await page.locator('#viewer-stage').screenshot({ path: `${outDir}/viewer-mobile.png` });

  const broken = await imagesOk(page);
  check('mobile: no broken images', broken.length === 0, broken.join(', '));
  await revealAll(page);
  await page.screenshot({ path: `${outDir}/mobile-full.png`, fullPage: true });
  done();
  await ctx.close();
}

/* ---------------- Tablet ---------------- */
{
  const page = await browser.newPage({ viewport: { width: 834, height: 1112 } });
  const done = watchConsole(page, 'tablet');
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('tablet: no horizontal overflow', overflow <= 0, `${overflow}px`);
  await revealAll(page);
  await page.screenshot({ path: `${outDir}/tablet-full.png`, fullPage: true });
  done();
  await page.close();
}

/* ---------------- No-WebGL fallback ---------------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const done = watchConsole(page, 'no-webgl');
  await page.goto(`${base}/?no3d`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  check('fallback: hero poster visible, no canvas', (await page.isVisible('.hero__poster')) && (await page.locator('canvas').count()) === 0);
  await page.evaluate(() => document.getElementById('experience').scrollIntoView());
  await page.waitForTimeout(1200);
  check('fallback: viewer shows static image + notice', await page.isVisible('.viewer__fallback .viewer__notice'));
  await page.locator('#viewer-stage').screenshot({ path: `${outDir}/viewer-fallback.png` });
  done();
  await page.close();
}

/* ---------------- Reduced motion ---------------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const vis = await page.evaluate(() => getComputedStyle(document.querySelector('.reveal')).opacity);
  check('reduced motion: content visible without animation', vis === '1');
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
