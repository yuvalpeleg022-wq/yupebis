/**
 * Regenerates every motorcycle image used by the site straight from the 3D models.
 *
 *   1. npm run dev            (in another terminal)
 *   2. npm run render:stills  (or: node scripts/render-stills.mjs http://localhost:5173)
 *
 * Outputs WebP files to public/images/:
 *   {bike}-{paint}.webp   three-quarter front, one per paint (cards, details, fallbacks)
 *   {bike}-side.webp      side profile (gallery)
 *   {bike}-rear.webp      three-quarter rear (gallery)
 *   {bike}-studio.webp    converted from public/images/raw/{bike}.jpg if present (gallery)
 *   hero-poster.webp      captured from the live hero canvas (instant poster + no-WebGL fallback)
 *
 * Requires Playwright + Chromium (pre-installed in many CI images; otherwise `npx playwright install chromium`).
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'images');
const base = process.argv[2] ?? 'http://localhost:5173';
mkdirSync(out, { recursive: true });

// Read bikes + paints from the data file without a TS toolchain
const src = readFileSync(join(root, 'src/data/motorcycles.ts'), 'utf8');
const bikes = [...src.matchAll(/id: '([a-z0-9-]+)',\n\s+name:/g)].map((m) => m[1]);
const paintsFor = (bike) => {
  const start = src.indexOf(`id: '${bike}'`);
  const block = src.slice(start, src.indexOf('performance:', start));
  return [...block.matchAll(/\{ id: '([a-z0-9-]+)', name:/g)].map((m) => m[1]);
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });

async function still(bike, paint, angle, file) {
  const url = `${base}/still.html?bike=${bike}&angle=${angle}${paint ? `&paint=${paint}` : ''}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('#ready', { state: 'attached', timeout: 180000 });
  await page.waitForTimeout(paint ? 1400 : 300); // let the paint blend settle
  const png = await page.screenshot({ type: 'png' });
  await sharp(png).webp({ quality: 82 }).toFile(join(out, file));
  console.log('✓', file);
}

for (const bike of bikes) {
  for (const paint of paintsFor(bike)) await still(bike, paint, 'front', `${bike}-${paint}.webp`);
  await still(bike, null, 'side', `${bike}-side.webp`);
  await still(bike, null, 'rear', `${bike}-rear.webp`);
  const raw = join(out, 'raw', `${bike.split('-')[0]}.jpg`);
  if (existsSync(raw)) {
    await sharp(raw).resize(1500, 1000, { fit: 'cover' }).webp({ quality: 82 }).toFile(join(out, `${bike}-studio.webp`));
    console.log('✓', `${bike}-studio.webp`);
  }
}

// Hero poster: capture the real hero canvas (reduced motion = the resting camera pose)
const hero = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await hero.emulateMedia({ reducedMotion: 'reduce' });
await hero.goto(base, { waitUntil: 'load' });
await hero.addStyleTag({
  content: '.nav,.hero__content,.hero__vignette,.hero__scroll,.hero__poster{display:none!important}.hero__canvas{opacity:1!important;transition:none!important}',
});
await hero.waitForSelector('.hero__canvas.is-ready', { timeout: 180000 });
await hero.waitForTimeout(1500);
const png = await hero.screenshot({ type: 'png' });
await sharp(png).webp({ quality: 80 }).toFile(join(out, 'hero-poster.webp'));
console.log('✓ hero-poster.webp');

await browser.close();
