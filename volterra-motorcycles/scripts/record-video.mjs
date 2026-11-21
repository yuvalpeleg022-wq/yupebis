/**
 * Records a smooth 40-second walkthrough video of the site, ending on a logo card.
 *
 *   npm run dev                         (terminal 1)
 *   node scripts/record-video.mjs [baseUrl] [out.mp4]
 *
 * Instead of real-time screen capture (choppy on machines without a GPU), the page's
 * clock is virtualised: requestAnimationFrame, performance.now and all CSS
 * animations/transitions are advanced exactly 1/25 s per captured frame. Loading
 * (models, images) happens while time is frozen, so it never shows up in the video.
 * Requires Playwright + ffmpeg.
 */
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:5173';
const outFile = process.argv[3] ?? 'volterra-walkthrough.mp4';
const FPS = 25;
const DT = 1000 / FPS;
const W = 1920;
const H = 1080;
const framesDir = process.env.FRAMES_DIR ?? join(tmpdir(), `volterra-frames-${Date.now()}`);
mkdirSync(framesDir, { recursive: true });

/* ---------- in-page virtual clock + cursor overlay ---------- */
const initScript = () => {
  const realNow = performance.now.bind(performance);
  let now = realNow();
  let queue = [];
  let id = 1e6;
  window.requestAnimationFrame = (cb) => {
    queue.push([++id, cb]);
    return id;
  };
  window.cancelAnimationFrame = (i) => {
    queue = queue.filter((q) => q[0] !== i);
  };
  performance.now = () => now;

  const css = document.createElement('style');
  css.textContent = `*,*::before,*::after{animation-play-state:paused!important}html{scroll-behavior:auto!important}`;
  // init scripts run before <html> exists — attach as soon as it does
  if (document.documentElement) document.documentElement.appendChild(css);
  else
    new MutationObserver((_, o) => {
      if (document.documentElement) {
        document.documentElement.appendChild(css);
        o.disconnect();
      }
    }).observe(document, { childList: true });

  window.__vt = {
    frame(dt, cursor, scrollY) {
      if (scrollY != null) window.scrollTo(0, scrollY);
      // cursor overlay
      let c = document.getElementById('__cursor');
      if (!c) {
        c = document.createElement('div');
        c.id = '__cursor';
        c.innerHTML = `<div class="r"></div><svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2.5l14.5 10.6-6.4 1.1 3.6 7.2-2.9 1.4-3.5-7.3-5.3 4.3z" fill="#fff" stroke="#0a0a0b" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
        c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform';
        const st = document.createElement('style');
        st.textContent = `#__cursor svg{position:absolute;left:-4px;top:-3px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}#__cursor .r{position:absolute;width:44px;height:44px;left:-22px;top:-22px;border-radius:50%;border:2px solid #e3262f;opacity:0}`;
        document.head.appendChild(st);
        document.body.appendChild(c);
      }
      c.style.transform = `translate(${cursor.x}px,${cursor.y}px)`;
      c.style.opacity = cursor.o;
      const ring = c.firstChild;
      ring.style.opacity = cursor.ring > 0 ? String(1 - cursor.ring) : '0';
      ring.style.transform = `scale(${0.4 + cursor.ring * 1.1})`;

      // advance CSS animations / transitions
      for (const a of document.getAnimations()) {
        if (a.id === '__keep') continue;
        try {
          if (a.playState === 'running') a.pause();
          const ct = (a.currentTime ?? 0) + dt;
          const end = a.effect?.getComputedTiming().endTime;
          a.currentTime = Number.isFinite(end) ? Math.min(ct, end) : ct;
          if (Number.isFinite(end) && ct >= end) a.finish();
        } catch {}
      }
      // advance rAF clock
      now += dt;
      const q = queue;
      queue = [];
      for (const [, cb] of q) {
        try {
          cb(now);
        } catch (e) {
          console.error(e);
        }
      }
    },
    endCard(p) {
      let e = document.getElementById('__end');
      if (!e) {
        e = document.createElement('div');
        e.id = '__end';
        e.innerHTML = `
          <div class="inner">
            <div class="mark"><span>V</span><i></i></div>
            <div class="word">VOLTERRA</div>
            <div class="sub">MOTORCYCLES</div>
            <div class="line"></div>
            <div class="tag">Engineered for the long way home.</div>
          </div>`;
        const st = document.createElement('style');
        st.textContent = `
          #__end{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:radial-gradient(ellipse 60% 50% at 50% 55%,#16171b 0%,#0a0a0b 70%);font-family:Archivo,sans-serif;color:#ecebe7}
          #__end .inner{display:flex;flex-direction:column;align-items:center}
          #__end .mark{position:relative;display:grid;place-items:center;width:132px;height:132px;border:2px solid rgba(255,255,255,.22);font-stretch:125%;font-weight:800;font-size:60px}
          #__end .mark i{position:absolute;left:50%;bottom:-2px;height:5px;width:40px;margin-left:-20px;background:#e3262f}
          #__end .word{margin-top:48px;font-stretch:125%;font-weight:700;font-size:96px;line-height:1}
          #__end .sub{margin-top:18px;font-size:20px;font-weight:500;letter-spacing:.6em;padding-left:.6em;color:#a4a4a8}
          #__end .line{margin-top:44px;height:2px;width:220px;background:#e3262f;transform-origin:center}
          #__end .tag{margin-top:34px;font-family:Inter,sans-serif;font-size:22px;color:#a4a4a8}`;
        document.head.appendChild(st);
        document.body.appendChild(e);
      }
      const k = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      e.style.opacity = ease(k(0, 0.18));
      const m = e.querySelector('.mark');
      m.style.opacity = ease(k(0.08, 0.3));
      m.style.transform = `scale(${0.86 + 0.14 * ease(k(0.08, 0.36))})`;
      const w = e.querySelector('.word');
      w.style.opacity = ease(k(0.16, 0.38));
      w.style.letterSpacing = `${0.62 - 0.32 * ease(k(0.16, 0.6))}em`;
      w.style.paddingLeft = w.style.letterSpacing;
      e.querySelector('.sub').style.opacity = ease(k(0.26, 0.46));
      e.querySelector('.line').style.transform = `scaleX(${ease(k(0.32, 0.56))})`;
      e.querySelector('.tag').style.opacity = ease(k(0.42, 0.62));
    },
  };
};

/* ---------- capture engine ---------- */
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('crash', () => console.error('PAGE CRASHED'));
page.on('console', (m) => m.type() === 'error' && !/GPU stall/.test(m.text()) && console.error('console:', m.text()));
await page.addInitScript(initScript);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Animation.enable');
await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
await page.goto(base, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForSelector('.hero__canvas.is-ready', { timeout: 240000 });

let frame = 0;
let scroll = 0;
const cursor = { x: W * 0.62, y: H * 0.55, o: 0, ring: 0 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle() {
  // Everything below happens while virtual time is frozen → invisible in the video
  await page
    .waitForFunction(
      () => {
        const l = document.querySelector('.viewer__loading');
        if (!l) return true;
        const r = l.getBoundingClientRect();
        return r.top > innerHeight * 1.6 || r.bottom < -innerHeight * 0.6; // only matters near the screen
      },
      null,
      { timeout: 240000, polling: 100 }, // rAF polling would stall: rAF is virtualised
    )
    .catch(() => console.warn('viewer still loading'));
  await page
    .waitForFunction(
      () =>
        [...document.images].every((i) => {
          const r = i.getBoundingClientRect();
          const onScreen = r.bottom > 0 && r.top < innerHeight && r.width > 0;
          return !onScreen || i.loading === 'lazy' ? (!onScreen || i.complete) : i.complete;
        }),
      null,
      { timeout: 20000, polling: 100 },
    )
    .catch(() => {});
}
async function capture(endCardP = null) {
  await settle();
  await page.evaluate(([dt, c, y]) => window.__vt.frame(dt, c, y), [DT, cursor, Math.round(scroll)]);
  if (endCardP != null) await page.evaluate((p) => window.__vt.endCard(p), endCardP);
  await page.screenshot({ path: join(framesDir, `f${String(frame).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
  frame++;
  if (frame % 25 === 0) console.log(`  ${frame / FPS}s captured`);
}

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

/** Run a shot of `dur` seconds; fn(t, p) is called before each frame (t seconds, p 0..1). */
async function shot(dur, fn) {
  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await fn(i / FPS, n > 1 ? i / (n - 1) : 1);
    await capture();
  }
}

async function absY(sel, offset = 0) {
  return page.evaluate(
    ([s, o]) => {
      const el = document.querySelector(s);
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      const max = document.documentElement.scrollHeight - innerHeight;
      return Math.min(max, Math.max(0, el.getBoundingClientRect().top + scrollY - nav + o));
    },
    [sel, offset],
  );
}
async function centerOf(sel) {
  return page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, sel);
}
async function scrollShot(dur, toY) {
  const from = scroll;
  await shot(dur, async (_, p) => {
    scroll = lerp(from, toY, easeIO(p));
  });
}
/** Move the visible cursor (and the real mouse, for hover states) along an eased path. */
function moveCursor(from, to, p) {
  const e = easeIO(Math.min(1, p));
  cursor.x = lerp(from.x, to.x, e);
  cursor.y = lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 30;
}
async function click(pt) {
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  await page.mouse.up();
  await sleep(60);
}
/** Cursor travels to `sel` during [t0,t1], clicks at t1; ring animates after. Returns handler. */
function clickAt(target, t0, t1) {
  let start = null;
  let done = false;
  return async (t) => {
    if (t < t0) return;
    if (!start) start = { x: cursor.x, y: cursor.y };
    if (t <= t1) moveCursor(start, target, (t - t0) / (t1 - t0));
    if (t >= t1 && !done) {
      done = true;
      cursor.x = target.x;
      cursor.y = target.y;
      await click(target);
    }
    if (done) cursor.ring = Math.min(1, (t - t1) / 0.45) || 0.001;
    if (cursor.ring >= 1) cursor.ring = 0;
  };
}

console.log('Recording…');

/* 1. Hero — 3.5s: intro animations + slow 3D camera drift, subtle pointer parallax */
await shot(3.5, async (_, p) => {
  await page.mouse.move(lerp(W * 0.55, W * 0.68, p), lerp(H * 0.5, H * 0.42, p));
});

/* 2. Scroll to collection — 2s */
await scrollShot(2, await absY('#motorcycles', 40));

/* 3. Collection filters — 3s */
{
  const adv = await centerOf('.collection__filters button:nth-child(3)');
  const all = await centerOf('.collection__filters button:nth-child(1)');
  const card = await centerOf('.collection__grid > li:nth-child(1) .card__media');
  cursor.x = W * 0.72;
  cursor.y = H * 0.75;
  const c1 = clickAt(adv, 0.15, 0.9);
  const c2 = clickAt(all, 1.5, 2.1);
  await shot(3, async (t) => {
    cursor.o = Math.min(1, t / 0.3);
    await c1(t);
    await c2(t);
    if (t > 2.45) {
      moveCursor(all, card, (t - 2.45) / 0.5);
      await page.mouse.move(cursor.x, cursor.y);
    }
  });
}

/* 4. Scroll to 3D viewer — 2s (centre the viewer block) */
{
  const y = await page.evaluate(() => {
    const v = document.querySelector('.viewer').getBoundingClientRect();
    return Math.max(0, v.top + scrollY - (innerHeight - v.height) / 2 + 20);
  });
  await scrollShot(2, y);
}

/* 5. Viewer — 7.5s: drag-rotate, paints, switch bike, zoom */
{
  const stage = await centerOf('#viewer-stage');
  const sw = (n) => centerOf(`.viewer__paint .swatch:nth-child(${n})`);
  const graphite = await sw(2);
  const amber = await sw(4);
  const ventura = await centerOf('.viewer__tabs button:nth-child(2)');
  const zoom = await centerOf('button[aria-label="Zoom in"]');
  const dragFrom = { x: stage.x + 260, y: stage.y + 40 };
  const dragTo = { x: stage.x - 260, y: stage.y + 10 };
  let dragging = false;
  let start = null;
  const p1 = clickAt(graphite, 2.4, 2.9);
  const p2 = clickAt(amber, 3.4, 3.9);
  const p3 = clickAt(ventura, 4.4, 5.0);
  const z1 = clickAt(zoom, 6.0, 6.5);
  const z2 = clickAt(zoom, 6.85, 7.05);
  await shot(7.5, async (t) => {
    if (t < 0.45) {
      if (!start) start = { x: cursor.x, y: cursor.y };
      moveCursor(start, dragFrom, t / 0.45);
    } else if (t < 2.0) {
      if (!dragging) {
        dragging = true;
        await page.mouse.move(dragFrom.x, dragFrom.y);
        await page.mouse.down();
      }
      const p = (t - 0.45) / 1.55;
      cursor.x = lerp(dragFrom.x, dragTo.x, easeIO(p));
      cursor.y = lerp(dragFrom.y, dragTo.y, easeIO(p));
      await page.mouse.move(cursor.x, cursor.y);
    } else if (dragging) {
      dragging = false;
      await page.mouse.up();
    }
    await p1(t);
    await p2(t);
    await p3(t);
    await z1(t);
    await z2(t);
  });
}

/* 6. Scroll to details — 1.8s */
await scrollShot(1.8, await absY('#details', 0));

/* 7. Details: glide through specs → features → gallery — 2.5s + 2s */
{
  cursor.o = 1;
  const hover = await centerOf('.details__actions .btn-primary');
  const from = { x: cursor.x, y: cursor.y };
  await shot(1.2, async (_, p) => moveCursor(from, hover, p));
  await page.mouse.move(hover.x, hover.y);
  await scrollShot(1.3, await absY('.details__specs', -40));
  await scrollShot(2, await absY('.details__gallery', -260));
}

/* 8. About — 1.6s scroll + 1.4s hold */
await scrollShot(1.6, await absY('#about', 0));
await shot(1.4, async (_, p) => {
  scroll += 0.9; // gentle drift
  cursor.o = 1 - Math.min(1, p * 2);
});

/* 9. Contact form — 1.8s scroll + 4.5s fill & submit */
await scrollShot(1.8, await absY('#contact', 0));
{
  const typeInto = async (sel, text, t, t0, cps) => {
    const n = Math.min(text.length, Math.max(0, Math.floor((t - t0) * cps)));
    const cur = await page.inputValue(sel);
    if (n > cur.length) await page.keyboard.type(text.slice(cur.length, n));
  };
  const name = await centerOf('input[name="fullName"]');
  const email = await centerOf('input[name="email"]');
  const phone = await centerOf('input[name="phone"]');
  const consent = await centerOf('.check__box');
  const submit = await centerOf('button[type="submit"]');
  const cName = clickAt(name, 0, 0.35);
  const cEmail = clickAt(email, 0.95, 1.15);
  const cPhone = clickAt(phone, 1.75, 1.95);
  const cConsent = clickAt(consent, 2.85, 3.1);
  const cSubmit = clickAt(submit, 3.3, 3.55);
  let selected = false;
  await shot(4.5, async (t) => {
    cursor.o = Math.min(1, t / 0.2);
    await cName(t);
    if (t > 0.4 && t < 0.95) await typeInto('input[name="fullName"]', 'Alex Rider', t, 0.4, 20);
    await cEmail(t);
    if (t > 1.2 && t < 1.75) await typeInto('input[name="email"]', 'alex@example.com', t, 1.2, 36);
    await cPhone(t);
    if (t > 2.0 && t < 2.6) await typeInto('input[name="phone"]', '+1 555 010 0199', t, 2.0, 36);
    if (t > 2.65 && !selected) {
      // make sure every field is complete before moving on (typing is frame-quantised)
      for (const [sel, v] of [['input[name="fullName"]', 'Alex Rider'], ['input[name="email"]', 'alex@example.com'], ['input[name="phone"]', '+1 555 010 0199']])
        if ((await page.inputValue(sel)) !== v) await page.fill(sel, v);
      selected = true;
      await page.selectOption('select[name="motorcycleId"]', 'strada-rs');
      const d = new Date();
      d.setDate(d.getDate() + 9);
      await page.fill('input[name="preferredDate"]', d.toISOString().slice(0, 10));
    }
    await cConsent(t);
    await cSubmit(t);
    if (t > 3.57) {
      // demo submit resolves on a real timer; wait for it while time is frozen
      await page.waitForSelector('.testride__success', { timeout: 10000 }).catch(() => {});
    }
  });
}

/* 10. Footer — 2.6s */
{
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const from = scroll;
  await shot(2.6, async (_, p) => {
    scroll = lerp(from, max, easeIO(Math.min(1, p * 1.25)));
    cursor.o = Math.max(0, 1 - p * 3);
  });
}

/* 11. Logo end card — 4s */
{
  const n = 4 * FPS;
  for (let i = 0; i < n; i++) await capture(i / (n - 1));
}

await browser.close();
console.log(`Captured ${frame} frames (${(frame / FPS).toFixed(1)}s). Encoding…`);
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(FPS),
  '-i', join(framesDir, 'f%04d.jpg'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  outFile,
]);
if (!process.env.KEEP_FRAMES) rmSync(framesDir, { recursive: true, force: true });
console.log('✓', outFile);
