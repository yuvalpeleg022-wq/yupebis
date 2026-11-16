// Spotlight-stage motion graphics (reference style, no faces). ?v=blue|emerald|gold|crimson
(() => {
const W = 1080, H = 1920;
const VKEY = new URLSearchParams(location.search).get('v') || 'brand';
document.body.className = VKEY;
const stage = document.getElementById('stage');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  lin: x => x, out: x => 1 - Math.pow(1 - x, 3), out5: x => 1 - Math.pow(1 - x, 5), in: x => x * x * x, in2: x => x * x,
  io: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), sine: x => .5 - .5 * Math.cos(Math.PI * x),
  expo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  back: x => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  spring: x => (x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(11 * x)),
};
const P = (t, a, b, e = E.out) => e(clamp((t - a) / (b - a)));
function rnd(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const OY = 120; // whole stage sits lower (no presenter in the bottom half)
const css = getComputedStyle(document.body); const cv = n => css.getPropertyValue(n).trim();

// ---------- DOM helpers ----------
function el(tag, cls, parent, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || stage).appendChild(e); return e; }
function at(e, x, y) { e._x = x; e._y = y; return e; }
function tf(e, o) {
  const x = (e._x ?? 540) + (o.x || 0), y = (e._y ?? 960) + (o.y || 0) + (e._noOY ? 0 : OY), s = o.s ?? 1;
  let tr = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
  if (o.z) tr += ` translateZ(${o.z.toFixed(1)}px)`;
  if (o.rx) tr += ` rotateX(${o.rx.toFixed(2)}deg)`; if (o.ry) tr += ` rotateY(${o.ry.toFixed(2)}deg)`; if (o.r) tr += ` rotate(${o.r.toFixed(2)}deg)`;
  tr += ` scale(${(s * (o.sx ?? 1)).toFixed(4)},${(s * (o.sy ?? 1)).toFixed(4)})`;
  e.style.transform = tr; const op = o.o ?? 1; e.style.opacity = op; e.style.visibility = op <= .002 ? 'hidden' : 'visible';
  e.style.filter = o.blur > .05 ? `blur(${o.blur.toFixed(1)}px)` : '';
}
// entrance at t0 (fly in from depth with a spring), exit fade at t1
function IN(e, t, t0, t1, ex = {}) {
  const o = { x: ex.x || 0, y: ex.y || 0, s: ex.s ?? 1, r: ex.r || 0, rx: ex.rx || 0, ry: ex.ry || 0, z: ex.z || 0 };
  if (t < t0 || (t1 != null && t >= t1)) { o.o = 0; tf(e, o); return 0; }
  const d = ex.d ?? .55, k = clamp((t - t0) / d), q = (ex.e || E.spring)(k), ko = t1 == null ? 0 : clamp((t - (t1 - (ex.do ?? .25))) / (ex.do ?? .25));
  const from = ex.from || 'depth';
  if (from === 'depth') { o.s *= lerp(.55, 1, q); o.y += (1 - q) * 70; }
  else if (from === 'up') { o.y += (1 - q) * 260; }
  else if (from === 'down') { o.y -= (1 - q) * 260; }
  else if (from === 'right') { o.x += (1 - q) * 500; o.ry += (1 - q) * -35; }
  else if (from === 'left') { o.x -= (1 - q) * 500; o.ry += (1 - q) * 35; }
  else if (from === 'drop') { o.y -= (1 - E.out(k)) * 900; o.s *= lerp(.85, 1, q); }
  else if (from === 'pop') { o.s *= lerp(.2, 1, E.back(k)); }
  let op = clamp(k * 3.5) * (1 - E.in(ko)); o.blur = (1 - clamp(k * 1.6)) * 14 + ko * 10; o.s *= 1 - ko * .08;
  if (ex.mul != null) op *= ex.mul; o.o = op; tf(e, o); return op;
}
const ICON = {
  check: '<polyline points="4 12.5 9.5 18 20 6.5"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  fork: '<path d="M12 22v-8L5 7M12 14l7-7"/><path d="M5 12V7h5M19 12V7h-5"/>',
  x: '<circle cx="12" cy="12" r="9.5"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>',
  bulb: '<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.7.5 1.1 1.3 1.1 2.2h5.4c0-.9.4-1.7 1.1-2.2A6.5 6.5 0 0 0 12 2.5z"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12"/>',
  id: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.5"/><path d="M5 16.5c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4M14.5 10h4.5M14.5 13.5h3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.9-3.6 3.4-5.5 6.5-5.5s5.6 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.6c2.6.2 4.4 2 5 5"/>',
  flag: '<path d="M5 22V3.5"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  comment: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.3-4.6A8.5 8.5 0 1 1 21 11.5z"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.4-9C1.2 8.2 3.3 4.5 7 4.5c2.1 0 3.4 1.2 5 3.1 1.6-1.9 2.9-3.1 5-3.1 3.7 0 5.8 3.7 4.4 7-1.9 4.4-9.4 9-9.4 9z"/>',
  userplus: '<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 3.8-6 7-6s6 2 7 6"/><path d="M19 7v6M16 10h6"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  eye: '<path d="M1.5 12S5.4 4.5 12 4.5 22.5 12 22.5 12 18.6 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/><path d="M16 7h4v4"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/><path d="M9.5 13.5h3v5M9.5 18.5h5"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.6"/>',
  noform: '<rect x="5" y="4" width="14" height="17.5" rx="2"/><path d="M9 4V2.5h6V4M8.5 10h7M8.5 14h4"/><path d="M2.5 2.5l19 19"/>',
  user: '<circle cx="12" cy="8" r="4.2"/><path d="M3.5 21.5c1.2-4.4 4.4-6.7 8.5-6.7s7.3 2.3 8.5 6.7"/>',
  doc: '<path d="M6 2.5h8l4.5 4.5v14.5H6z"/><path d="M14 2.5V7h4.5M8.5 11h7M8.5 14.5h7M8.5 18h4.5"/>',
  play: '<rect x="2.5" y="4" width="19" height="16" rx="3"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>',
  camera: '<rect x="2.5" y="6.5" width="13" height="11" rx="2"/><path d="M15.5 10.5l6-3.5v10l-6-3.5"/>',
  down: '<path d="M5 8l7 7 7-7"/>', star: '<path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.5 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z"/>',
};
const svgI = (name, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%">${ICON[name]}</svg>`;

// ---------- media pools (no faces: masked heroes + faceless stock) ----------
const HERO = (tag, i = 0) => { const l = (A.heroes || {})[tag]; return l && l.length ? l[i % l.length] : null; };
const MASKED = [A.doom_galaxy, HERO('ironman', 0), HERO('spiderman', 1), HERO('spiderman', 2), HERO('blackpanther', 0), HERO('blackpanther', 1), A.doom_nycc22, A.doom_pax, A.doom_galaxy2, HERO('thanos', 0), A.doom_nycc12, HERO('capamerica', 0)].filter(Boolean);
const STOCK = Object.values(A.stock || {});
const MIX = []; for (let i = 0; i < Math.max(MASKED.length, STOCK.length); i++) { if (STOCK[i]) MIX.push(STOCK[i]); if (MASKED[i]) MIX.push(MASKED[i]); }
const POSTS = A.posts || [];
const S = k => (A.stock || {})[k] || MIX[0];
function tblock(parent, tag, text, x, y, size) { const b = el('div', 'tblock', parent); b.innerHTML = `<div class="tag">${tag}</div><div class="box">${text}</div>`; if (size) b.querySelector('.box').style.fontSize = size + 'px'; at(b, x, y); tf(b, { o: 0 }); return b; }
function post(parent, src, x, y, w = 520) { const d = el('div', 'post', parent); d.style.width = w + 'px'; d.innerHTML = `<img src="${src}">`; at(d, x, y); tf(d, { o: 0 }); return d; }
function thumb(parent, src, x, y, w = 150, h = 220) { const d = el('div', 'thumb', parent); d.innerHTML = `<img src="${src}">`; d.style.width = w + 'px'; d.style.height = h + 'px'; at(d, x, y); tf(d, { o: 0 }); return d; }
function okBadge(parent) { const b = el('div', 'ok', parent); b.innerHTML = svgI('check', 3.2); b.style.transform = 'scale(0)'; return b; }
const popScale = (t, t0) => (t < t0 ? 0 : E.back(clamp((t - t0) / .32)));

// ---------- background: gradient + spotlight beam + dust + floor ----------
const bg = document.getElementById('bg').getContext('2d');
const BEAM = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const rgb = cv('--beam');
  g.filter = 'blur(38px)'; const grad = g.createLinearGradient(0, -80, 0, 1500); grad.addColorStop(0, `rgba(${rgb},.75)`); grad.addColorStop(.35, `rgba(${rgb},.32)`); grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad; g.beginPath(); g.moveTo(470, -80); g.lineTo(610, -80); g.lineTo(1000, 1500); g.lineTo(80, 1500); g.closePath(); g.fill();
  const core = g.createLinearGradient(0, -80, 0, 1100); core.addColorStop(0, `rgba(255,255,255,.45)`); core.addColorStop(1, `rgba(255,255,255,0)`);
  g.fillStyle = core; g.beginPath(); g.moveTo(515, -80); g.lineTo(565, -80); g.lineTo(760, 1100); g.lineTo(320, 1100); g.closePath(); g.fill(); g.filter = 'none'; return c; })();
const dustSprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; })();
const DUST = Array.from({ length: 90 }, (_, i) => { const r = rnd(300 + i * 7); return { y: r() * 1500, u: r(), sp: 8 + r() * 26, sz: 3 + r() * 9, ph: r() * 6.28, a: .2 + r() * .5 }; });
function beamLevel(t) { // spotlight intensity / width over the piece
  let a = .85, w = 1; if (t < .7) { a = t < .12 ? 0 : (t < .2 ? .5 : t < .28 ? .1 : P(t, .3, .7)); }
  if (t > 59.9 && t < 65.2) { w = lerp(1, .55, P(t, 59.9, 60.6, E.io)) ; a = 1.0; if (t > 62.31) w = lerp(.55, 1, P(t, 62.31, 63.2, E.io)); }
  if (t > 28.4 && t < 29.4) a = .85 + .4 * Math.sin(P(t, 28.4, 29.4) * Math.PI);
  if (t > 79.0) a *= 1 - P(t, 79.0, 79.5);
  return { a, w };
}
function drawBG(t) {
  const g = bg; g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const rad = g.createRadialGradient(540, 260, 0, 540, 300, 1750); rad.addColorStop(0, cv('--c0')); rad.addColorStop(.38, cv('--c1')); rad.addColorStop(.72, cv('--c2')); rad.addColorStop(1, cv('--c3'));
  g.fillStyle = rad; g.fillRect(0, 0, W, H);
  const { a, w } = beamLevel(t);
  g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.save(); g.translate(540, 0); g.scale(w, 1); g.translate(-540, 0); g.drawImage(BEAM, 0, 0); g.restore();
  // dust motes inside the beam
  g.globalAlpha = 1;
  for (const d of DUST) { const y = ((d.y - t * d.sp) % 1500 + 1500) % 1500; const half = lerp(60, 470, y / 1500) * w; const x = 540 + (d.u * 2 - 1) * half + Math.sin(t * .6 + d.ph) * 14;
    g.globalAlpha = d.a * a * (.6 + .4 * Math.sin(t * 1.3 + d.ph * 3)); g.drawImage(dustSprite, x - d.sz / 2, y - d.sz / 2, d.sz, d.sz); }
  // floor pool of light
  g.globalAlpha = .55 * a; g.save(); g.translate(540, 1215 + OY); g.scale(1, .16); const fl = g.createRadialGradient(0, 0, 0, 0, 0, 560 * w); fl.addColorStop(0, `rgba(${cv('--beam')},.55)`); fl.addColorStop(1, `rgba(${cv('--beam')},0)`);
  g.fillStyle = fl; g.beginPath(); g.arc(0, 0, 560 * w, 0, 6.2832); g.fill(); g.restore();
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const vg = g.createRadialGradient(540, 860, 500, 540, 900, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// ---------- FX: bursts, rings, confetti ----------
const fxc = document.getElementById('fx').getContext('2d');
const spark = (() => { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, `rgba(${cv('--beam')},.8)`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); return c; })();
const BURSTS = [], RINGS = [], CONF = [];
function HIT(t, x, y0, o = {}) { const y = y0 + OY; if (o.n !== 0) BURSTS.push({ t, x, y, n: o.n ?? 40, sp: o.sp ?? 420, life: o.life ?? .9, seed: Math.round(t * 997) }); if (o.R !== 0) RINGS.push({ t, x, y, R: o.R ?? 360, life: o.rl ?? .6 }); }
function drawFX(t) {
  fxc.clearRect(0, 0, W, H); fxc.globalCompositeOperation = 'lighter';
  for (const b of BURSTS) { const dt = t - b.t; if (dt < 0 || dt > b.life) continue; const r = rnd(b.seed), k = dt / b.life;
    for (let i = 0; i < b.n; i++) { const ang = r() * 6.2832, sp = b.sp * (.3 + r() * .8), sz = 6 + r() * 18, d = sp * E.out(Math.min(1, dt / (b.life * .8)));
      fxc.globalAlpha = (1 - k) * (.5 + r() * .5); fxc.drawImage(spark, b.x + Math.cos(ang) * d - sz / 2, b.y + Math.sin(ang) * d + 90 * k * k - sz / 2, sz, sz); } }
  fxc.globalAlpha = 1; fxc.globalCompositeOperation = 'source-over';
  for (const g of RINGS) { const dt = t - g.t; if (dt < 0 || dt > g.life) continue; const k = dt / g.life;
    fxc.strokeStyle = `rgba(255,255,255,${(1 - k) * .8})`; fxc.lineWidth = 7 * (1 - k) + 1; fxc.beginPath(); fxc.arc(g.x, g.y, 40 + g.R * E.out(k), 0, 6.2832); fxc.stroke(); }
  const acc = cv('--acc');
  for (const c of CONF) { const dt = t - c.t; if (dt < 0 || dt > 2.4) continue; const r = rnd(c.seed);
    for (let i = 0; i < c.n; i++) { const ang = -Math.PI / 2 + (r() - .5) * 2.4, v = 700 + r() * 900, rot = r() * 6, w = 10 + r() * 16, h = 6 + r() * 10, col = r() < .5 ? acc : (r() < .5 ? '#ffffff' : '#9ec5ff');
      const x = c.x + Math.cos(ang) * v * dt, y = c.y + Math.sin(ang) * v * dt + 900 * dt * dt; fxc.save(); fxc.translate(x, y); fxc.rotate(rot + dt * 8 * (r() - .5)); fxc.globalAlpha = clamp(2.4 - dt); fxc.fillStyle = col; fxc.fillRect(-w / 2, -h / 2, w, h * Math.abs(Math.cos(dt * 9 + rot))); fxc.restore(); } }
  fxc.globalAlpha = 1;
}
const FLASH = []; const flashEl = document.getElementById('flash');
const PUNCH = [];
function world(t) { let s = 1, x = 0, y = 0; for (const p of PUNCH) { const dt = t - p.t; if (dt < 0 || dt > .5) continue; const q = Math.pow(1 - dt / .5, 2) * p.a; s += .035 * q; x += Math.sin(dt * 80 + p.t) * 12 * q; y += Math.cos(dt * 60) * 12 * q; }
  document.getElementById('world').style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`;
  let fa = 0; for (const f of FLASH) { const dt = t - f.t; if (dt < 0 || dt > f.d) continue; fa = Math.max(fa, f.a * Math.pow(1 - dt / f.d, 2)); } flashEl.style.opacity = fa; }
const BIG = (t, x, y, o = {}) => { HIT(t, x, y, o); PUNCH.push({ t, a: o.punch ?? 1 }); if (o.flash) FLASH.push({ t, a: o.flash, d: .3 }); };

// ---------- scenes ----------
const SC = []; function scene(t0, t1, build) { const root = el('div', 'scene'); const s = { t0, t1, root }; s.update = build(root, s); SC.push(s); }
function coin(parent, size) { const c = el('div', 'coin', parent); c.style.width = c.style.height = size + 'px'; c.innerHTML = `<img src="${A.logo}">`; tf(c, { o: 0 }); return c; }
function x3d(parent, text, cls, x, y) { const e = el('div', 'abs x3d ' + cls, parent); e.textContent = text; at(e, x, y); tf(e, { o: 0 }); return e; }
function pill(parent, text, x, y, dark) { const e = el('div', 'pill' + (dark ? ' dark' : ''), parent); e.textContent = text; at(e, x, y); tf(e, { o: 0 }); return e; }
function card(parent, ic, text, x, y, w = 360, h = 300) { const c = el('div', 'card', parent); c.style.width = w + 'px'; c.style.height = h + 'px'; c.innerHTML = `<div class="ic">${svgI(ic, 2)}</div><div class="tx">${text}</div>`; at(c, x, y); tf(c, { o: 0 }); return c; }
const CAPHIDE = [];

// S1 — spotlight on, the logo drops into the light (0 – 3.83)
scene(0, 3.83, r => {
  const c = coin(r, 440); at(c, 540, 620);
  const p = pill(r, 'הקורס', 540, 960);
  return t => {
    const k = P(t, .55, 1.03, E.in2), land = P(t, 1.03, 1.6, E.spring);
    const y = t < 1.03 ? lerp(-500, 0, k) : 0, sq = t >= 1.03 ? 1 + .1 * Math.sin(Math.PI * clamp((t - 1.03) / .22)) * (1 - clamp((t - 1.03) / .4)) : 1;
    const flip = (t - .55) * 1.2; tf(c, { o: t < .55 ? 0 : 1, y: y - 10 * Math.sin(t * 2), sx: Math.cos(Math.min(flip, 2 * Math.PI) * (t < 1.03 ? 1 : 0)) || 1, sy: 1 / sq, s: 1 });
    IN(p, t, 2.87, null, { from: 'pop' });
  };
});
BIG(1.03, 540, 620, { n: 60, R: 460, flash: .35 }); CAPHIDE.push([0, 1.2]);

// S2 — profile: 0 → 1000 followers in under half a year (3.83 – 10.75)
scene(3.83, 10.75, r => {
  const ph = el('div', 'phone', r); at(ph, 540, 820);
  const grid = [...POSTS, ...MASKED].slice(0, 9).map(s => `<img src="${s}">`).join('');
  ph.innerHTML = `<div class="hd"><img class="av" src="${A.logo}"><div class="st"><div><b>48</b><span>פוסטים</span></div><div><b class="fol ltr">0</b><span>עוקבים</span></div></div></div><div class="nm">מארוול גיקים</div><div class="gr">${grid}</div>`;
  tf(ph, { o: 0 }); const fol = ph.querySelector('.fol');
  const big = x3d(r, '0', 'big ltr', 540, 360);
  const cal = el('div', 'glass', r); cal.style.width = '300px'; cal.style.height = '230px'; at(cal, 880, 600);
  cal.innerHTML = `<div style="padding:26px;color:#fff;text-align:center"><div style="width:70px;height:70px;margin:0 auto;color:${cv('--acc')}">${svgI('calendar')}</div><div style="font:800 40px Heebo;margin-top:8px">< 6 חודשים</div><div style="height:12px;border-radius:12px;background:rgba(255,255,255,.2);margin-top:14px;overflow:hidden"><div class="bar" style="height:100%;width:0;background:${cv('--acc')}"></div></div></div>`;
  tf(cal, { o: 0 }); const bar = cal.querySelector('.bar');
  return t => {
    const pk = IN(ph, t, 3.95, null, { from: 'up', d: .8, e: E.out5 });
    const v = t < 7.55 ? 0 : Math.round(1000 * E.out(clamp((t - 7.55) / .8)));
    fol.textContent = v >= 1000 ? '1,000' : String(v);
    big.textContent = v >= 1000 ? '1,000' : String(v);
    IN(big, t, 7.09, null, { from: 'depth', s: v >= 1000 ? .62 + .03 * Math.max(0, 1 - (t - 8.35) / .3) : .8, y: -40 });
    IN(cal, t, 8.85, null, { from: 'right', ry: -12, r: 4 }); bar.style.width = (45 * P(t, 9.1, 9.7)) + '%';
    if (pk) tf(ph, { o: 1, y: lerp(0, 120, P(t, 7.0, 7.5, E.io)), s: lerp(1, .82, P(t, 7.0, 7.5, E.io)), rx: lerp(0, 8, P(t, 7.0, 7.5)) });
  };
});
BIG(8.35, 540, 360, { n: 70, R: 520 }); CAPHIDE.push([7.09, 8.85]);

// S3 — the path, decisions, mistakes, lessons (10.75 – 16.33)
scene(10.75, 16.33, r => {
  const it = [['route', 'הדרך', 10.95, 300, 470], ['fork', 'ההחלטות', 12.45, 780, 470], ['x', 'הטעויות', 13.91, 300, 830], ['bulb', 'מה למדתי', 14.77, 780, 830]];
  const cs = it.map(([ic, tx, t0, x, y]) => { const c = card(r, ic, tx, x, y, 440, 350); const b = okBadge(c); return { c, b, t0 }; });
  return t => cs.forEach(({ c, b, t0 }, i) => { IN(c, t, t0, null, { from: i % 2 ? 'left' : 'right', rx: 8, r: (i % 2 ? -3 : 3) * (1 - P(t, t0, t0 + .6)) , y: -6 * Math.sin(t * 1.6 + i) }); b.style.transform = `scale(${popScale(t, t0 + .35)})`; });
});
[10.95, 12.45, 13.91, 14.77].forEach((t, i) => HIT(t + .35, [300, 780, 300, 780][i] + 180, [470, 470, 830, 830][i] + 140, { n: 14, R: 90, sp: 160 }));

// chapter helper: extruded number + label + title
function chapter(r, num, title, tTitle, sub) {
  const n = x3d(r, num, 'big ltr', 540, 560); const ti = tblock(r, `פרק ${num}`, title, 540, 930); const su = sub ? pill(r, sub[0], 540, 1150) : null;
  return (t, t0, up = 0) => { IN(n, t, t0 + .02, null, { from: 'drop', s: lerp(1, .5, up), y: -up * 250 }); IN(ti, t, tTitle, null, { from: 'right', s: lerp(1, .6, up), y: -up * 560, ry: 0 }); if (su) IN(su, t, sub[1], null, { from: 'pop' }); };
}
// S4 — chapter 1: the base (16.33 – 22.47)
scene(16.33, 22.47, r => {
  const ch = chapter(r, '1', 'הבסיס', 16.71);
  const rows = [['layout', 'בניית עמוד', 17.87], ['id', 'זהות ברורה', 18.59], ['users', 'קהל יעד מוגדר', 19.45], ['flag', 'מטרה אמיתית', 21.01]].map(([ic, tx, t0], i) => {
    const e = el('div', 'row', r); e.innerHTML = `<div class="ic">${svgI(ic)}</div><div class="tx">${tx}</div><div class="ck">${svgI('check', 3)}</div>`; at(e, 540, 560 + i * 175); tf(e, { o: 0 }); return { e, t0, ck: e.querySelector('.ck') }; });
  return t => { const up = P(t, 17.4, 17.85, E.io); ch(t, 16.37, up);
    rows.forEach(({ e, t0, ck }, i) => { IN(e, t, t0, null, { from: 'right', rx: 6 }); ck.style.transform = `scale(${popScale(t, t0 + .3)})`; }); };
});
BIG(16.71, 540, 860, { n: 50, R: 480 }); CAPHIDE.push([16.3, 17.43]);
[17.87, 18.59, 19.45, 21.01].forEach((t, i) => HIT(t + .3, 880, 560 + i * 175, { n: 10, R: 70, sp: 120 }));

// S5 — chapter 2: content that brings an audience (22.47 – 25.67)
scene(22.47, 25.67, r => { const ch = chapter(r, '2', 'יצירת תוכן', 23.29, ['שמביא קהל', 24.81]); return t => ch(t, 22.5, 0); });
BIG(23.29, 540, 860, { n: 50, R: 480 }); CAPHIDE.push([22.47, 25.67]);

// S6 — content: the most important thing → posts that stop the scroll → share / comment / follow (25.67 – 36.95)
scene(25.67, 36.95, r => {
  const docs = [0, 1, 2].map(i => { const d = el('div', 'card', r); d.style.width = '300px'; d.style.height = '380px';
    d.innerHTML = `<div style="width:220px;height:300px;color:#9aa5b8">${svgI(['doc', 'play', 'camera'][i], 1.4)}</div>`; at(d, 540 + (i - 1) * 250, 640); tf(d, { o: 0 }); return d; });
  const word = x3d(r, 'התוכן', 'big', 540, 640); word.style.fontSize = '300px';
  const ph = el('div', 'phone', r); at(ph, 540, 760); const feed = el('div', '', ph); feed.style.cssText = 'position:absolute;left:0;top:0;width:100%';
  const posts = [MIX[0], POSTS[0], MIX[2], MIX[3], POSTS[3], MIX[5], POSTS[1], MIX[7], POSTS[2], MIX[9], MIX[10], MIX[11]].filter(Boolean); feed.innerHTML = posts.map(p => `<div style="padding:18px 18px 8px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><img src="${A.logo}" style="width:54px;height:54px;border-radius:50%"><b style="font:800 26px Heebo">מארוול גיקים</b></div><img src="${p}" style="width:100%;height:440px;object-fit:cover;border-radius:18px;display:block"><div style="display:flex;gap:22px;margin-top:12px;color:#fff;height:44px"><div style="width:44px">${svgI('heart')}</div><div style="width:44px">${svgI('comment')}</div><div style="width:44px">${svgI('share')}</div></div></div>`).join('');
  tf(ph, { o: 0 }); const POST = 18 + 54 + 12 + 440 + 12 + 44 + 8;
  const chips = [['טריילרים', 215, 430], ['תיאוריות', 870, 560], ['חדשות מארוול', 200, 820], ['דירוגים', 880, 980], ['השוואות', 230, 1130]].map(([tx, x, y]) => pill(r, tx, x, y));
  const btns = [['share', 'שיתופים', 810, 35.25], ['comment', 'תגובות', 540, 35.75], ['userplus', 'עוקבים', 270, 36.21]].map(([ic, tx, x, t0]) => { const b = el('div', 'btn', r); b.innerHTML = svgI(ic) + `<div class="n">${tx}</div>`; at(b, x, 1050); tf(b, { o: 0 }); return { b, t0, ic }; });
  return t => {
    docs.forEach((d, i) => IN(d, t, 25.9 + i * .35, 28.7, { from: 'up', r: (i - 1) * 8, rx: 10, y: -10 * Math.sin(t * 1.5 + i) }));
    IN(word, t, 28.75, 29.45, { from: 'depth', d: .35, e: E.expo });
    const pin = P(t, 29.45, 30.0, E.out5), pout = P(t, 34.45, 34.9, E.io);
    tf(ph, { o: t >= 29.45 ? 1 : 0, y: (1 - pin) * 1300 - pout * 270, rx: (1 - pin) * 20, s: lerp(1, .68, pout) });
    const stopT = 30.93, fast = (stopT - 29.45) * 1900, target = 6 * POST - 40; let sc = t < stopT ? (t - 29.45) * 1900 : lerp(fast, target, E.out5(clamp((t - stopT) / .5)));
    feed.style.transform = `translateY(${(-Math.max(0, sc)).toFixed(1)}px)`; feed.style.filter = t > 29.6 && t < stopT - .05 ? 'blur(4px)' : '';
    chips.forEach((c, i) => IN(c, t, 32.97 + i * .11, 34.6, { from: 'pop' }));
    btns.forEach(({ b, t0, ic }) => { IN(b, t, t0, null, { from: 'pop' }); if (ic === 'userplus') { const on = t > 36.5; b.style.background = on ? 'var(--ok)' : ''; b.style.color = on ? '#fff' : ''; if (on !== !!b._on) { b.firstChild.outerHTML = svgI(on ? 'check' : 'userplus', on ? 3 : 2); b._on = on; } } });
  };
});
BIG(28.75, 540, 640, { n: 80, R: 600, flash: .45 }); CAPHIDE.push([28.7, 29.45], [35.2, 37.17]);
HIT(30.93, 540, 760, { n: 0, R: 500 }); [35.25, 35.75, 36.21, 36.5].forEach((t, i) => HIT(t + .1, [810, 540, 270, 270][i], 1050, { n: 14, R: 120, sp: 180 }));

// S7 — how I approached content: thumbnails orbit the logo, form a grid, all turn into checks (36.95 – 42.95)
scene(36.95, 42.95, r => {
  const c = coin(r, 260); at(c, 540, 720);
  const big = POSTS.map((p, i) => post(r, p, 540, 720, 470));
  const N = 16; const TS = [...POSTS, ...MIX]; const th = Array.from({ length: N }, (_, i) => { const d = thumb(r, TS[i % TS.length], 540, 720, 130, 190); const b = okBadge(d); return { d, b }; });
  return t => {
    IN(c, t, 37.0, null, { from: 'depth', s: (1 + .12 * P(t, 39.39, 39.7, E.back) - .12 * P(t, 39.7, 40.2)) * .8, y: -430 });
    big.forEach((d, i) => { const n = big.length, a = (i - (n - 1) / 2); const t0 = 37.17 + i * .22; const out = P(t, 40.3, 40.75, E.io);
      IN(d, t, t0, null, { from: 'up', x: a * 230 * (1 - out), y: Math.abs(a) * 40 - 10 * Math.sin(t * 1.6 + i) - out * 60, r: a * 7 * (1 - out), ry: -a * 10 * (1 - out), z: -Math.abs(a) * 60, s: lerp(1, .25, out), mul: 1 - out }); });
    th.forEach(({ d, b }, i) => {
      const t0 = 40.45 + i * .03; if (t < t0) { tf(d, { o: 0 }); return; }
      const a = i / N * 6.2832 + (t - 37) * .35;
      const ring = { x: Math.cos(a) * 400, y: Math.sin(a) * 300 * .9, ry: Math.cos(a) * 25 }; const thumbsSrc = 0;
      const gi = i % 4, gj = Math.floor(i / 4); const grid = { x: (gi - 1.5) * 165, y: (gj - 1.5) * 225 + 0, ry: 0 };
      const m = P(t, 40.5, 41.2, E.io); const k = P(t, t0, t0 + .5, E.spring);
      tf(d, { o: clamp((t - t0) / .15) , x: lerp(0, lerp(ring.x, grid.x, m), k), y: lerp(0, lerp(ring.y, grid.y, m), k), ry: lerp(ring.ry, 0, m), s: lerp(.3, 1, k) * (1 - .15 * m), z: lerp(ring.y * -.2, 0, m) });
      b.style.transform = `scale(${popScale(t, 41.75 + i * .035)})`;
    });
    if (t > 40.6) tf(c, { o: 1 - P(t, 40.6, 41.0) });
  };
});
HIT(39.42, 540, 720, { n: 40, R: 380 }); [41.75, 42.2].forEach(t => HIT(t, 540, 720, { n: 30, R: 500, sp: 500 }));

// S8 — chapter 3, then one small page → a community of 1000 (42.95 – 49.25)
scene(42.95, 49.25, r => {
  const ch = chapter(r, '3', 'הדרך לצמיחה', 44.03);
  const one = el('div', 'tile', r); one.innerHTML = svgI('user'); at(one, 540, 720); tf(one, { o: 0 });
  const NX = 9, NY = 9; const tiles = []; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const d = el('div', 'thumb', r); const k = j * NX + i; d.style.width = '96px'; d.style.height = '96px'; d.style.borderRadius = '20px';
    d.innerHTML = k % 3 === 0 ? `<img src="${MIX[k % MIX.length]}">` : `<div style="width:100%;height:100%;background:linear-gradient(180deg,#fff,#e6ebf3);color:${cv('--acc')};display:grid;place-items:center"><div style="width:58px;height:58px">${svgI('user')}</div></div>`;
    at(d, 540 + (i - 4) * 108, 720 + (j - 4) * 108); tf(d, { o: 0 }); tiles.push({ d, i, j, k }); }
  const cnt = pill(r, '1', 540, 1220); cnt.style.fontSize = '64px';
  return t => {
    const out = P(t, 44.8, 45.1); if (t < 45.1) ch(t, 43.0, 0); r.querySelectorAll('.x3d,.pill.dark').forEach(e => { if (t > 44.8) e.style.opacity = String(1 - out); });
    IN(one, t, 45.3, 46.95, { from: 'pop' });
    tiles.forEach(({ d, i, j }) => { const dist = Math.hypot(i - 4, j - 4), t0 = 46.93 + dist * .07; if (t < t0) { tf(d, { o: 0 }); return; } const k = P(t, t0, t0 + .45, E.spring); tf(d, { o: clamp((t - t0) / .12), s: lerp(.2, 1, k), x: 0, y: 0, rx: 10 * Math.sin((t - t0) * 3 + i) * (1 - k) }); });
    const v = t < 46.93 ? 1 : Math.round(1 + 999 * E.out(clamp((t - 46.93) / 1.0))); cnt.textContent = (v >= 1000 ? '1,000' : v) + ' עוקבים'; IN(cnt, t, 46.3, null, { from: 'pop' });
  };
});
BIG(44.03, 540, 860, { n: 50, R: 480 }); BIG(46.93, 540, 720, { n: 90, R: 700, punch: .6 }); CAPHIDE.push([43.1, 45.01], [46.9, 49.25]);

// S9 — the last chapter: five pillars on a shelf (49.25 – 55.1)
scene(49.25, 55.1, r => {
  const head = pill(r, 'הפרק האחרון', 540, 380, true);
  const items = [['repeat', 'עקביות', 50.73], ['eye', 'חשיפה', 51.19], ['link', 'שיתופי פעולה', 51.87], ['users', 'הבנת הקהל', 52.91], ['chart', 'ניתוח הביצועים', 53.69]];
  const tiles = items.map(([ic], i) => { const d = el('div', 'tile', r); d.innerHTML = svgI(ic); d.style.width = d.style.height = '160px'; at(d, 900 - i * 180, 640); tf(d, { o: 0 }); return d; });
  const shelf = el('div', 'abs', r); shelf.style.cssText += 'width:960px;height:14px;border-radius:14px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.45),rgba(255,255,255,.05))'; at(shelf, 540, 740); tf(shelf, { o: 0 });
  const labels = items.map(([, tx]) => { const e = x3d(r, tx, 'sm', 540, 960); e.style.fontSize = '120px'; return e; });
  return t => {
    IN(head, t, 49.31, null, { from: 'depth' }); IN(shelf, t, 49.4, null, { from: 'depth' });
    tiles.forEach((d, i) => { const t0 = 49.5 + i * .09; IN(d, t, t0, null, { from: 'drop', d: .6, y: -6 * Math.sin(t * 2 + i) }); d.classList.toggle('on', t >= items[i][2]); });
    labels.forEach((e, i) => IN(e, t, items[i][2], items[i + 1]?.[2] ?? 55.05, { from: 'depth', d: .35 }));
  };
});
[50.73, 51.19, 51.87, 52.91, 53.69].forEach((t, i) => HIT(t + .05, 900 - i * 180, 640, { n: 16, R: 110, sp: 200 })); CAPHIDE.push([50.6, 55.07]);

// S10 — insights from my path → your page (55.1 – 59.95)
scene(55.1, 59.95, r => {
  const bulb = card(r, 'bulb', 'תובנות', 540, 470, 300, 280);
  const mine = coin(r, 250); at(mine, 800, 900); const ml = pill(r, 'הדרך שלי', 800, 1110, true);
  const yours = el('div', 'tile', r); yours.innerHTML = svgI('user'); yours.style.width = yours.style.height = '250px'; yours.style.borderRadius = '50%'; at(yours, 280, 900); tf(yours, { o: 0 }); const yl = pill(r, 'העמוד שלכם', 280, 1110, true);
  const dots = Array.from({ length: 7 }, () => { const d = el('div', 'abs', r); d.style.cssText += `width:26px;height:26px;border-radius:50%;background:${cv('--acc')};box-shadow:0 0 18px ${cv('--acc')}`; at(d, 540, 900); tf(d, { o: 0 }); return d; });
  return t => {
    IN(bulb, t, 55.93, null, { from: 'drop', y: -8 * Math.sin(t * 2) }); IN(mine, t, 56.6, null, { from: 'pop' }); IN(ml, t, 56.93, null, { from: 'depth' });
    IN(yours, t, 57.53, null, { from: 'pop' }); IN(yl, t, 59.13, null, { from: 'depth' });
    dots.forEach((d, i) => { const ph = ((t - 57.7) * .9 + i / dots.length) % 1; tf(d, { o: t > 57.7 ? Math.sin(ph * Math.PI) : 0, x: lerp(120, -120, ph) * 2.1, y: -Math.sin(ph * Math.PI) * 90 }); });
  };
});
HIT(55.95, 540, 470, { n: 30, R: 260 });

// S11 — every big page starts at 0 (59.95 – 65.21)
scene(59.95, 65.21, r => {
  const zero = x3d(r, '0', 'big ltr', 540, 640); zero.style.fontSize = '560px';
  const p1 = pill(r, 'כל עמוד גדול מתחיל מ-', 540, 1060, true);
  const q = x3d(r, '?', 'big ltr', 540, 640); q.style.fontSize = '480px';
  return t => {
    IN(p1, t, 61.07, 62.65, { from: 'depth' });
    IN(zero, t, 62.31, 63.3, { from: 'drop', d: .35, e: E.expo, y: -10 * Math.sin(t * 2) });
    IN(q, t, 63.37, null, { from: 'depth', ry: 14 * Math.sin(t * 1.4), y: -8 * Math.sin(t * 2) });
  };
});
BIG(62.31, 540, 640, { n: 100, R: 700, flash: .55, punch: 1.3 }); CAPHIDE.push([62.05, 63.3]);

// S12 — yalla! a course every two days, free, no sign-up (65.21 – 71.5)
scene(65.21, 71.5, r => {
  const ya = tblock(r, 'מבזק', 'יאללה מתחילים!', 540, 640, 118);
  const cs = [['calendar', 'כל יומיים', 67.13, 850], ['tag', 'חינם לגמרי', 69.55, 540], ['noform', 'ללא הרשמה', 70.47, 230]].map(([ic, tx, t0, x]) => { const c = card(r, ic, tx, x, 780, 270, 300); c.querySelector('.tx').style.fontSize = '44px'; const b = okBadge(c); return { c, b, t0 }; });
  const head = pill(r, 'קורס חדש', 540, 470);
  return t => {
    IN(ya, t, 65.21, 66.6, { from: 'depth', d: .35, e: E.expo });
    IN(head, t, 67.13, null, { from: 'pop' });
    cs.forEach(({ c, b, t0 }) => { IN(c, t, t0, null, { from: 'up', rx: 8, y: -6 * Math.sin(t * 1.8 + t0) }); b.style.transform = `scale(${popScale(t, t0 + .35)})`; });
  };
});
BIG(65.21, 540, 640, { n: 90, R: 700, flash: .4, punch: 1.2 }); CONF.push({ t: 65.25, x: 540, y: 900, n: 120, seed: 77 }); CAPHIDE.push([65.21, 66.6]);
[67.13, 69.55, 70.47].forEach((t, i) => HIT(t + .35, [850, 540, 230][i] + 115, 900, { n: 12, R: 90, sp: 150 }));

// S13 — finale: logo, let's go, lockup + chevrons (71.5 – 79.6)
scene(71.5, 79.6, r => {
  const c = coin(r, 420); at(c, 540, 620);
  const l1 = x3d(r, 'בואו נתחיל!', 'mid', 540, 1010); l1.style.fontSize = '150px';
  const l2 = x3d(r, 'תהיו איתנים', 'mid', 540, 1010); l2.style.fontSize = '150px';
  const l3 = x3d(r, 'ואנחנו עושים את זה', 'mid', 540, 1010); l3.style.fontSize = '104px';
  const nm = x3d(r, 'מארוול גיקים', 'mid', 540, 1000); nm.style.fontSize = '150px';
  const sub = pill(r, 'קורס חדש כל יומיים · חינם', 540, 1180);
  const chev = [0, 1, 2].map(i => { const d = el('div', 'abs', r); d.innerHTML = svgI('down', 3); d.style.cssText += 'width:110px;height:110px;color:#fff'; at(d, 540, 1330 + i * 52); tf(d, { o: 0 }); return d; });
  return t => {
    const k = P(t, 71.5, 71.95, E.spring); tf(c, { o: clamp((t - 71.5) / .1), s: lerp(.4, 1, k), sx: Math.cos(Math.max(0, 1 - P(t, 71.5, 72.2)) * Math.PI * 2), y: -10 * Math.sin(t * 2) });
    IN(l1, t, 72.17, 73.3, { from: 'depth' }); IN(l2, t, 73.31, 74.9, { from: 'depth' }); IN(l3, t, 74.91, 77.45, { from: 'depth' });
    IN(nm, t, 77.56, null, { from: 'depth', d: .5 }); IN(sub, t, 77.9, null, { from: 'pop' });
    chev.forEach((d, i) => { const t0 = 78.1 + i * .1; const ph = ((t - t0) % .9) / .9; tf(d, { o: t < t0 ? 0 : .35 + .65 * Math.sin(Math.PI * ph), y: 10 * ph }); });
  };
});
BIG(71.6, 540, 620, { n: 80, R: 600, flash: .35 }); BIG(77.57, 540, 1000, { n: 90, R: 700, flash: .3 }); CAPHIDE.push([71.53, 80]);

// ---------- captions: 1–3 word chunks (reference style) ----------
const CH = []; for (const g of CAPTIONS) { const ws = g.words; const n = Math.ceil(ws.length / 3), per = Math.ceil(ws.length / n);
  for (let i = 0; i < ws.length; i += per) { const part = ws.slice(i, i + per), nx = ws[i + per]; CH.push({ s: part[0].s, e: nx ? nx.s : g.e, text: part.map(w => w.w).join(' ') }); } }
const caps = document.getElementById('caps'); const capSpan = el('span', '', caps);
function drawCaps(t) { const c = CH.find(c => t >= c.s && t < c.e); if (!c || CAPHIDE.some(([a, b]) => t >= a && t < b)) { caps.style.visibility = 'hidden'; return; }
  caps.style.visibility = 'visible'; if (capSpan.textContent !== c.text) capSpan.textContent = c.text; const k = clamp((t - c.s) / .12); capSpan.style.transform = `scale(${lerp(1.12, 1, E.out(k))})`; capSpan.style.opacity = E.out(k); }

// ---------- grain ----------
const gc = document.getElementById('grain').getContext('2d'), gimg = gc.createImageData(540, 960);
function drawGrain(t) { const r = rnd(Math.floor(t * 30) * 7919 + 1), d = gimg.data; for (let i = 0; i < d.length; i += 4) { const v = (r() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } gc.putImageData(gimg, 0, 0); }

const tick = document.querySelector('#ticker .tt span'), tickEl = document.getElementById('ticker');
tick.textContent = ('קורס חדש כל יומיים  •  חינם לגמרי  •  ללא הרשמה  •  מ-0 ל-1000 עוקבים  •  עקבו אחרינו  •  ').repeat(4);
function drawTicker(t) { const o = Math.min(P(t, 3.9, 4.4), 1 - P(t, 71.2, 71.5)); tickEl.style.opacity = o; tickEl.style.visibility = o < .01 ? 'hidden' : 'visible'; tick.style.transform = `translateX(${((t * 110) % 1600).toFixed(1)}px)`; }
window.DURATION = 79.5; window.EDL = { shots: [], trans: [] };
window.renderFrame = async t => {
  for (const s of SC) { const on = t >= s.t0 && t < s.t1; s.root.style.display = on ? 'block' : 'none'; if (on) s.update(t); }
  drawBG(t); drawFX(t); world(t); drawCaps(t); drawGrain(t); drawTicker(t);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.READY = (async () => {
  await Promise.all(['400 50px Heebo', '500 50px Heebo', '700 50px Heebo', '800 50px Heebo', '900 50px Heebo'].map(f => document.fonts.load(f, 'אבגדה 0123')));
  await document.fonts.ready;
  await Promise.all([...document.images].filter(i => i.getAttribute('src')).map(i => i.decode().catch(() => console.error('img fail', i.src))));
  return true;
})();
})();
