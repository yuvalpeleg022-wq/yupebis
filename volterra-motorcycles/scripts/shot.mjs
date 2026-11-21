// Quick screenshot helper: node scripts/shot.mjs <url> <out.png> [w] [h] [waitSelector]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, out, w = '1200', h = '800', sel] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
if (sel) await page.waitForSelector(sel, { state: 'attached', timeout: 120000 });
else await page.waitForTimeout(4000);
await page.screenshot({ path: out });
console.log(errors.join('\n') || 'no console errors');
await browser.close();
