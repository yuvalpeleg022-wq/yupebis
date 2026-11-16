// Deterministic frame renderer.
// Usage: node src/render.js --from <s> --to <s> --fps <n> --scale <0-1> --out <dir> [--jpg] [--workers N] [--quality Q]
// Frames are named 00000.jpg … relative to --from. Every frame depends only on t.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const from = +opt('from', 0), to = +opt('to', 79.5), fps = +opt('fps', 30), scale = +opt('scale', 1);
const out = resolve(opt('out', 'cache/frames')), quality = +opt('quality', 92);
const workers = +opt('workers', Math.min(3, Math.max(1, Math.ceil((to - from) * fps / 40))));
mkdirSync(out, { recursive: true });

const here = dirname(fileURLToPath(import.meta.url));
const [pageFile, pageQuery] = (process.env.PAGE || 'index.html').split('?');
const url = pathToFileURL(join(here, pageFile)).href + (pageQuery ? '?' + pageQuery : '');
const n = Math.max(1, Math.round((to - from) * fps));

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security', '--font-render-hinting=none'] });
const t0 = Date.now();
let done = 0;
async function worker(w) {
  const [VW, VH] = (process.env.VIEW || '1080x1920').split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: scale });
  page.on('pageerror', e => console.error('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(url);
  await page.evaluate(() => window.READY);
  if (w === 0 && process.env.EDL_OUT) { const { writeFileSync } = await import('node:fs'); writeFileSync(process.env.EDL_OUT, JSON.stringify(await page.evaluate(() => window.EDL), null, 1)); }
  for (let i = w; i < n; i += workers) {
    const t = from + i / fps;
    await page.evaluate(t => window.renderFrame(t), t);
    await page.screenshot({ path: join(out, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality });
    done++;
    if (done % 60 === 0) console.log(`${done}/${n} frames  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await page.close();
}
await Promise.all(Array.from({ length: workers }, (_, w) => worker(w)));
await browser.close();
console.log(`rendered ${n} frames (${from}s → ${to}s @ ${fps} fps, scale ${scale}) in ${((Date.now() - t0) / 1000).toFixed(1)} s → ${out}`);
