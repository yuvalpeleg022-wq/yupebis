/**
 * Automated QA for AERONIX AIRWAYS.
 * Requires Playwright with Chromium (not a project dependency):  npm i -D playwright && npx playwright install chromium
 * Usage:  npm run build && npx vite preview --port 4173 &  then  npm run qa
 *         QA_URL=http://localhost:4173 node scripts/qa.mjs
 * Screenshots are written to .qa-screens/ (git-ignored).
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.QA_URL ?? 'http://localhost:4173';
const OUT = '.qa-screens';
mkdirSync(OUT, { recursive: true });

const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// Known, non-actionable messages from headless software rendering / upstream libraries.
const IGNORED = [/GPU stall due to ReadPixels/, /THREE\.Clock: This module has been deprecated/, /GL Driver Message/];

function watch(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !IGNORED.some((r) => r.test(m.text()))) errors.push(`${m.type()}: ${m.text()}`);
  });
  return errors;
}

async function run() {
  const browser = await chromium.launch({ args: GL_ARGS });

  // 1. Routes, titles, h1, console
  const routes = [
    ['/', /AERONIX AIRWAYS — Beyond the Ordinary/],
    ['/destinations', /Destinations/],
    ['/fleet', /Our Fleet/],
    ['/experience', /Experience/],
    ['/booking', /Book a flight/],
    ['/about', /About/],
    ['/does-not-exist', /Page not found/],
  ];
  for (const [path, expected] of routes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = watch(page);
    await page.goto(BASE + path, { waitUntil: 'load' });
    await page.waitForTimeout(path === '/' || path === '/destinations' ? 9000 : 2500);
    const t = await page.title();
    const h1 = await page.locator('h1').count();
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    await page.screenshot({ path: `${OUT}/route${path.replace(/\//g, '_') || '_home'}.png` });
    record(`route ${path}: title, single h1, meta description`, expected.test(t) && h1 === 1 && !!desc, `title="${t}" h1=${h1}`);
    record(`route ${path}: no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }

  // 2. Home: canvas present, scroll sequences, viewer
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = watch(page);
    await page.goto(BASE + '/');
    await page.waitForTimeout(9000);
    record('home: WebGL canvas rendered', (await page.locator('canvas').count()) === 1);
    const heroOpacity = await page.locator('[data-intro="headline"]').evaluate((el) => getComputedStyle(el).opacity);
    record('home: intro reveals headline', Number(heroOpacity) > 0.95, `opacity=${heroOpacity}`);
    const steps = ['A', 'B', 'C', 'D', 'E'];
    for (const [i, s] of steps.entries()) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), (i + 1) * 900);
      await page.waitForTimeout(3500);
      await page.screenshot({ path: `${OUT}/sequence-${s}.png` });
    }
    record('home: final reveal copy visible', await page.getByText('The world is yours to discover.').isVisible());
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: 'Explore aircraft' }).first().click();
    await page.waitForSelector('[role="dialog"][aria-modal="true"]');
    await page.waitForTimeout(7000);
    record('viewer: opens as modal dialog with second canvas', (await page.locator('canvas').count()) === 2);
    await page.screenshot({ path: `${OUT}/viewer-initial.png` });
    for (const view of ['Front', 'Top', 'Engine', 'Wing']) {
      await page.getByRole('button', { name: view, exact: true }).click();
      await page.waitForTimeout(2200);
      await page.screenshot({ path: `${OUT}/viewer-${view.toLowerCase()}.png` });
    }
    const canvasBox = await page.locator('[role="dialog"] canvas').boundingBox();
    if (canvasBox) {
      await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 300, canvasBox.y + canvasBox.height / 2 + 40, { steps: 12 });
      await page.mouse.up();
      await page.mouse.wheel(0, -400);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/viewer-dragged.png` });
    }
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('g');
    await page.waitForTimeout(1500);
    const gearPressed = await page.getByRole('button', { name: /Gear (up|down)/ }).getAttribute('aria-pressed');
    record('viewer: keyboard G toggles landing gear', gearPressed === 'true');
    await page.screenshot({ path: `${OUT}/viewer-gear.png` });
    await page.getByRole('button', { name: 'Reset view' }).click();
    await page.waitForTimeout(1600);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    record('viewer: Escape closes and disposes its canvas', (await page.locator('canvas').count()) === 1);
    record('home flow: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }

  // 3. Globe
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = watch(page);
    await page.goto(BASE + '/destinations');
    await page.waitForTimeout(8000);
    await page.getByRole('option', { name: /Tokyo/ }).click();
    await page.waitForTimeout(3500);
    record('globe: selecting Tokyo updates URL and panel', page.url().includes('city=tokyo') && (await page.getByRole('heading', { name: 'Tokyo', level: 2 }).count()) >= 1);
    await page.screenshot({ path: `${OUT}/globe-tokyo.png` });
    await page.getByRole('option', { name: /New York/ }).click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/globe-newyork.png` });
    record('globe: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }

  // 4. Booking
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = watch(page);
    await page.goto(BASE + '/booking?to=HND');
    await page.waitForTimeout(1500);
    record('booking: ?to= preselects destination', (await page.locator('#field-destination').inputValue()) === 'HND');
    await page.selectOption('#field-destination', '');
    await page.getByRole('button', { name: 'Search flights' }).click();
    record('booking: validation blocks empty destination', await page.getByText('Select a destination airport.').isVisible());
    await page.selectOption('#field-destination', 'LHR');
    record('booking: origin = destination rejected', await page.getByText('Destination must differ from origin.').isVisible());
    await page.selectOption('#field-destination', 'SIN');
    await page.fill('#field-departDate', '2001-01-01');
    record('booking: past date rejected', await page.getByText('Departure date cannot be in the past.').isVisible());
    const today = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dep = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20);
    const ret = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10);
    await page.fill('#field-departDate', iso(dep));
    await page.waitForTimeout(200);
    const retVal = await page.locator('#field-returnDate').inputValue();
    record('booking: return auto-moves to stay on/after departure', retVal >= iso(dep), `return=${retVal}`);
    await page.fill('#field-returnDate', iso(ret));
    record('booking: return before departure rejected', await page.getByText('Return must be on or after departure.').isVisible());
    await page.fill('#field-returnDate', iso(new Date(dep.getTime() + 7 * 864e5)));
    await page.locator('#field-passengers').click();
    await page.getByRole('button', { name: 'Add one infant' }).click();
    record('booking: infants limited to number of adults', await page.getByRole('button', { name: 'Add one infant' }).isDisabled());
    await page.getByRole('button', { name: 'Add one adult' }).click();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Search flights' }).click();
    await page.waitForSelector('text=Demonstration results', { timeout: 5000 });
    const offers = await page.getByRole('button', { name: 'Select', exact: true }).count();
    record('booking: demo results rendered with clear demo labelling', offers >= 3 && (await page.getByText(/not live availability/).isVisible()), `${offers} offers`);
    await page.getByRole('button', { name: 'Select', exact: true }).first().click();
    record('booking: selection shows no-payment confirmation', await page.getByText(/no payment can be taken/).isVisible());
    await page.screenshot({ path: `${OUT}/booking-results.png`, fullPage: true });
    record('booking: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }

  // 5. Responsive layouts: no horizontal overflow
  for (const [w, h] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 740]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    for (const path of ['/', '/destinations', '/fleet', '/experience', '/booking', '/about']) {
      await page.goto(BASE + path);
      await page.waitForTimeout(path === '/' ? 5000 : 1200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) record(`responsive ${w}px ${path}: no horizontal overflow`, false, `overflow ${overflow}px`);
      if (w <= 390 || w === 1024) await page.screenshot({ path: `${OUT}/responsive-${w}${path.replace(/\//g, '_')}.png` });
    }
    record(`responsive ${w}×${h}: all routes checked for horizontal overflow`, true);
    await page.close();
  }

  // 6. Mobile menu keyboard
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.goto(BASE + '/about');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Open menu' }).click();
    const expanded = await page.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded');
    await page.screenshot({ path: `${OUT}/mobile-menu.png` });
    await page.keyboard.press('Escape');
    const closed = await page.locator('#mobile-menu').isHidden();
    record('mobile menu: opens (aria-expanded) and closes with Escape', expanded === 'true' && closed);
    await page.close();
  }

  // 7. No WebGL fallback
  {
    const b2 = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
    const page = await b2.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = watch(page);
    await page.goto(BASE + '/');
    await page.waitForTimeout(2500);
    record('no-WebGL: home shows illustrated fallback, no canvas', (await page.locator('canvas').count()) === 0 && (await page.getByText(/3D unavailable/).isVisible()));
    record('no-WebGL: headline + CTAs visible', await page.getByRole('link', { name: 'Explore destinations' }).first().isVisible());
    await page.screenshot({ path: `${OUT}/nowebgl-home.png` });
    await page.goto(BASE + '/destinations');
    await page.getByRole('option', { name: /Paris/ }).waitFor({ timeout: 10000 });
    await page.getByRole('option', { name: /Paris/ }).click();
    await page.waitForTimeout(500);
    record('no-WebGL: destinations list still works', (await page.getByRole('heading', { name: 'Paris', level: 2 }).count()) >= 1);
    await page.goto(BASE + '/booking');
    await page.getByRole('button', { name: 'Search flights' }).waitFor({ timeout: 10000 });
    record('no-WebGL: booking form available', await page.getByRole('button', { name: 'Search flights' }).isVisible());
    record('no-WebGL: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await b2.close();
  }

  // 8. Reduced motion
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = watch(page);
    await page.goto(BASE + '/');
    await page.waitForTimeout(1500);
    const op = await page.locator('[data-intro="headline"]').evaluate((el) => getComputedStyle(el).opacity);
    record('reduced motion: content visible immediately (no intro wait)', Number(op) > 0.95, `opacity=${op}`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/reduced-hero.png` });
    record('reduced motion: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }

  // 9. GPU resource disposal: route away from 3D pages repeatedly and check renderer info
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = watch(page);
    await page.goto(BASE + '/destinations');
    await page.waitForTimeout(6000);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('link', { name: 'About' }).first().click();
      await page.waitForTimeout(1200);
      // About has its own 3D banner: exactly one canvas means the globe canvas was disposed.
      record(`disposal cycle ${i + 1}: previous route's canvas disposed`, (await page.locator('canvas').count()) === 1);
      await page.getByRole('link', { name: 'Destinations' }).first().click();
      await page.waitForTimeout(5000);
    }
    record('disposal: no context-loss / console errors across remounts', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }

  // 10. New 3D scenes & generated imagery on secondary pages
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = watch(page);
    await page.goto(BASE + '/experience');
    await page.waitForTimeout(7000);
    record('experience: 3D cabin canvas rendered', (await page.locator('canvas').count()) === 1);
    const imgs = await page.locator('article img').evaluateAll((els) => els.filter((e) => e.complete && e.naturalWidth > 0).length);
    record('experience: 4 cabin images loaded', imgs === 4, `${imgs} loaded`);
    const arts = await page.locator('article').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top + window.scrollY));
    await page.evaluate((y) => window.scrollTo(0, y), arts[2] - 200);
    await page.waitForTimeout(3000);
    record('experience: scrolling switches the 3D zone caption', await page.locator('p', { hasText: '3D concept' }).first().evaluate((el) => /Economy/.test(el.textContent ?? '')));
    await page.screenshot({ path: `${OUT}/experience-economy.png` });
    await page.goto(BASE + '/fleet');
    await page.waitForTimeout(7000);
    record('fleet: 3D showcase canvas rendered', (await page.locator('canvas').count()) === 1);
    await page.getByRole('tab', { name: /AX-1000/ }).click();
    await page.waitForTimeout(2500);
    record('fleet: tab switches showcase aircraft', await page.getByText('Aeronix AX-1000 Sovereign').first().isVisible());
    await page.screenshot({ path: `${OUT}/fleet-showcase.png` });
    for (const path of ['/about', '/booking']) {
      await page.goto(BASE + path);
      await page.waitForTimeout(6000);
      record(`${path}: ambient 3D canvas rendered`, (await page.locator('canvas').count()) === 1);
      await page.screenshot({ path: `${OUT}${path.replace('/', '/3d-')}.png` });
    }
    await page.goto(BASE + '/destinations');
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);
    const dimgs = await page.locator('article img').evaluateAll((els) => els.filter((e) => e.complete && e.naturalWidth > 0).length);
    record('destinations: 8 city images loaded', dimgs === 8, `${dimgs} loaded`);
    record('new 3D pages: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
