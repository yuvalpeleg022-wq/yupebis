// Spotlight-stage motion graphics (reference style, no faces). ?v=blue|emerald|gold|crimson
(() => {
const W = 1920, H = 1080;
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
const OY = 0, KZ = 1.15; // whole stage sits lower (no presenter in the bottom half)
const css = getComputedStyle(document.body); const cv = n => css.getPropertyValue(n).trim();

// ---------- DOM helpers ----------
function el(tag, cls, parent, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || stage).appendChild(e); return e; }
function at(e, x, y) { e._x = x; e._y = y; return e; }
function tf(e, o) {
  const x0 = (e._x ?? 960) + (o.x || 0), y0 = (e._y ?? 470) + (o.y || 0); const z = e._noOY ? 1 : KZ; const x = 960 + (x0 - 960) * z, y = e._noOY ? y0 : 475 + (y0 - 440) * z, s = (o.s ?? 1) * z;
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
  note: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="16" r="1.4"/>',
  warn: '<path d="M12 3 2.5 20.5h19z"/><path d="M12 9.5v5"/><circle cx="12" cy="17.5" r=".6"/>',
  shield: '<path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2.5"/>',
  pen: '<path d="M12 19.5 19.5 12l2 2-7.5 7.5z"/><path d="M18 13.5 16.5 6 3 3l3 13.5 7.5 1.5"/><path d="M3 3l7.6 7.6"/><circle cx="11.5" cy="11.5" r="1.8"/>',
  film: '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M7 4v16M17 4v16M2.5 9h4.5M2.5 15h4.5M17 9h4.5M17 15h4.5"/>',
  tv: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M8 2.5l4 3.5 4-3.5"/>',
  globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5S9.4 5.3 12 2.5z"/>',
  bird: '<path d="M4 5c3.5 3.6 6.7 5.3 10 5.2V9a4 4 0 0 1 7-2.6l1.5-.4-1.3 1.9V9c0 6-4.6 11-11.2 11A11 11 0 0 1 3 18.5c2.6.1 4.6-.5 6.2-1.8C6.4 16.4 4.6 14 4.2 11c.8.1 1.6.1 2.3-.2C4.6 9.9 3.7 7.700 4 5z"/>',
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
  g.filter = 'blur(36px)'; const grad = g.createLinearGradient(0, -60, 0, 1000); grad.addColorStop(0, `rgba(${rgb},.75)`); grad.addColorStop(.35, `rgba(${rgb},.32)`); grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad; g.beginPath(); g.moveTo(880, -60); g.lineTo(1040, -60); g.lineTo(1560, 1000); g.lineTo(360, 1000); g.closePath(); g.fill();
  const core = g.createLinearGradient(0, -60, 0, 760); core.addColorStop(0, `rgba(255,255,255,.45)`); core.addColorStop(1, `rgba(255,255,255,0)`);
  g.fillStyle = core; g.beginPath(); g.moveTo(935, -60); g.lineTo(985, -60); g.lineTo(1220, 760); g.lineTo(700, 760); g.closePath(); g.fill(); g.filter = 'none'; return c; })();
const dustSprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; })();
const DUST = Array.from({ length: 90 }, (_, i) => { const r = rnd(300 + i * 7); return { y: r() * 1000, u: r(), sp: 8 + r() * 26, sz: 3 + r() * 9, ph: r() * 6.28, a: .2 + r() * .5 }; });
function beamLevel(t) { // per-episode spotlight cues from window.BEAMCFG
  const C = window.BEAMCFG || {}; let a = .85, w = 1;
  if (t < .7) a = t < .12 ? 0 : (t < .2 ? .5 : t < .28 ? .1 : P(t, .3, .7));
  for (const [t0, t1] of C.narrow || []) if (t > t0 && t < t1) { w = Math.min(lerp(1, .55, P(t, t0, t0 + .6, E.io)), lerp(.55, 1, P(t, t1 - .6, t1, E.io))); a = 1; }
  for (const pt of C.pulse || []) if (t > pt - .3 && t < pt + .7) a = Math.max(a, .85 + .4 * Math.sin(P(t, pt - .3, pt + .7) * Math.PI));
  if (C.end && t > C.end - .5) a *= 1 - P(t, C.end - .5, C.end);
  return { a, w };
}
function drawBG(t) {
  const g = bg; g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const rad = g.createRadialGradient(960, 160, 0, 960, 220, 1500); rad.addColorStop(0, cv('--c0')); rad.addColorStop(.38, cv('--c1')); rad.addColorStop(.72, cv('--c2')); rad.addColorStop(1, cv('--c3'));
  g.fillStyle = rad; g.fillRect(0, 0, W, H);
  const { a, w } = beamLevel(t);
  g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.save(); g.translate(960, 0); g.scale(w, 1); g.translate(-960, 0); g.drawImage(BEAM, 0, 0); g.restore();
  // dust motes inside the beam
  g.globalAlpha = 1;
  for (const d of DUST) { const y = ((d.y - t * d.sp) % 1000 + 1000) % 1000; const half = lerp(80, 600, y / 1000) * w; const x = 960 + (d.u * 2 - 1) * half + Math.sin(t * .6 + d.ph) * 14;
    g.globalAlpha = d.a * a * (.6 + .4 * Math.sin(t * 1.3 + d.ph * 3)); g.drawImage(dustSprite, x - d.sz / 2, y - d.sz / 2, d.sz, d.sz); }
  // floor pool of light
  g.globalAlpha = .55 * a; g.save(); g.translate(960, 830); g.scale(1, .14); const fl = g.createRadialGradient(0, 0, 0, 0, 0, 820 * w); fl.addColorStop(0, `rgba(${cv('--beam')},.55)`); fl.addColorStop(1, `rgba(${cv('--beam')},0)`);
  g.fillStyle = fl; g.beginPath(); g.arc(0, 0, 820 * w, 0, 6.2832); g.fill(); g.restore();
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const vg = g.createRadialGradient(960, 500, 520, 960, 520, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// ---------- FX: bursts, rings, confetti ----------
const fxc = document.getElementById('fx').getContext('2d');
const spark = (() => { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, `rgba(${cv('--beam')},.8)`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); return c; })();
const BURSTS = [], RINGS = [], CONF = [];
function HIT(t, x0, y0, o = {}) { const x = 960 + (x0 - 960) * KZ, y = 475 + (y0 - 440) * KZ; if (o.n !== 0) BURSTS.push({ t, x, y, n: o.n ?? 40, sp: o.sp ?? 420, life: o.life ?? .9, seed: Math.round(t * 997) }); if (o.R !== 0) RINGS.push({ t, x, y, R: o.R ?? 360, life: o.rl ?? .6 }); }
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
      const x = c.x + Math.cos(ang) * v * .8 * dt, y = c.y + Math.sin(ang) * v * .7 * dt + 700 * dt * dt; fxc.save(); fxc.translate(x, y); fxc.rotate(rot + dt * 8 * (r() - .5)); fxc.globalAlpha = clamp(2.4 - dt); fxc.fillStyle = col; fxc.fillRect(-w / 2, -h / 2, w, h * Math.abs(Math.cos(dt * 9 + rot))); fxc.restore(); } }
  fxc.globalAlpha = 1;
}
const FLASH = []; const flashEl = document.getElementById('flash');
const PUNCH = [];
function world(t) { let s = 1, x = 0, y = 0; for (const p of PUNCH) { const dt = t - p.t; if (dt < 0 || dt > .5) continue; const q = Math.pow(1 - dt / .5, 2) * p.a; s += .035 * q; x += Math.sin(dt * 80 + p.t) * 12 * q; y += Math.cos(dt * 60) * 12 * q; }
  document.getElementById('world').style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`;
  let fa = 0; for (const f of FLASH) { const dt = t - f.t; if (dt < 0 || dt > f.d) continue; fa = Math.max(fa, f.a * Math.pow(1 - dt / f.d, 2)); } flashEl.style.opacity = fa; }
const BIG = (t, x, y, o = {}) => { HIT(t, x, y, o); PUNCH.push({ t, a: o.punch ?? 1 }); if (o.flash) FLASH.push({ t, a: o.flash, d: .3 }); };

// ===== Lesson 1 — "הדרך מתחילה מאפס" (YouTube 16:9, video time = audio + 0.5 s) =====
window.EPDUR = 153.5; window.TICKWIN = [14.6, 149.8];
window.TICKER = 'שיעור 1  •  הדרך מתחילה מאפס  •  מארוול גיקים  •  קורס חדש כל יומיים  •  חינם לגמרי  •  ';
window.BEAMCFG = { pulse: [15.56, 54.9, 82.2, 132.94, 139.66], narrow: [[101.6, 110.0]], end: 153.5 };
const SC = []; function scene(t0, t1, build) { const root = el('div', 'scene'); const s = { t0, t1, root }; s.update = build(root, s); SC.push(s); }
function coin(parent, size) { const c = el('div', 'coin', parent); c.style.width = c.style.height = size + 'px'; c.innerHTML = `<img src="${A.logo}">`; tf(c, { o: 0 }); return c; }
function x3d(parent, text, cls, x, y, fs) { const e = el('div', 'abs x3d ' + cls, parent); e.textContent = text; if (fs) e.style.fontSize = fs + 'px'; at(e, x, y); tf(e, { o: 0 }); return e; }
function pill(parent, text, x, y, dark) { const e = el('div', 'pill' + (dark ? ' dark' : ''), parent); e.textContent = text; at(e, x, y); tf(e, { o: 0 }); return e; }
function card(parent, ic, text, x, y, w = 360, h = 300, fs) { const c = el('div', 'card', parent); c.style.width = w + 'px'; c.style.height = h + 'px'; c.innerHTML = `<div class="ic">${svgI(ic, 2)}</div><div class="tx">${text}</div>`; if (fs) c.querySelector('.tx').style.fontSize = fs + 'px'; at(c, x, y); tf(c, { o: 0 }); return c; }
function row(parent, ic, text, x, y, w = 820, fs) { const e = el('div', 'row', parent); e.style.width = w + 'px'; e.innerHTML = `<div class="ic">${svgI(ic)}</div><div class="tx">${text}</div><div class="ck">${svgI('check', 3)}</div>`; if (fs) e.querySelector('.tx').style.fontSize = fs + 'px'; at(e, x, y); tf(e, { o: 0 }); e._ck = e.querySelector('.ck'); return e; }
function badX(parent) { const b = el('div', 'ok', parent); b.style.background = '#ff4d4d'; b.innerHTML = svgI('x', 0).replace('<circle cx="12" cy="12" r="9.5"/>', '') .replace('stroke-width="0"', 'stroke-width="3.2"'); b.style.transform = 'scale(0)'; return b; }
function tile(parent, ic, x, y, size = 160, round) { const d = el('div', 'tile', parent); d.innerHTML = svgI(ic); d.style.width = d.style.height = size + 'px'; if (round) d.style.borderRadius = '50%'; at(d, x, y); tf(d, { o: 0 }); return d; }
const CAPHIDE = [];
const RED = '#ff4d4d';

// E1 — welcome + thanks (0 – 14.6)
scene(0, 14.6, r => {
  const c = coin(r, 360); at(c, 960, 400);
  const p1 = pill(r, 'שיעור 1', 960, 600), p2 = pill(r, 'הקורס של מארוול גיקים', 960, 690, true);
  const heart = tile(r, 'heart', 960, 420, 230); const hearts = Array.from({ length: 9 }, (_, i) => { const h = el('div', 'abs', r); h.innerHTML = svgI('heart', 0).replace('fill="none"', `fill="${cv('--acc')}"`); h.style.cssText += 'width:60px;height:60px'; at(h, 960 + (i - 4) * 70, 520); tf(h, { o: 0 }); return h; });
  const p3 = pill(r, 'זה לא מובן מאליו', 960, 680);
  return t => {
    const k = P(t, .1, .75, E.in2), y = t < .75 ? lerp(-560, 0, k) : 0, out1 = P(t, 10.6, 11.0);
    tf(c, { o: (t < .1 ? 0 : 1) * (1 - out1), y: y - 8 * Math.sin(t * 2) - out1 * 80, s: 1 - out1 * .3, sx: t < .75 ? Math.cos((t - .1) * 9) || 1 : 1 });
    IN(p1, t, 3.42, 10.9, { from: 'pop' }); IN(p2, t, 5.14, 10.9, { from: 'depth' });
    IN(heart, t, 11.08, 14.4, { from: 'pop', y: -6 * Math.sin(t * 3) }); heart.classList.toggle('on', t > 11.2);
    hearts.forEach((h, i) => { const t0 = 11.2 + i * .12, ph = (t - t0) / 2.2; tf(h, { o: ph < 0 || ph > 1 || t > 14.3 ? 0 : Math.sin(ph * Math.PI), y: -ph * 420, x: Math.sin(ph * 6 + i) * 30, s: .6 + .4 * Math.sin(ph * Math.PI) }); });
    IN(p3, t, 12.28, 14.4, { from: 'pop' });
  };
});
BIG(.75, 960, 400, { n: 50, R: 380, flash: .3 }); HIT(11.08, 960, 420, { n: 40, R: 260 });

// E2 — lesson title (14.6 – 18.4)
scene(14.6, 18.4, r => {
  const n = x3d(r, '1', 'big ltr', 960, 300); const tb = tblock(r, 'שיעור 1', 'הדרך מתחילה מאפס', 960, 660, 104);
  return t => { IN(n, t, 15.4, null, { from: 'drop', d: .5 }); IN(tb, t, 15.88, null, { from: 'right' }); };
});
BIG(15.56, 960, 300, { n: 60, R: 420 }); CAPHIDE.push([14.6, 18.4]);

// E3 — before growth: the story (18.4 – 24.1)
scene(18.4, 24.1, r => {
  const ch = card(r, 'chart', 'איך מגדילים עמוד', 600, 440, 380, 300, 44);
  const c = coin(r, 300); at(c, 1300, 420); const p = pill(r, 'איך הכל התחיל', 1300, 680);
  return t => { IN(ch, t, 19.96, null, { from: 'left', y: -6 * Math.sin(t * 1.6) }); IN(c, t, 21.54, null, { from: 'pop', y: -8 * Math.sin(t * 2) }); IN(p, t, 22.32, null, { from: 'pop' }); };
});

// E4 — TikTok → Instagram (24.1 – 28.5)
scene(24.1, 28.5, r => {
  const a = card(r, 'note', 'טיקטוק', 1320, 430, 340, 320); const b = card(r, 'camera', 'אינסטגרם', 600, 430, 340, 320);
  const arr = el('div', 'abs', r); arr.style.cssText += 'width:300px;height:20px'; at(arr, 960, 430);
  arr.innerHTML = `<svg width="300" height="20"><path class="ln" d="M290 10 H20" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="20 18"/><path d="M40 -6 L10 10 L40 26" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return t => { IN(a, t, 24.94, null, { from: 'drop', y: -6 * Math.sin(t * 2) }); IN(b, t, 27.4, null, { from: 'drop', y: -6 * Math.sin(t * 2 + 1) });
    tf(arr, { o: P(t, 26.0, 26.3), sx: P(t, 26.0, 27.0, E.out), x: 0 }); };
});
[24.94, 27.4].forEach((t, i) => HIT(t + .1, [1320, 600][i], 430, { n: 24, R: 200 }));

// E5 — a small page, mistakes, a fresh start (28.5 – 36.9)
scene(28.5, 36.9, r => {
  const old = el('div', 'phone', r); at(old, 960, 470); old.innerHTML = `<div class="hd"><img class="av" src="${A.logo}"><div class="st"><div><b>3</b><span>פוסטים</span></div><div><b>12</b><span>עוקבים</span></div></div></div><div class="nm">העמוד הראשון</div><div class="gr">${MIX.slice(0, 3).map(s => `<img src="${s}" style="filter:grayscale(1) brightness(.6)">`).join('')}</div>`; tf(old, { o: 0 });
  const xs = [[-230, -250], [240, -120], [-200, 160]].map(() => { const b = badX(r); b.style.position = 'absolute'; b.style.width = b.style.height = '110px'; b.style.right = 'auto'; b.style.bottom = 'auto'; return b; });
  const nw = el('div', 'phone', r); at(nw, 960, 470); nw.innerHTML = `<div class="hd"><img class="av" src="${A.logo}"><div class="st"><div><b>0</b><span>פוסטים</span></div><div><b>0</b><span>עוקבים</span></div></div></div><div class="nm">מארוול גיקים</div><div style="height:600px;display:grid;place-items:center;color:#556;font:800 40px Heebo">עמוד חדש</div>`; tf(nw, { o: 0 });
  const rst = tile(r, 'repeat', 1330, 470, 170, true); const pn = pill(r, 'מתחילים מחדש', 1330, 640);
  return t => {
    const gone = P(t, 33.3, 33.8, E.in);
    IN(old, t, 28.58, null, { from: 'up', d: .7, e: E.out5, s: lerp(.8, .62, P(t, 29.2, 29.8, E.io)), y: gone * 500, r: gone * 12, mul: 1 - gone });
    xs.forEach((b, i) => { const pos = [[-230, -250], [240, -120], [-200, 160]][i]; const sc = popScale(t, 31.94 + i * .18) * (1 - gone); b.style.left = (960 + pos[0] - 55) + 'px'; b.style.top = (470 + pos[1] - 55) + 'px'; b.style.transform = `scale(${(sc * 1.15).toFixed(3)})`; });
    IN(nw, t, 34.1, null, { from: 'drop', s: .7, y: -6 * Math.sin(t * 2) });
    IN(rst, t, 34.76, null, { from: 'pop', r: (t - 34.76) * 200 * (1 - P(t, 34.76, 35.8)) }); IN(pn, t, 35.0, null, { from: 'pop' });
  };
});
HIT(31.94, 960, 470, { n: 0, R: 300 }); HIT(34.1, 960, 470, { n: 50, R: 420 });

// E6 — this time differently: mentors (36.9 – 43.3)
scene(36.9, 43.3, r => {
  const p = pill(r, 'הפעם — אחרת', 960, 140, true);
  const c = coin(r, 230); at(c, 960, 470);
  const pos = [[-520, -160], [-560, 170], [520, -160], [560, 170], [0, -300]];
  const svg = el('div', 'abs', r); svg.style.cssText += 'width:1920px;height:1080px'; at(svg, 960, 540); svg._noOY = 1;
  svg.innerHTML = `<svg width="1920" height="1080">${pos.map(([x, y], i) => `<line class="l${i}" x1="960" y1="475" x2="${960 + x * 1.15}" y2="${475 + y * 1.15}" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-dasharray="1000" stroke-dashoffset="1000"/>`).join('')}</svg>`;
  const lines = [...svg.querySelectorAll('line')];
  const ms = pos.map(([x, y], i) => { const d = tile(r, i === 4 ? 'star' : 'user', 960 + x, 470 + y, 150, true); return d; });
  const lab = pill(r, 'מנטורים ומנוסים מהתחום', 960, 760);
  return t => { IN(p, t, 37.34, null, { from: 'depth' }); IN(c, t, 37.0, null, { from: 'pop' });
    tf(svg, { o: 1 }); lines.forEach((l, i) => l.setAttribute('stroke-dashoffset', 1000 * (1 - P(t, 40.3 + i * .15, 40.8 + i * .15))));
    ms.forEach((d, i) => IN(d, t, 40.5 + i * .15, null, { from: 'pop', y: -6 * Math.sin(t * 2 + i) })); IN(lab, t, 41.62, null, { from: 'pop' }); };
});

// E7 — community, creators, people of the field → understanding (43.3 – 51.0)
scene(43.3, 51.0, r => {
  const cs = [['users', 'הקהילה הגיקית', 44.9, 1360], ['camera', 'יוצרי תוכן', 46.68, 960], ['id', 'אנשי התחום', 47.46, 560]].map(([ic, tx, t0, x]) => ({ c: card(r, ic, tx, x, 420, 340, 300, 46), t0 }));
  const bulb = tile(r, 'bulb', 960, 420, 240, true); const lab = pill(r, 'איך העולם הזה באמת עובד', 960, 650);
  return t => { const sh = P(t, 48.3, 48.8, E.io);
    cs.forEach(({ c, t0 }, i) => IN(c, t, t0, null, { from: 'drop', y: -6 * Math.sin(t * 1.8 + i) + sh * 260, s: lerp(1, .55, sh), x: (i - 1) * -60 * sh }));
    IN(bulb, t, 49.18, null, { from: 'pop', y: -160 }); bulb.classList.toggle('on', t > 49.5); IN(lab, t, 49.78, null, { from: 'pop', y: -80 }); };
});
HIT(49.5, 960, 260, { n: 40, R: 300 });

// E8 — rule 1 title (51.0 – 56.0)
scene(51.0, 56.0, r => {
  const n = x3d(r, '1', 'big ltr', 960, 290, 300); const p = pill(r, 'הדבר הראשון', 960, 110, true); const tb = tblock(r, 'כלל מס׳ 1', 'תלמדו לערוך בעצמכם', 960, 660, 100);
  return t => { IN(p, t, 51.08, null, { from: 'depth' }); IN(n, t, 51.68, null, { from: 'drop' }); IN(tb, t, 54.56, null, { from: 'right' }); };
});
BIG(54.9, 960, 660, { n: 50, R: 460 }); CAPHIDE.push([54.4, 56.0]);

// E9 — not a pro designer, but: a basic post, images, text, a good design (56.0 – 66.4)
scene(56.0, 66.4, r => {
  const pro = card(r, 'pen', 'מעצב מקצועי', 960, 440, 380, 320, 46); const px = badX(pro);
  const base = el('div', 'abs', r); base.style.cssText += `width:420px;height:525px;border-radius:24px;border:4px dashed rgba(255,255,255,.35);background:rgba(0,0,0,.35)`; at(base, 1370, 450); tf(base, { o: 0 });
  const src = POSTS[1] || POSTS[0];
  const layers = [62, 85, 100].map(h => { const d = el('div', 'post', r); d.style.width = '420px'; d.style.boxShadow = 'none'; d.innerHTML = `<img src="${src}">`; d.style.clipPath = `inset(0 0 ${100 - h}% 0)`; at(d, 1370, 450); tf(d, { o: 0 }); return d; });
  const rows = [['doc', 'פוסט בסיסי', 60.94], ['camera', 'לבחור תמונות', 61.92], ['layout', 'לעבוד עם טקסטים', 63.84], ['star', 'עיצוב שנראה טוב', 64.6]].map(([ic, tx, t0], i) => ({ e: row(r, ic, tx, 640, 220 + i * 160, 780, 52), t0 }));
  return t => {
    IN(pro, t, 56.9, 59.2, { from: 'pop' }); px.style.transform = `scale(${popScale(t, 57.5)})`;
    IN(base, t, 59.4, null, { from: 'depth' });
    [61.92, 63.84, 64.6].forEach((t0, i) => IN(layers[i], t, t0, null, { from: 'depth', d: .4, e: E.out5 }));
    if (t > 64.6) layers[2].style.boxShadow = `0 0 ${40 * P(t, 64.6, 65.0)}px ${cv('--acc')}, 0 40px 80px rgba(0,0,0,.6)`;
    rows.forEach(({ e, t0 }) => { IN(e, t, t0, null, { from: 'right', rx: 6 }); e._ck.style.transform = `scale(${popScale(t, t0 + .3)})`; });
  };
});
HIT(57.5, 960, 440, { n: 0, R: 260 }); HIT(64.9, 1370, 450, { n: 60, R: 420 });

// E10 — why it matters (66.4 – 80.9)
scene(66.4, 80.9, r => {
  const q = x3d(r, '?', 'big ltr', 960, 400, 380);
  const cs = [['doc', 'איזה תוכן אתם יוצרים', 70.96, 1360], ['eye', 'מה מושך את העין', 72.6, 960], ['play', 'מה גורם לעצור ולצפות', 74.46, 560]].map(([ic, tx, t0, x]) => ({ c: card(r, ic, tx, x, 460, 360, 300, 40), t0 }));
  const chart = el('div', 'glass', r); chart.style.width = '760px'; chart.style.height = '420px'; at(chart, 960, 430);
  chart.innerHTML = `<svg width="760" height="420"><path class="cl" d="M60 360 L180 320 L300 330 L420 250 L540 200 L660 110 L720 70" fill="none" stroke="${cv('--acc')}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`; tf(chart, { o: 0 });
  const cl = chart.querySelector('.cl'), L = 900; cl.setAttribute('stroke-dasharray', L);
  const heart = tile(r, 'heart', 1260, 230, 150, true); const lab = pill(r, 'מה הקהל שלכם אוהב', 960, 750);
  return t => {
    IN(q, t, 66.55, 70.6, { from: 'drop', ry: 12 * Math.sin(t * 1.4) });
    const sh = P(t, 76.0, 76.4, E.io); cs.forEach(({ c, t0 }) => IN(c, t, t0, 76.4, { from: 'up', rx: 8, y: -6 * Math.sin(t * 1.8 + t0) }));
    IN(chart, t, 76.24, null, { from: 'depth' }); cl.setAttribute('stroke-dashoffset', L * (1 - P(t, 76.5, 78.6, E.io)));
    IN(heart, t, 79.38, null, { from: 'pop', y: -6 * Math.sin(t * 3) }); heart.classList.toggle('on', t > 79.5); IN(lab, t, 79.6, null, { from: 'pop' });
  };
});
HIT(79.5, 1260, 230, { n: 40, R: 240 });

// E11 — rule 2 title (80.9 – 85.6)
scene(80.9, 85.6, r => {
  const n = x3d(r, '2', 'big ltr', 960, 290, 300); const p = pill(r, 'הדבר השני', 960, 110, true); const tb = tblock(r, 'כלל מס׳ 2', 'מאיפה מגיע המידע', 960, 660, 104);
  return t => { IN(p, t, 80.99, null, { from: 'depth' }); IN(n, t, 81.36, null, { from: 'drop' }); IN(tb, t, 82.2, null, { from: 'right' }); };
});
BIG(82.2, 960, 660, { n: 50, R: 460 }); CAPHIDE.push([82.0, 85.6]);

// E12 — Twitter: news, reports, rumours, leaks (85.6 – 91.4)
scene(85.6, 91.4, r => {
  const hd = pill(r, 'טוויטר / X', 960, 120, true);
  const tw = [['חדשות', 88.78, '#2FE870'], ['דיווחים', 89.3, '#7cc4ff'], ['שמועות', 90.12, '#ffc83d'], ['הדלפות', 90.68, '#ff6b6b']].map(([tx, t0, col], i) => {
    const d = el('div', 'glass', r); d.style.width = '420px'; d.style.height = '250px'; at(d, i % 2 ? 720 : 1200, i < 2 ? 330 : 620);
    d.innerHTML = `<div style="padding:26px;direction:rtl"><div style="display:flex;gap:16px;align-items:center"><div style="width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.25)"></div><div style="flex:1"><div style="height:16px;width:60%;background:rgba(255,255,255,.55);border-radius:8px"></div><div style="height:12px;width:40%;background:rgba(255,255,255,.3);border-radius:8px;margin-top:10px"></div></div></div>
      <div style="height:14px;background:rgba(255,255,255,.4);border-radius:8px;margin-top:26px"></div><div style="height:14px;width:80%;background:rgba(255,255,255,.4);border-radius:8px;margin-top:12px"></div>
      <div style="display:inline-block;margin-top:22px;padding:6px 22px;border-radius:999px;background:${col};color:#0a0a0a;font:900 36px Heebo">${tx}</div></div>`;
    tf(d, { o: 0 }); return { d, t0 }; });
  return t => { IN(hd, t, 85.72, null, { from: 'pop' }); tw.forEach(({ d, t0 }, i) => IN(d, t, t0 - .25, null, { from: 'up', r: (i - 1.5) * 2.5, rx: 8, y: -6 * Math.sin(t * 1.8 + i) })); };
});

// E13 — reliable sources: grounded info vs baseless rumour (91.4 – 97.6)
scene(91.4, 97.6, r => {
  const hd = pill(r, 'מקורות אמינים', 960, 130);
  const good = card(r, 'shield', 'מידע מבוסס', 1300, 470, 420, 340, 54); const gb = okBadge(good);
  const bad = card(r, 'x', 'שמועה חסרת בסיס', 620, 470, 420, 340, 46); bad.querySelector('.ic').style.color = RED; const bb = badX(bad);
  const vs = x3d(r, 'VS', 'sm ltr', 960, 470, 110);
  return t => { IN(hd, t, 92.46, null, { from: 'pop' }); IN(good, t, 94.84, null, { from: 'right', y: -6 * Math.sin(t * 2), s: 1 + .04 * P(t, 96.9, 97.3) }); gb.style.transform = `scale(${popScale(t, 95.2)})`;
    IN(vs, t, 95.5, null, { from: 'pop' }); IN(bad, t, 96.26, null, { from: 'left', y: -6 * Math.sin(t * 2 + 1), mul: lerp(1, .6, P(t, 96.9, 97.3)) }); bb.style.transform = `scale(${popScale(t, 96.62)})`; };
});
HIT(95.2, 1300, 470, { n: 30, R: 300 });

// E14 — my sources, revealed during the course (97.6 – 101.1)
scene(97.6, 101.1, r => {
  const lock = tile(r, 'lock', 960, 400, 260, true); const p = pill(r, 'יחשפו במהלך הקורס', 960, 640);
  return t => { IN(lock, t, 98.44, null, { from: 'pop', r: Math.sin(t * 9) * 4 * (1 - P(t, 99.4, 100)) }); lock.classList.toggle('on', t > 99.4); IN(p, t, 99.9, null, { from: 'pop' }); };
});
HIT(99.4, 960, 400, { n: 40, R: 320 });

// E15 — warning: spoilers (101.1 – 110.1)
scene(101.1, 110.1, r => {
  const w = tile(r, 'warn', 960, 330, 280); w.style.color = '#ffc83d';
  const tb = tblock(r, 'אזהרה', 'ספוילרים', 960, 640, 120); tb.querySelector('.tag').style.background = '#ffc83d';
  const f = card(r, 'film', 'סרטים', 1450, 420, 260, 240, 44), s = card(r, 'tv', 'סדרות', 470, 420, 260, 240, 44);
  return t => { IN(w, t, 101.94, null, { from: 'drop', r: Math.sin(t * 5) * 3 }); IN(tb, t, 107.44, null, { from: 'right' });
    IN(f, t, 108.0, null, { from: 'right', r: 6 }); IN(s, t, 108.42, null, { from: 'left', r: -6 }); };
});
BIG(101.94, 960, 330, { n: 40, R: 360, punch: .8 }); HIT(107.6, 960, 640, { n: 40, R: 420 }); CAPHIDE.push([107.3, 110.1]);

// E16 — not every rumour becomes a post: the filter (110.1 – 125.8)
scene(110.1, 125.8, r => {
  const hd = pill(r, 'כלל חשוב', 960, 80, true);
  const rum = card(r, 'x', 'שמועה', 560, 250, 280, 240, 44); rum.querySelector('.ic').style.color = '#ffc83d'; rum.querySelector('.ic').innerHTML = svgI('comment');
  const pst = el('div', 'post', r); pst.style.width = '230px'; pst.innerHTML = `<img src="${POSTS[0] || MIX[0]}">`; at(pst, 1360, 250); tf(pst, { o: 0 });
  const arr = el('div', 'abs', r); arr.style.cssText += 'width:420px;height:24px'; at(arr, 960, 250); arr.innerHTML = `<svg width="420" height="24"><path d="M10 12 H390" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="22 16"/><path d="M370 -6 L405 12 L370 30" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`; tf(arr, { o: 0 });
  const stop = el('div', 'abs', r); stop.style.cssText += `width:120px;height:120px;border-radius:50%;background:${RED};display:grid;place-items:center;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.5);border:6px solid #fff`; stop.innerHTML = `<div style="width:64px;height:64px">${svgI('x', 3.2).replace('<circle cx="12" cy="12" r="9.5"/>', '')}</div>`; at(stop, 960, 250); stop.style.transform = 'scale(0)';
  const rows = [['search', 'תבדקו את המקור', 118.52], ['users', 'זה מעניין את הקהל?', 121.08], ['check', 'זה ראוי לפרסום?', 124.0]].map(([ic, tx, t0], i) => ({ e: row(r, ic === 'search' ? 'eye' : ic, tx, 960, 450 + i * 135, 940, 54), t0 }));
  return t => { const up = P(t, 116.6, 117.0, E.io);
    IN(hd, t, 110.94, null, { from: 'depth' }); IN(rum, t, 112.26, null, { from: 'left', y: -up * 40, s: lerp(1, .8, up) });
    tf(arr, { o: P(t, 114.6, 114.8) * (1 - up * .3), sx: P(t, 114.6, 115.4), y: -up * 40 }); IN(pst, t, 115.28, null, { from: 'right', y: -up * 40, s: lerp(1, .8, up), mul: lerp(1, .5, P(t, 115.8, 116.2)) });
    const sp = popScale(t, 115.8); stop.style.transform = `translate(${960 - 60}px, ${475 + (250 - 440) * KZ - 60 - up * 40 * KZ}px) scale(${sp * KZ})`; stop.style.left = '0'; stop.style.top = '0';
    rows.forEach(({ e, t0 }) => { IN(e, t, t0, null, { from: 'right', rx: 6, s: .9 }); e._ck.style.transform = `scale(${popScale(t, t0 + .35)})`; });
  };
});
HIT(115.8, 960, 250, { n: 0, R: 260 });

// E17 — the goal: not first, but trusted (125.8 – 132.4)
scene(125.8, 132.4, r => {
  const hd = pill(r, 'המטרה שלכם', 960, 120, true);
  const first = card(r, 'clock', 'להיות הראשונים', 640, 450, 380, 320, 46); const fx = badX(first);
  const trust = card(r, 'shield', 'עמוד שסומכים עליו', 1300, 450, 420, 340, 46); const tc = okBadge(trust);
  return t => { IN(hd, t, 127.28, null, { from: 'depth' }); IN(first, t, 128.78, null, { from: 'left', mul: lerp(1, .55, P(t, 130.3, 130.7)), s: lerp(1, .85, P(t, 130.3, 130.7)) }); fx.style.transform = `scale(${popScale(t, 129.6)})`;
    IN(trust, t, 130.84, null, { from: 'right', s: 1 + .08 * P(t, 131.72, 132.1, E.back), y: -6 * Math.sin(t * 2) }); tc.style.transform = `scale(${popScale(t, 131.72)})`; };
});
HIT(131.72, 1300, 450, { n: 50, R: 380 });

// E18 — recap + "don't be afraid to start from 0" (132.4 – 140.3)
scene(132.4, 140.3, r => {
  const tb = tblock(r, 'סיכום', 'השיעור הראשון', 1500, 140, 64);
  const rows = [['pen', 'תלמדו לערוך', 134.12], ['users', 'תכירו את הקהילה', 134.96], ['shield', 'מקורות מידע אמינים', 136.44], ['flag', 'אל תפחדו להתחיל', 138.1]].map(([ic, tx, t0], i) => ({ e: row(r, ic, tx, 1170, 270 + i * 140, 920, 54), t0 }));
  const zero = x3d(r, '0', 'big ltr', 470, 470, 420);
  return t => { IN(tb, t, 132.94, null, { from: 'right' }); rows.forEach(({ e, t0 }) => { IN(e, t, t0, null, { from: 'right', rx: 6, s: .9 }); e._ck.style.transform = `scale(${popScale(t, t0 + .3)})`; });
    IN(zero, t, 139.5, null, { from: 'drop', d: .4, e: E.expo }); };
});
BIG(139.66, 470, 470, { n: 70, R: 480, flash: .35, punch: 1 }); CAPHIDE.push([132.8, 133.6]);

// E19 — next lesson (140.3 – 149.8)
scene(140.3, 149.8, r => {
  const hd = pill(r, 'בשיעור הבא', 960, 130, true);
  const g = tile(r, 'chart', 960, 400, 220, true);
  const n = x3d(r, '2', 'big ltr', 1400, 330, 300);
  const tb = tblock(r, 'שיעור 2', 'תוכן שאנשים רוצים לראות', 960, 690, 90);
  const ps = POSTS.map(p => post(r, p, 960, 470, 250));
  return t => { const s2 = P(t, 146.3, 146.7, E.io);
    IN(hd, t, 140.64, null, { from: 'depth' }); IN(g, t, 144.84, 146.5, { from: 'pop' }); g.classList.toggle('on', t > 145.6);
    IN(n, t, 143.46, null, { from: 'drop', x: -s2 * 0 }); IN(tb, t, 146.58, null, { from: 'right' });
    ps.forEach((d, i) => { const a = i - (ps.length - 1) / 2; IN(d, t, 147.2 + i * .12, null, { from: 'up', x: -260 + a * 150 - 300, y: 20 + Math.abs(a) * 20 - 6 * Math.sin(t * 1.6 + i), r: a * 6, z: -Math.abs(a) * 40, s: .9 }); });
  };
});
HIT(145.6, 960, 400, { n: 40, R: 300 }); BIG(146.9, 960, 690, { n: 50, R: 420, punch: .6 }); CAPHIDE.push([146.4, 149.8]);

// E20 — thanks + lockup (149.8 – 153.6)
scene(149.8, 153.6, r => {
  const c = coin(r, 320); at(c, 960, 340); const th = x3d(r, 'תודה רבה!', 'mid', 960, 660, 150); const p = pill(r, 'מארוול גיקים · שיעור 1', 960, 830, true);
  return t => { const k = P(t, 149.8, 150.3, E.spring); tf(c, { o: clamp((t - 149.8) / .1), s: lerp(.4, 1, k), y: -8 * Math.sin(t * 2) }); IN(th, t, 150.14, null, { from: 'depth' }); IN(p, t, 150.7, null, { from: 'pop' }); };
});
BIG(150.14, 960, 340, { n: 60, R: 420, flash: .25 }); CAPHIDE.push([149.8, 160]);
// ---------- captions: 1–3 word chunks (reference style) ----------
const CH = []; for (const g of CAPTIONS) { const ws = g.words; const n = Math.ceil(ws.length / 3), per = Math.ceil(ws.length / n);
  for (let i = 0; i < ws.length; i += per) { const part = ws.slice(i, i + per), nx = ws[i + per]; CH.push({ s: part[0].s, e: nx ? nx.s : g.e, text: part.map(w => w.w).join(' ') }); } }
const caps = document.getElementById('caps'); const capSpan = el('span', '', caps);
function drawCaps(t) { const c = CH.find(c => t >= c.s && t < c.e); if (!c || CAPHIDE.some(([a, b]) => t >= a && t < b)) { caps.style.visibility = 'hidden'; return; }
  caps.style.visibility = 'visible'; if (capSpan.textContent !== c.text) capSpan.textContent = c.text; const k = clamp((t - c.s) / .12); capSpan.style.transform = `scale(${lerp(1.12, 1, E.out(k))})`; capSpan.style.opacity = E.out(k); }

// ---------- grain ----------
const gc = document.getElementById('grain').getContext('2d'), gimg = gc.createImageData(960, 540);
function drawGrain(t) { const r = rnd(Math.floor(t * 30) * 7919 + 1), d = gimg.data; for (let i = 0; i < d.length; i += 4) { const v = (r() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } gc.putImageData(gimg, 0, 0); }

const tick = document.querySelector('#ticker .tt span'), tickEl = document.getElementById('ticker');
tick.textContent = (window.TICKER || 'מארוול גיקים  •  ').repeat(6);
function drawTicker(t) { const T = window.TICKWIN || [3.9, 71.5]; const o = Math.min(P(t, T[0], T[0] + .5), 1 - P(t, T[1] - .3, T[1])); tickEl.style.opacity = o; tickEl.style.visibility = o < .01 ? 'hidden' : 'visible'; tick.style.transform = `translateX(${((t * 120) % 2200).toFixed(1)}px)`; }
window.DURATION = window.EPDUR || 79.5; window.EDL = { shots: [], trans: [] };
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
