// Marvel Gikim course trailer — every frame is a pure function of t (seconds).
(() => {
const W = 1080, H = 1920;
const stage = document.getElementById('stage');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  lin: x => x,
  out: x => 1 - Math.pow(1 - x, 3),
  out5: x => 1 - Math.pow(1 - x, 5),
  expo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  in: x => x * x * x,
  io: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const P = (t, a, b, e = E.out) => e(clamp((t - a) / (b - a)));
function rnd(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ---------- DOM helpers ----------
function el(tag, cls, parent, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || stage).appendChild(e); return e; }
function at(e, x, y) { e._x = x; e._y = y; return e; }
function T(parent, cls, text, x, y, size) {
  const e = el('div', 'abs', parent), s = el('span', cls, e); s.textContent = text; if (size) s.style.fontSize = size + 'px';
  at(e, x, y); tf(e, { o: 0 }); return e;
}
function tf(e, o) {
  const x = (e._x ?? 540) + (o.x || 0), y = (e._y ?? 960) + (o.y || 0);
  const s = o.s ?? 1;
  let tr = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) translate(-50%,-50%)`;
  if (o.p) tr += ` perspective(${o.p}px)`;
  if (o.rx) tr += ` rotateX(${o.rx}deg)`; if (o.ry) tr += ` rotateY(${o.ry}deg)`;
  if (o.r) tr += ` rotate(${o.r}deg)`;
  tr += ` scale(${(s * (o.sx ?? 1)).toFixed(4)},${(s * (o.sy ?? 1)).toFixed(4)})`;
  e.style.transform = tr;
  const op = o.o ?? 1; e.style.opacity = op; e.style.visibility = op <= .002 ? 'hidden' : 'visible';
  e.style.filter = (o.blur > .05 ? `blur(${o.blur.toFixed(2)}px)` : '') + (o.f ? ' ' + o.f : '');
}
// entrance at t0, optional exit ending at t1
function A_(e, t, t0, t1, kind = 'blur', ex = {}) {
  const d = ex.d ?? (kind === 'slam' ? .32 : .4), dout = ex.do ?? .22;
  const o = { x: ex.x || 0, y: ex.y || 0, s: ex.s ?? 1, r: ex.r || 0, rx: ex.rx, ry: ex.ry, p: ex.p, f: ex.f };
  if (t < t0 || (t1 != null && t >= t1)) { o.o = 0; tf(e, o); return 0; }
  const k = clamp((t - t0) / d), ko = t1 == null ? 0 : clamp((t - (t1 - dout)) / dout);
  let op = 1, blur = 0;
  if (kind === 'blur') { const q = E.out(k); op = q; blur = (1 - q) * 18; o.y += (1 - q) * 40; }
  else if (kind === 'pop') { const q = E.back(k); op = clamp(k * 3); o.s *= lerp(.35, 1, q); }
  else if (kind === 'slam') { const q = E.expo(k); op = clamp(k * 4); o.s *= lerp(2.7, 1, q); blur = (1 - q) * 24; }
  else if (kind === 'up') { const q = E.out5(k); op = clamp(k * 2.5); o.y += (1 - q) * 140; blur = (1 - q) * 10; }
  else if (kind === 'right') { const q = E.out5(k); op = clamp(k * 2.5); o.x += (1 - q) * 520; blur = (1 - q) * 16; o.sx = 1 + (1 - q) * .25; }
  else if (kind === 'left') { const q = E.out5(k); op = clamp(k * 2.5); o.x -= (1 - q) * 520; blur = (1 - q) * 16; }
  else if (kind === 'fade') { op = E.out(k); }
  const qo = E.in(ko); op *= 1 - qo; blur += qo * 16; o.s *= 1 + qo * .08;
  if (ex.mul != null) op *= ex.mul;
  o.o = op; o.blur = blur; tf(e, o); return op;
}

// ---------- icons (simple stroke drawings) ----------
const ICON = {
  check: '<polyline points="4 12.5 9.5 18 20 6.5"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  fork: '<path d="M12 22v-8L5 7M12 14l7-7"/><path d="M5 12V7h5M19 12V7h-5"/>',
  x: '<circle cx="12" cy="12" r="9.5"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>',
  bulb: '<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.7.5 1.1 1.3 1.1 2.2h5.4c0-.9.4-1.7 1.1-2.2A6.5 6.5 0 0 0 12 2.5z"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12"/>',
  id: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.5"/><path d="M5 16.5c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4M14.5 10h4.5M14.5 13.5h3"/>',
  target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.6"/>',
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
  sparkle: '<path d="M12 1.5l2.4 7.1 7.1 2.4-7.1 2.4L12 20.5l-2.4-7.1-7.1-2.4 7.1-2.4z"/><path d="M19.5 17.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  up: '<path d="M4 14l8-8 8 8"/>',
};
const svgI = (name, sw = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%">${ICON[name]}</svg>`;

// ---------- backgrounds ----------
const pending = [];
const HERO = (tag, i = 0, fb) => { const l = (A.heroes || {})[tag]; return l && l.length ? l[i % l.length] : fb; };
const GRADE = 'grayscale(.4) contrast(1.18) brightness(.6)';
function photoBG(parent, src, o = {}) {
  const b = el('div', 'bg', parent), im = el('img', '', b); im.src = src;
  const tint = el('div', 'tint', b); tint.style.opacity = o.tint ?? .72; el('div', 'shade', b);
  const base = o.filter ?? GRADE;
  return (t, t0, t1) => {
    const k = clamp((t - t0) / ((t1 ?? t0 + 6) - t0));
    const cw = W + 120, ch = H + 120, ar = (im.naturalWidth || 2) / (im.naturalHeight || 3);
    let w, h; if (ar > cw / ch) { h = ch; w = ch * ar; } else { w = cw; h = cw / ar; }
    im.style.width = w + 'px'; im.style.height = h + 'px';
    const s = lerp(o.s0 ?? 1.06, o.s1 ?? 1.18, E.io(k)), x = lerp(o.x0 ?? 0, o.x1 ?? 0, E.io(k)), y = lerp(o.y0 ?? 0, o.y1 ?? 0, E.io(k));
    im.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${s})`;
    im.style.filter = base + (o.blur ? ` blur(${o.blur}px)` : '');
    b.style.opacity = o.op ? o.op(t) : 1;
  };
}
function seqBG(parent, name, o = {}) {
  const [n, dir] = A.seq[name];
  const b = el('div', 'bg', parent), im = el('img', '', b);
  im.style.width = (W + 120) + 'px'; im.style.height = (H + 120) + 'px'; im.style.objectFit = 'cover';
  const tint = el('div', 'tint', b); tint.style.opacity = o.tint ?? .45; el('div', 'shade', b);
  im.style.filter = o.filter ?? 'contrast(1.12) brightness(.78) saturate(1.15)';
  let cur = -1;
  return (t, t0) => {
    let f = Math.floor((t - t0) * 30 * (o.speed ?? 1)) + (o.offset ?? 0);
    const per = 2 * (n - 1); f = ((f % per) + per) % per; if (f >= n) f = per - f;
    if (f !== cur) { cur = f; im.src = dir + String(f + 1).padStart(4, '0') + '.jpg'; pending.push(im.decode().catch(() => {})); }
    const s = lerp(o.s0 ?? 1.04, o.s1 ?? 1.14, clamp((t - t0) / (o.dur ?? 6)));
    im.style.transform = `translate(-50%,-50%) scale(${s})`;
    b.style.opacity = o.op ? o.op(t) : 1;
  };
}
function img(parent, src, x, y, w, h, cls = 'abs') { const i = el('img', cls, parent); i.src = src; i.style.width = w + 'px'; i.style.height = (h ?? w) + 'px'; at(i, x, y); tf(i, { o: 0 }); return i; }
function makeRings(parent, x, y, D) {
  const w = el('div', 'abs', parent); at(w, x, y); w.style.width = w.style.height = D + 'px';
  const c = D / 2, R = D / 2;
  let ticks = ''; for (let i = 0; i < 72; i++) { const a = i / 72 * 6.2832, r1 = R * .8, r2 = R * (i % 6 ? .83 : .86);
    ticks += `<line x1="${c + Math.cos(a) * r1}" y1="${c + Math.sin(a) * r1}" x2="${c + Math.cos(a) * r2}" y2="${c + Math.sin(a) * r2}" stroke="#7DFFB8" stroke-width="${i % 6 ? 2 : 4}" opacity=".8"/>`; }
  w.innerHTML = `<svg width="${D}" height="${D}" style="filter:drop-shadow(0 0 10px #2BE38A) drop-shadow(0 0 24px rgba(43,227,138,.6))">
    <g class="r1"><circle cx="${c}" cy="${c}" r="${R * .985}" fill="none" stroke="#2BE38A" stroke-width="3" stroke-dasharray="3 16"/></g>
    <g class="r2"><circle cx="${c}" cy="${c}" r="${R * .93}" fill="none" stroke="#B6FFD6" stroke-width="7" stroke-linecap="round" stroke-dasharray="${R * 1.1} ${R * .35} ${R * .3} ${R * .35}"/></g>
    <g class="r3">${ticks}</g>
    <g class="r4"><circle cx="${c}" cy="${c}" r="${R * .75}" fill="none" stroke="#2BE38A" stroke-width="2" opacity=".55" stroke-dasharray="60 14"/></g></svg>`;
  const g = [...w.querySelectorAll('g')];
  return (t, o = {}) => {
    const sp = [16, -28, 7, -12];
    g.forEach((gg, i) => gg.setAttribute('transform', `rotate(${(t * sp[i]) % 360} ${c} ${c})`));
    tf(w, o);
  };
}

// ---------- global FX canvas: embers, bursts, shockwaves, flares ----------
const fxc = document.getElementById('fx').getContext('2d');
const sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(230,255,240,1)'); gr.addColorStop(.22, 'rgba(110,255,175,.85)'); gr.addColorStop(1, 'rgba(20,160,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })();
const EMB = Array.from({ length: 120 }, (_, i) => { const r = rnd(1000 + i * 7); return { x: r() * W, sp: 50 + r() * 150, ph: r(), sz: 5 + r() * 24, amp: 10 + r() * 45, f: .3 + r() * 1.2, a: .2 + r() * .6 }; });
const BURSTS = [], RINGS = [], FLARES = [];
function HIT(t, x = 540, y = 960, o = {}) {
  if (o.n !== 0) BURSTS.push({ t, x, y, n: o.n ?? 70, sp: o.sp ?? 560, life: o.life ?? 1.15, seed: Math.round(t * 997) + 7 });
  if (o.R !== 0) RINGS.push({ t, x, y, R: o.R ?? 900, life: o.rl ?? .75, w: o.w ?? 28 });
  if (o.flare !== false) FLARES.push({ t, x, y, life: o.fl ?? .55 });
}
function emberLevel(t) {
  const hi = [[0.9, 3.8], [77.5, 79.5], [16.33, 17.5], [22.47, 25.6], [42.95, 45.0], [62.3, 63.4], [65.2, 67], [71.5, 79.5]];
  return hi.some(([a, b]) => t >= a && t < b) ? 1.25 : .7;
}
function drawFX(t) {
  fxc.clearRect(0, 0, W, H);
  fxc.globalCompositeOperation = 'lighter';
  const lv = emberLevel(t);
  for (const p of EMB) {
    const y = H + 60 - ((t * p.sp + p.ph * (H + 120)) % (H + 120));
    const x = p.x + Math.sin(t * p.f + p.ph * 6.283) * p.amp;
    fxc.globalAlpha = clamp(p.a * (.6 + .4 * Math.sin(t * 3 * p.f + p.ph * 20)) * lv);
    fxc.drawImage(sprite, x - p.sz / 2, y - p.sz / 2, p.sz, p.sz);
  }
  for (const b of BURSTS) {
    const dt = t - b.t; if (dt < 0 || dt > b.life) continue; const r = rnd(b.seed), k = dt / b.life;
    for (let i = 0; i < b.n; i++) {
      const ang = r() * 6.2832, sp = b.sp * (.25 + r() * .95), sz = 6 + r() * 26, a0 = .5 + r() * .5;
      const d = sp * E.out(Math.min(1, dt / (b.life * .75)));
      fxc.globalAlpha = (1 - k) * a0;
      fxc.drawImage(sprite, b.x + Math.cos(ang) * d - sz / 2, b.y + Math.sin(ang) * d + 140 * k * k - sz / 2, sz, sz);
    }
  }
  fxc.globalAlpha = 1;
  for (const g of RINGS) {
    const dt = t - g.t; if (dt < 0 || dt > g.life) continue; const k = dt / g.life;
    fxc.strokeStyle = `rgba(140,255,195,${(1 - k) * .95})`; fxc.lineWidth = g.w * (1 - k) + 1.5; fxc.shadowColor = '#2BE38A'; fxc.shadowBlur = 34;
    fxc.beginPath(); fxc.arc(g.x, g.y, 20 + g.R * E.expo(k), 0, 6.2832); fxc.stroke(); fxc.shadowBlur = 0;
  }
  for (const f of FLARES) {
    const dt = t - f.t; if (dt < 0 || dt > f.life) continue; const k = dt / f.life, a = Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k * .6);
    const gr = fxc.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(43,227,138,0)'); gr.addColorStop(.5, `rgba(215,255,232,${a})`); gr.addColorStop(1, 'rgba(43,227,138,0)');
    fxc.fillStyle = gr; fxc.fillRect(0, f.y - 2 - 7 * a, W, 4 + 14 * a);
    const rg = fxc.createRadialGradient(f.x, f.y, 0, f.x, f.y, 300); rg.addColorStop(0, `rgba(190,255,220,${a * .75})`); rg.addColorStop(1, 'rgba(43,227,138,0)');
    fxc.fillStyle = rg; fxc.fillRect(f.x - 300, f.y - 300, 600, 600);
  }
  fxc.globalAlpha = 1; fxc.globalCompositeOperation = 'source-over';
}

// ---------- global camera / transition events ----------
const FLASH = [], SHAKE = [], GLITCH = [], WHIP = [], ZOOM = [], DIPS = [];
const flashEl = document.getElementById('flash'), dipEl = document.getElementById('dip');
const bars = document.getElementById('bars').getContext('2d');
function applyGlobal(t) {
  let x = 0, y = 0, s = 1, blur = 0, filt = '';
  for (const w of WHIP) { const dt = t - w.t; if (Math.abs(dt) > w.d) continue;
    if (dt < 0) { const k = E.in(1 + dt / w.d); x += -w.dir * k * 420; blur += k * 26; }
    else { const k = 1 - E.out(dt / w.d); x += w.dir * k * 420; blur += k * 26; } }
  for (const z of ZOOM) { const dt = t - z.t; if (Math.abs(dt) > z.d) continue;
    if (dt < 0) { const k = E.in(1 + dt / z.d); s *= 1 + k * .7; blur += k * 22; }
    else { const k = 1 - E.out(dt / z.d); s *= 1 - k * .22; blur += k * 18; } }
  for (const q of SHAKE) { const dt = t - q.t; if (dt < 0 || dt > q.d) continue; const a = q.amp * Math.pow(1 - dt / q.d, 2);
    x += Math.sin(dt * 91 + q.t) * a; y += Math.cos(dt * 77 + q.t * 3) * a; }
  bars.clearRect(0, 0, W, H);
  for (const g of GLITCH) { const dt = t - g.t; if (dt < -.07 || dt > g.d) continue;
    const r = rnd(Math.floor(t * 30) * 13 + 5), amp = 1 - clamp(dt / g.d);
    x += (r() - .5) * 70 * amp; filt += ` hue-rotate(${Math.round((r() - .5) * 60 * amp)}deg) drop-shadow(${(9 * amp).toFixed(1)}px 0 0 rgba(255,40,120,.55)) drop-shadow(${(-9 * amp).toFixed(1)}px 0 0 rgba(40,255,200,.55))`;
    for (let i = 0; i < 9; i++) { const by = r() * H, bh = 3 + r() * 34, bx = (r() - .3) * 600; const c = r();
      bars.fillStyle = c < .6 ? `rgba(43,227,138,${(.18 + r() * .3) * amp})` : (c < .8 ? `rgba(220,255,235,${(.1 + r() * .2) * amp})` : `rgba(0,0,0,${(.35 + r() * .35) * amp})`);
      bars.fillRect(bx, by, W * (.4 + r() * .8), bh); } }
  stage.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`;
  stage.style.filter = (blur > .1 ? `blur(${blur.toFixed(1)}px)` : '') + filt;
  let fa = 0, fc = '#ffffff';
  for (const f of FLASH) { const dt = t - f.t; if (dt < -.04 || dt > f.d) continue; const a = dt < 0 ? f.a * (1 + dt / .04) : f.a * Math.pow(1 - dt / f.d, 2); if (a > fa) { fa = a; fc = f.c || '#ffffff'; } }
  flashEl.style.opacity = fa; flashEl.style.background = fc;
  let da = 0; for (const d of DIPS) { if (t >= d[0] && t < d[3]) da = Math.max(da, t < d[1] ? P(t, d[0], d[1], E.io) : t < d[2] ? 1 : 1 - P(t, d[2], d[3], E.io)); }
  dipEl.style.opacity = da;
}

// ---------- grain ----------
const gc = document.getElementById('grain').getContext('2d'), gimg = gc.createImageData(540, 960);
function drawGrain(t) { const r = rnd(Math.floor(t * 30) * 7919 + 1), d = gimg.data;
  for (let i = 0; i < d.length; i += 4) { const v = (r() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  gc.putImageData(gimg, 0, 0); }

// ---------- captions ----------
const caps = document.getElementById('caps');
const CAPHIDE = [[2.41, 3.83], [6.3, 9.87], [16.3, 22.47], [22.47, 25.67], [28.7, 29.47], [35.2, 37.17], [43.1, 45.01], [46.9, 49.25], [50.6, 55.07], [59.9, 65.21], [65.21, 71.53], [71.53, 99]];
let capCur = -1, capWords = [];
function drawCaps(t) {
  let gi = -1; for (let i = 0; i < CAPTIONS.length; i++) if (t >= CAPTIONS[i].s && t < CAPTIONS[i].e) gi = i;
  if (gi < 0 || CAPHIDE.some(([a, b]) => t >= a && t < b)) { caps.style.visibility = 'hidden'; return; }
  caps.style.visibility = 'visible';
  const g = CAPTIONS[gi];
  if (gi !== capCur) { caps.innerHTML = ''; capWords = g.words.map(w => { const s = el('span', 'w', caps); s.textContent = w.w; return s; }); capCur = gi; }
  g.words.forEach((w, i) => {
    const s = capWords[i], nextS = g.words[i + 1]?.s ?? g.e, dt = t - w.s + .04, k = clamp(dt / .17), on = t >= w.s - .04 && t < nextS;
    s.classList.toggle('on', on);
    s.style.opacity = dt < 0 ? 0 : E.out(k);
    s.style.transform = `translateY(${((1 - E.out(k)) * 28).toFixed(1)}px) scale(${on ? 1.06 : 1})`;
    s.style.filter = dt >= 0 && dt < .17 ? `blur(${((1 - k) * 8).toFixed(1)}px)` : '';
  });
  caps.style.opacity = 1 - clamp((t - (g.e - .1)) / .1);
}

// ---------- brand bug ----------
const bug = document.getElementById('bug');
function drawBug(t) { const o = Math.min(P(t, 4.0, 4.5), 1 - P(t, 71.2, 71.5)); bug.style.opacity = o; bug.style.visibility = o < .01 ? 'hidden' : 'visible'; }

// ---------- scenes ----------
const SCENES = [];
function scene(t0, t1, build) { const root = el('div', 'scene'); const s = { t0, t1, root }; s.update = build(root, s); SCENES.push(s); }
const chapterTitle = (r, num) => {
  const big = T(r, 'bebas', num, 540, 760, 640); big.firstChild.style.cssText += 'color:transparent;-webkit-text-stroke:4px rgba(43,227,138,.85);filter:drop-shadow(0 0 18px rgba(43,227,138,.8));letter-spacing:.02em';
  const lab = T(r, 'label', 'פ ר ק', 540, 455); lab.firstChild.style.fontSize = '48px';
  return { big, lab };
};

// S1 — hook + welcome (0 – 3.83)
scene(0, 3.83, r => {
  const bg = seqBG(r, 'aurora', { speed: .75, tint: .3, s0: 1.3, s1: 1.1, dur: 4 });
  const flipPics = [HERO('ironman', 2, A.loki_window), HERO('spiderman', 1, A.doom_galaxy), A.loki_think, HERO('capamerica', 0, A.doom_nycc12), HERO('thor', 0, A.loki_stage), A.doom_galaxy, HERO('blackpanther', 0, A.loki_dagger), HERO('spiderman', 2, A.doom_pax)];
  const flip = el('div', 'flip', r); flip.style.filter = 'grayscale(.45) contrast(1.25) brightness(.8)';
  const fimgs = flipPics.map(p => { const i = el('img', '', flip); i.src = p; return i; });
  el('div', 'tint', flip).style.opacity = .55;
  const rings = makeRings(r, 540, 800, 820);
  const logo = img(r, A.logo, 540, 800, 560); logo.style.borderRadius = '50%'; logo.style.boxShadow = '0 0 90px rgba(43,227,138,.6)';
  const w1 = T(r, 'label', 'ברוכים הבאים', 540, 1190); w1.firstChild.style.fontSize = '50px';
  const w2 = T(r, 'kar metal', 'לקורס', 540, 1345, 270);
  return t => {
    bg(t, 0);
    const FS = .104, fi = Math.floor(t / FS);
    flip.style.display = t < fimgs.length * FS ? 'block' : 'none';
    fimgs.forEach((im, i) => { im.style.display = i === fi ? 'block' : 'none'; const lt = (t - i * FS) / FS;
      im.style.transform = `scale(${(1.18 - .1 * clamp(lt)).toFixed(3)}) rotate(${(i % 2 ? 2.5 : -2.5) * (1 - clamp(lt))}deg)`; });
    const k = P(t, .84, 1.03, E.expo);
    tf(logo, { s: lerp(3, 1, k) * (1 + .02 * Math.sin(t * 2.2)), o: clamp((t - .84) / .06), blur: (1 - k) * 26, r: lerp(-30, 0, k) });
    rings(t, { s: lerp(.4, 1, P(t, 1.0, 1.7, E.out5)), o: P(t, 1.0, 1.4) });
    A_(w1, t, 2.41, null, 'blur');
    A_(w2, t, 2.87, null, 'slam');
  };
});
for (let i = 1; i < 8; i++) FLASH.push({ t: i * .104, a: .35, d: .07, c: '#d9ffe9' });
HIT(1.03, 540, 800, { R: 1100, n: 110, sp: 760 }); FLASH.push({ t: 1.01, a: .8, d: .4, c: '#d9ffe9' }); SHAKE.push({ t: 1.03, amp: 26, d: .45 });
HIT(2.87, 540, 1345, { n: 40, R: 620, sp: 420 });
ZOOM.push({ t: 3.83, d: .24 });

// S2 — what the course is + 0 → 1000 (3.83 – 10.75)
scene(3.83, 10.75, r => {
  const bgA = photoBG(r, A.loki_think, { s0: 1.12, s1: 1.25, y0: 40, y1: -40, tint: .68, op: t => 1 - P(t, 7.0, 7.1) });
  const bgB = photoBG(r, A.crowd_hall, { s0: 1.25, s1: 1.1, tint: .78, filter: GRADE + ' brightness(.75)', blur: 3, op: t => P(t, 7.0, 7.1) });
  const pill = el('div', 'pill', r); pill.innerHTML = '3 פרקים · חינם לגמרי'; at(pill, 540, 1160); tf(pill, { o: 0 });
  const logo = img(r, A.logo, 540, 640, 300); logo.style.borderRadius = '50%'; logo.style.boxShadow = '0 0 60px rgba(43,227,138,.7)';
  const name = T(r, 'kar metal', 'מארוול גיקים', 540, 905, 250);
  const ringD = 640;
  const ring = el('div', 'abs', r); at(ring, 540, 800); ring.style.width = ring.style.height = ringD + 'px';
  ring.innerHTML = `<svg width="${ringD}" height="${ringD}" style="filter:drop-shadow(0 0 14px #2BE38A)"><circle cx="${ringD / 2}" cy="${ringD / 2}" r="${ringD / 2 - 14}" fill="none" stroke="rgba(43,227,138,.18)" stroke-width="18"/>
     <circle class="pr" cx="${ringD / 2}" cy="${ringD / 2}" r="${ringD / 2 - 14}" fill="none" stroke="#7DFFB8" stroke-width="18" stroke-linecap="round" transform="rotate(-90 ${ringD / 2} ${ringD / 2})"/></svg>`;
  const pr = ring.querySelector('.pr'), C = 2 * Math.PI * (ringD / 2 - 14); pr.setAttribute('stroke-dasharray', C);
  const num = T(r, 'bebas neon', '0', 540, 815, 380);
  const fol = T(r, 'kar metal', 'עוקבים', 540, 1165, 180);
  const half = el('div', 'pill', r); half.innerHTML = 'בפחות מחצי שנה'; at(half, 540, 1295); tf(half, { o: 0 });
  return t => {
    bgA(t, 3.83, 7.05); bgB(t, 7.0, 10.75);
    A_(pill, t, 4.3, 6.3, 'pop');
    A_(logo, t, 6.15, 7.05, 'pop', { f: '' });
    A_(name, t, 6.35, 7.05, 'slam');
    // counter
    const v = t < 7.55 ? 0 : Math.round(1000 * E.out(clamp((t - 7.55) / .8)));
    num.firstChild.textContent = String(v);
    A_(num, t, 7.09, 10.75, 'slam', { s: v >= 1000 ? 1 + .06 * Math.max(0, 1 - (t - 8.35) / .3) : 1 });
    A_(ring, t, 7.09, 10.75, 'fade', { r: t * 6 });
    pr.setAttribute('stroke-dashoffset', C * (1 - v / 1000));
    A_(fol, t, 8.43, 10.75, 'blur');
    A_(half, t, 8.85, 10.75, 'pop');
  };
});
FLASH.push({ t: 7.05, a: .55, d: .3 }); HIT(7.09, 540, 815, { n: 30, R: 500, flare: false });
HIT(8.35, 540, 815, { n: 90, R: 900, sp: 700 }); SHAKE.push({ t: 8.35, amp: 16, d: .35 });
WHIP.push({ t: 10.75, d: .18, dir: 1 });

// S3 — the journey: path, decisions, mistakes, lessons (10.75 – 16.33)
scene(10.75, 16.33, r => {
  const bg = seqBG(r, 'orion2', { speed: .45, tint: .75, filter: 'contrast(1.15) brightness(.5) saturate(1.1)', s0: 1.15, s1: 1.3, dur: 6 });
  const items = [
    { n: '01', t: 'הדרך', ic: 'route', ph: HERO('ironman', 2, A.doom_galaxy), at: 10.95 },
    { n: '02', t: 'ההחלטות', ic: 'fork', ph: A.loki_think, at: 12.45 },
    { n: '03', t: 'הטעויות', ic: 'x', ph: HERO('spiderman', 1, A.loki_cross), at: 13.91 },
    { n: '04', t: 'מה למדתי', ic: 'bulb', ph: A.hiddleston_crop, at: 14.77 },
  ];
  const line = el('div', 'abs', r); at(line, 540, 820); line.style.width = '1080px'; line.style.height = '900px';
  line.innerHTML = `<svg width="1080" height="900" style="filter:drop-shadow(0 0 10px #2BE38A)"><path class="ln" d="M 930 60 C 1010 160, 1010 230, 905 290 S 880 450, 960 520 S 1000 690, 905 760" fill="none" stroke="#7DFFB8" stroke-width="6" stroke-linecap="round"/></svg>`;
  const ln = line.querySelector('.ln'), L = ln.getTotalLength(); ln.setAttribute('stroke-dasharray', L);
  const cards = items.map((it, i) => {
    const c = el('div', 'card', r); c.style.height = '200px';
    c.innerHTML = `<img class="ph" src="${it.ph}"><div class="num">${it.n}</div><div class="ttl metal">${it.t}</div><div class="ic">${svgI(it.ic)}</div>`;
    c.querySelector('.ttl').style.fontSize = '120px'; c.querySelector('.ttl').style.top = '72px'; c.querySelector('.ic').style.top = '45px';
    at(c, 540 + (i % 2 ? -30 : 30), 480 + i * 228); tf(c, { o: 0 }); return c;
  });
  return t => {
    bg(t, 10.75);
    tf(line, { o: 1 }); ln.setAttribute('stroke-dashoffset', L * (1 - P(t, 10.95, 15.2, E.io)));
    cards.forEach((c, i) => {
      const it = items[i], nextAt = items[i + 1]?.at ?? 99;
      const dim = t > nextAt ? lerp(1, .55, P(t, nextAt, nextAt + .3)) : 1;
      A_(c, t, it.at, null, 'right', { p: 1400, ry: -22 * (1 - P(t, it.at, it.at + .5, E.out5)), mul: dim, s: 1 + .015 * Math.sin(t * 1.5 + i) });
    });
  };
});
[10.95, 12.45, 13.91, 14.77].forEach((t, i) => HIT(t + .12, 760, 480 + i * 228, { n: 22, R: 260, sp: 300, flare: false, life: .8 }));

// S4 — chapter 1: the base (16.33 – 22.47)
scene(16.33, 22.47, r => {
  const bg = seqBG(r, 'orion1', { speed: .5, tint: .62, s0: 1.2, s1: 1.05, dur: 6 });
  const bg2 = photoBG(r, A.booth_studios, { tint: .8, blur: 5, filter: GRADE + ' brightness(.45)', op: t => P(t, 17.4, 17.9) });
  const { big, lab } = chapterTitle(r, '01');
  const ttl = T(r, 'kar metal', 'הבסיס', 540, 905, 330);
  const rows = [['בניית עמוד', 'layout', 17.87], ['זהות ברורה', 'id', 18.59], ['קהל יעד מוגדר', 'users', 19.45], ['מטרה אמיתית', 'flag', 21.01]].map(([tx, ic, at0], i) => {
    const row = el('div', 'row', r); row.innerHTML = `<div class="chk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="width:68px;height:68px"><polyline class="ck" points="4 12.5 9.5 18 20 6.5"/></svg></div>
      <div style="width:84px;height:84px;color:#2BE38A;filter:drop-shadow(0 0 8px #2BE38A)">${svgI(ic)}</div><div class="heb9" style="font-size:80px">${tx}</div>`;
    row.style.width = '900px'; at(row, 540, 640 + i * 175); tf(row, { o: 0 });
    const ck = row.querySelector('.ck'); ck.setAttribute('stroke-dasharray', 30); return { row, ck, at0 };
  });
  return t => {
    bg(t, 16.33); bg2(t, 17.4, 22.47);
    const up = P(t, 17.35, 17.8, E.io);
    A_(lab, t, 16.37, null, 'blur', { y: -up * 120, s: lerp(1, .7, up) });
    A_(big, t, 16.37, null, 'slam', { y: -up * 330, s: lerp(1, .42, up), mul: lerp(1, .35, up) });
    A_(ttl, t, 16.71, null, 'slam', { y: -up * 450, s: lerp(1, .5, up) });
    rows.forEach(({ row, ck, at0 }) => { A_(row, t, at0, null, 'right'); ck.setAttribute('stroke-dashoffset', 30 * (1 - P(t, at0 + .15, at0 + .45))); });
  };
});
GLITCH.push({ t: 16.33, d: .22 }); FLASH.push({ t: 16.37, a: .55, d: .25, c: '#bfffdc' }); HIT(16.71, 540, 905, { n: 80, R: 1000 }); SHAKE.push({ t: 16.71, amp: 18, d: .35 });
[17.87, 18.59, 19.45, 21.01].forEach((t, i) => HIT(t + .3, 920, 640 + i * 175, { n: 18, R: 160, sp: 220, flare: false, life: .7 }));

// S5 — chapter 2: content that brings an audience (22.47 – 25.67)
scene(22.47, 25.67, r => {
  const bg = seqBG(r, 'orion2', { speed: .6, offset: 40, tint: .55, s0: 1.3, s1: 1.1, dur: 3.2 });
  const { big, lab } = chapterTitle(r, '02');
  const ttl = T(r, 'kar metal', 'יצירת תוכן', 540, 905, 290);
  const sub = T(r, 'heb9 neon', 'שמביא קהל', 540, 1150, 110);
  return t => {
    bg(t, 22.47);
    A_(lab, t, 22.5, null, 'blur'); A_(big, t, 22.5, null, 'slam', { s: 1 + (t - 22.5) * .03 });
    A_(ttl, t, 23.29, null, 'slam'); A_(sub, t, 24.81, null, 'up');
  };
});
GLITCH.push({ t: 22.47, d: .24 }); FLASH.push({ t: 22.5, a: .45, d: .22, c: '#bfffdc' }); HIT(23.29, 540, 905, { n: 80, R: 1000 }); SHAKE.push({ t: 23.29, amp: 16, d: .3 });
HIT(24.81, 540, 1150, { n: 30, R: 500, flare: false });
WHIP.push({ t: 25.67, d: .18, dir: -1 });

// S6 — content: the most important thing, posts that stop the scroll, engagement (25.67 – 36.95)
scene(25.67, 36.95, r => {
  const bgA = photoBG(r, A.loki_stage, { s0: 1.1, s1: 1.35, tint: .7, op: t => 1 - P(t, 29.35, 29.5) });
  const bgB = photoBG(r, A.booth, { s0: 1.2, s1: 1.05, tint: .85, blur: 10, filter: GRADE + ' brightness(.4)', op: t => P(t, 29.35, 29.5) });
  const charge = el('div', 'abs', r); at(charge, 540, 960); charge.style.cssText += 'width:12px;height:900px;border-radius:12px;background:linear-gradient(#B6FFD6,#2BE38A);box-shadow:0 0 30px #2BE38A,0 0 80px #2BE38A';
  const big = T(r, 'kar metal', 'התוכן', 540, 900, 470);
  // phone + feed
  const phone = el('div', 'phone', r); at(phone, 540, 830); tf(phone, { o: 0 });
  const feed = el('div', 'feed', phone);
  const pics = [HERO('ironman', 0, A.loki_window), A.doom_galaxy2, HERO('spiderman', 0, A.loki_young), HERO('thor', 1, A.hiddleston_wide), A.loki_dagger, HERO('capamerica', 1, A.doom_supercon), HERO('thanos', 0, A.loki_wondercon), HERO('blackpanther', 1, A.crowd), A.loki_stage, HERO('ironman', 1, A.doom_nycc22)];
  pics.forEach(p => { feed.insertAdjacentHTML('beforeend', `<div class="post"><div class="hd"><img src="${A.logo}"><span>מארוול גיקים</span></div><img class="im" src="${p}"><div class="ac">${svgI('heart', 2)}${svgI('comment', 2)}${svgI('share', 2)}</div><div class="lk">אהבו את זה ועוד אחרים</div></div>`); });
  const POSTH = 92 + 640 + 68 + 36 + 26; // approx post height
  const stopRing = el('div', 'abs', r); at(stopRing, 540, 830); stopRing.style.cssText += 'width:640px;height:1220px;border-radius:84px;border:6px solid #7DFFB8;box-shadow:0 0 40px #2BE38A';
  const chips = [['טריילרים', 215, 470], ['תיאוריות', 870, 610], ['חדשות מארוול', 220, 860], ['דירוגים', 880, 1030], ['השוואות', 250, 1210]].map(([tx, x, y]) => { const c = el('div', 'chip', r); c.textContent = tx; at(c, x, y); tf(c, { o: 0 }); return c; });
  const btns = [['share', 'לשתף', 810, 35.25], ['comment', 'להגיב', 540, 35.75], ['userplus', 'לעקוב', 270, 36.21]].map(([ic, tx, x, t0]) => {
    const b = el('div', 'btn', r); b.innerHTML = svgI(ic, 2) + `<div class="cap">${tx}</div>`; at(b, x, 1130); tf(b, { o: 0 }); return { b, t0, ic };
  });
  return t => {
    bgA(t, 25.67, 29.5); bgB(t, 29.35, 36.95);
    // build-up beam, then the word lands
    const ch = P(t, 26.0, 28.7, E.in);
    tf(charge, { o: t < 28.75 ? ch * .9 : 0, sy: lerp(.05, 1, ch), sx: 1 + ch * 2 });
    A_(big, t, 28.75, 29.45, 'slam', { s: 1 + (t - 28.75) * .05 });
    // phone
    const pin = P(t, 29.45, 29.95, E.out5), pout = P(t, 34.45, 34.85, E.io);
    const vis = t >= 29.45 && t < 36.95;
    tf(phone, { o: vis ? 1 : 0, y: (1 - pin) * 1300 - pout * 330, p: 1600, rx: (1 - pin) * 25, s: lerp(.82, .56, pout) });
    // scroll fast then stop on "עוצרים"
    const stopT = 30.93; let sc;
    if (t < stopT) sc = (t - 29.45) * 2300; else sc = (stopT - 29.45) * 2300 + 380 * E.out5(clamp((t - stopT) / .5));
    const target = Math.round(((stopT - 29.45) * 2300 + 380) / POSTH) * POSTH - 60;
    sc = t < stopT ? sc : lerp((stopT - 29.45) * 2300, target, E.out5(clamp((t - stopT) / .5)));
    feed.style.transform = `translateY(${(-sc).toFixed(1)}px)`;
    feed.style.filter = t < stopT - .05 && t > 29.6 ? 'blur(5px)' : '';
    const sr = t - stopT;
    tf(stopRing, { o: sr >= 0 && sr < .6 ? (1 - sr / .6) : 0, s: 1 + sr * .25, y: -pout * 330 });
    chips.forEach((c, i) => A_(c, t, 32.97 + i * .11, 34.6, 'pop', { s: 1 + (t > 33.43 && t < 33.9 ? .1 * Math.sin((t - 33.43) / .47 * Math.PI) : 0) }));
    btns.forEach(({ b, t0, ic }, i) => {
      A_(b, t, t0, null, 'pop');
      if (ic === 'userplus') { const k = P(t, 36.45, 36.6); b.style.background = k > .5 ? 'radial-gradient(circle at 50% 35%, #7DFFB8, #1EA864 70%)' : '';
        if (k > .5 && !b._done) { b.firstChild.outerHTML = svgI('check', 2.6); b.querySelector('.cap').textContent = 'במעקב'; b._done = 1; }
        if (k <= .5 && b._done) { b.firstChild.outerHTML = svgI('userplus', 2); b.querySelector('.cap').textContent = 'לעקוב'; b._done = 0; } }
    });
  };
});
HIT(28.75, 540, 900, { n: 110, R: 1100, sp: 800 }); FLASH.push({ t: 28.75, a: .9, d: .35 }); SHAKE.push({ t: 28.75, amp: 26, d: .45 });
HIT(30.93, 540, 830, { n: 26, R: 700, flare: false });
[35.25, 35.75, 36.21].forEach((t, i) => HIT(t + .1, [810, 540, 270][i], 1130, { n: 24, R: 260, sp: 300, flare: false, life: .8 }));
HIT(36.5, 270, 1130, { n: 40, R: 380, sp: 420, flare: false });
ZOOM.push({ t: 36.95, d: .22 });

// S7 — how I approached content for Marvel Gikim (36.95 – 42.95)
scene(36.95, 42.95, r => {
  const bg = seqBG(r, 'orion1', { speed: .4, offset: 70, tint: .78, filter: 'contrast(1.1) brightness(.38)', s0: 1.1, s1: 1.25, dur: 6 });
  const grid = el('div', 'abs', r); at(grid, 540, 840); grid.style.width = '960px'; grid.style.height = '960px'; grid.style.transformStyle = 'preserve-3d';
  const pics = [HERO('ironman', 2, A.loki_think), A.doom_galaxy, HERO('spiderman', 1, A.loki_stage), HERO('capamerica', 0, A.hiddleston_b), A.logo, HERO('thor', 0, A.doom_pax), HERO('blackpanther', 0, A.loki_young), A.loki_think, HERO('thanos', 0, A.loki_dagger)];
  const tiles = pics.map((p, i) => { const d = el('div', 'tile', grid); d.innerHTML = `<img src="${p}">` + (i === 4 ? '' : `<img class="wm" src="${A.logo}">`);
    d.style.left = (330 * (i % 3)) + 'px'; d.style.top = (330 * Math.floor(i / 3)) + 'px'; return d; });
  const chev = [0, 1, 2].map(i => { const c = el('div', 'abs', r); c.innerHTML = svgI('up', 2.4); c.style.width = c.style.height = '300px'; c.style.color = '#7DFFB8'; c.style.filter = 'drop-shadow(0 0 16px #2BE38A)'; at(c, 540, 980 - i * 120); tf(c, { o: 0 }); return c; });
  return t => {
    bg(t, 36.95);
    const rec = P(t, 41.3, 41.9, E.io);
    tf(grid, { p: 1800, rx: lerp(22, 12, P(t, 37, 42.9, E.io)), r: lerp(-7, -3, P(t, 37, 42.9)), s: lerp(.98, 1.05, P(t, 37, 41.3)) * lerp(1, .8, rec), o: lerp(1, .35, rec) });
    tiles.forEach((d, i) => {
      const t0 = 37.17 + [4, 1, 7, 3, 0, 5, 8, 2, 6][i] * .09; const k = P(t, t0, t0 + .45, E.out5);
      let s = lerp(1.8, 1, k), o = clamp((t - t0) / .15);
      if (i === 4) { const h = P(t, 39.39, 39.7, E.back); s *= 1 + .3 * h; d.style.boxShadow = h > .1 ? `0 0 ${40 + 50 * h}px rgba(43,227,138,.9)` : ''; d.style.zIndex = 5; d.style.borderRadius = lerp(22, 150, h) + 'px'; }
      d.style.transform = `translateZ(${((1 - k) * 600).toFixed(0)}px) scale(${s.toFixed(3)})`; d.style.opacity = t < t0 ? 0 : o;
    });
    chev.forEach((c, i) => { const t0 = 41.73 + i * .14; const ph = (t - t0) % .9; A_(c, t, t0, null, 'up', { mul: t >= t0 ? .55 + .45 * Math.max(0, 1 - ph / .9) : 0 }); });
  };
});
HIT(39.45, 540, 840, { n: 70, R: 800 }); FLASH.push({ t: 39.42, a: .35, d: .25 });
HIT(42.17, 540, 860, { n: 50, R: 700, sp: 500 });

// S8 — chapter 3: the road to growth + small page → community (42.95 – 49.25)
scene(42.95, 49.25, r => {
  const bgA = seqBG(r, 'aurora', { speed: .8, offset: 20, tint: .25, s0: 1.25, s1: 1.1, dur: 2.2, op: t => 1 - P(t, 44.95, 45.15) });
  const bgB = photoBG(r, A.crowd, { s0: 1.25, s1: 1.1, tint: .8, filter: GRADE + ' brightness(.42)', blur: 2, op: t => P(t, 44.95, 45.15) });
  const { big, lab } = chapterTitle(r, '03');
  const ttl = T(r, 'kar metal', 'הדרך לצמיחה', 540, 905, 270);
  const cv = el('canvas', 'full', r); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const R0 = rnd(4242), N = 320, CX = 540, CY = 820;
  const dots = Array.from({ length: N }, (_, i) => { const a = R0() * 6.2832, rr = 70 + Math.sqrt(R0()) * 420; return { x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr * 1.05, d: R0() * .7, s: 3 + R0() * 6 }; });
  const links = []; dots.forEach((p, i) => { const near = dots.map((q, j) => [j, (p.x - q.x) ** 2 + (p.y - q.y) ** 2]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2); near.forEach(([j]) => { if (i < j) links.push([i, j]); }); });
  const bubPics = [HERO('ironman', 0), HERO('spiderman', 2), HERO('capamerica', 1), HERO('thor', 1), HERO('blackpanther', 1), HERO('thanos', 1), HERO('hulk', 0), HERO('wanda', 0), HERO('strange', 0), A.loki_young, A.doom_nycc12, A.hiddleston_crop].filter(Boolean);
  const bubs = bubPics.map((p, i) => { const b = el('img', 'bub', r); b.src = p; const a = i / bubPics.length * 6.2832 + .3, rr = 300 + (i % 3) * 60; return { b, x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr, d: .05 * i }; });
  const av = img(r, A.logo, CX, CY, 170); av.style.borderRadius = '50%'; av.style.boxShadow = '0 0 50px rgba(43,227,138,.9)';
  const num = T(r, 'bebas neon', '1', 540, 1220, 230);
  const lbl = T(r, 'heb9', 'עוקבים', 540, 1350, 70);
  return t => {
    bgA(t, 42.95); bgB(t, 45.0, 49.25);
    A_(lab, t, 43.0, 45.05, 'blur'); A_(big, t, 43.0, 45.05, 'slam', { s: 1 + (t - 43) * .03 }); A_(ttl, t, 44.03, 45.05, 'slam');
    A_(av, t, 46.27, null, 'pop', { s: 1 + .05 * Math.sin(t * 4) });
    g.clearRect(0, 0, W, H);
    const t0 = 46.93;
    if (t >= t0) {
      g.globalCompositeOperation = 'lighter';
      const pos = dots.map(p => { const k = E.out5(clamp((t - t0 - p.d) / .9)); return { x: lerp(CX, p.x, k), y: lerp(CY, p.y, k), k, s: p.s }; });
      g.lineWidth = 1.6;
      for (const [i, j] of links) { const a = Math.min(pos[i].k, pos[j].k); if (a < .95) continue; g.strokeStyle = `rgba(110,255,175,${.35 * (a - .95) * 20 * Math.min(1, (t - t0 - .9) / .6)})`; g.beginPath(); g.moveTo(pos[i].x, pos[i].y); g.lineTo(pos[j].x, pos[j].y); g.stroke(); }
      for (const p of pos) { if (p.k <= 0) continue; g.globalAlpha = Math.min(1, p.k * 3); g.drawImage(sprite, p.x - p.s * 2, p.y - p.s * 2, p.s * 4, p.s * 4); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    bubs.forEach(({ b, x, y, d }, i) => { const k = E.back(clamp((t - t0 - .15 - d) / .55)); at(b, lerp(CX, x, Math.min(1, k)), lerp(CY, y, Math.min(1, k))); tf(b, { o: t < t0 + .15 + d ? 0 : clamp((t - t0 - .15 - d) / .1), s: lerp(.2, 1, k) * (1 + .04 * Math.sin(t * 3 + i)) }); });
    const v = t < t0 ? 1 : Math.round(1 + 999 * E.out(clamp((t - t0) / 1.0)));
    num.firstChild.textContent = v >= 1000 ? '1000?' : String(v);
    A_(num, t, 46.3, null, 'blur'); A_(lbl, t, 46.5, null, 'blur');
  };
});
GLITCH.push({ t: 42.95, d: .22 }); FLASH.push({ t: 43.0, a: .45, d: .22, c: '#bfffdc' }); HIT(44.03, 540, 905, { n: 80, R: 1000 }); SHAKE.push({ t: 44.03, amp: 16, d: .3 });
WHIP.push({ t: 45.05, d: .16, dir: 1 }); HIT(46.93, 540, 820, { n: 120, R: 900, sp: 600 }); HIT(47.95, 540, 1220, { n: 30, R: 400, flare: false });
WHIP.push({ t: 49.25, d: .18, dir: -1 });

// S9 — the last chapter: five growth pillars (49.25 – 55.1)
scene(49.25, 55.1, r => {
  const bg = seqBG(r, 'orion1', { speed: .5, offset: 20, tint: .8, filter: 'contrast(1.1) brightness(.35)', s0: 1.3, s1: 1.15, dur: 6 });
  const chart = el('div', 'abs', r); at(chart, 540, 960); chart.style.width = '1080px'; chart.style.height = '1920px';
  chart.innerHTML = `<svg width="1080" height="1920"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(43,227,138,.35)"/><stop offset="1" stop-color="rgba(43,227,138,0)"/></linearGradient></defs>
    <path class="ar" d="M -20 1500 L 120 1420 L 260 1450 L 400 1280 L 540 1310 L 680 1080 L 820 1010 L 960 720 L 1100 520 L 1100 1920 L -20 1920 Z" fill="url(#ga)"/>
    <path class="cl" d="M -20 1500 L 120 1420 L 260 1450 L 400 1280 L 540 1310 L 680 1080 L 820 1010 L 960 720 L 1100 520" fill="none" stroke="#7DFFB8" stroke-width="8" stroke-linejoin="round" style="filter:drop-shadow(0 0 12px #2BE38A)"/></svg>`;
  const cl = chart.querySelector('.cl'), ar = chart.querySelector('.ar'), L = cl.getTotalLength(); cl.setAttribute('stroke-dasharray', L);
  const head = T(r, 'label', 'ה פ ר ק   ה א ח ר ו ן', 540, 440); head.firstChild.style.fontSize = '44px';
  const ps = [['עקביות', 'repeat', 50.73], ['חשיפה', 'eye', 51.19], ['שיתופי פעולה', 'link', 51.87], ['הבנת הקהל', 'users', 52.91], ['ניתוח הביצועים', 'chart', 53.69]].map(([tx, ic, t0], i) => {
    const p = el('div', 'pillar', r); p.innerHTML = `<div class="ic">${svgI(ic, 2)}</div><div class="tx">${tx}</div>`; at(p, 540, 590 + i * 168); tf(p, { o: 0 }); return { p, t0 }; });
  return t => {
    bg(t, 49.25);
    const k = P(t, 49.4, 54.6, E.io); cl.setAttribute('stroke-dashoffset', L * (1 - k)); ar.style.opacity = k * .9; tf(chart, { o: .85 });
    A_(head, t, 49.31, null, 'blur');
    ps.forEach(({ p, t0 }) => A_(p, t, t0, null, 'right'));
  };
});
[50.73, 51.19, 51.87, 52.91, 53.69].forEach((t, i) => HIT(t + .08, 900, 590 + i * 168, { n: 22, R: 300, sp: 300, flare: i === 4, life: .8 }));
FLASH.push({ t: 55.1, a: .45, d: .25 });

// S10 — insights from my path → your page (55.1 – 59.95)
scene(55.1, 59.95, r => {
  const bg = seqBG(r, 'aurora', { speed: .5, offset: 90, tint: .55, filter: 'contrast(1.1) brightness(.42)', s0: 1.15, s1: 1.3, dur: 5 });
  const spark = el('div', 'abs', r); spark.innerHTML = svgI('sparkle', 1.6); spark.style.cssText += 'width:230px;height:230px;color:#B6FFD6;filter:drop-shadow(0 0 18px #2BE38A) drop-shadow(0 0 40px #2BE38A)'; at(spark, 540, 470); tf(spark, { o: 0 });
  const my = img(r, A.logo, 790, 840, 330); my.style.borderRadius = '50%'; my.style.boxShadow = '0 0 60px rgba(43,227,138,.8)';
  const yours = el('div', 'abs', r); yours.innerHTML = `<div style="width:330px;height:330px;border-radius:50%;border:6px dashed #7DFFB8;display:grid;place-items:center;background:rgba(5,38,26,.7);box-shadow:0 0 40px rgba(43,227,138,.5)"><div style="width:170px;height:170px;color:#E9FFF3">${svgI('user', 1.6)}</div></div>`; at(yours, 290, 840); tf(yours, { o: 0 });
  const l1 = T(r, 'heb9 metal', 'הדרך שלי', 790, 1080, 74), l2 = T(r, 'heb9 metal', 'העמוד שלכם', 290, 1080, 74);
  const cv = el('canvas', 'full', r); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  return t => {
    bg(t, 55.1);
    A_(spark, t, 55.93, null, 'pop', { r: (t - 55.93) * 40, s: 1 + .08 * Math.sin(t * 5) });
    A_(my, t, 55.2, null, 'pop'); A_(l1, t, 56.93, null, 'blur');
    A_(yours, t, 57.5, null, 'pop', { r: (t - 57.5) * -20 }); A_(l2, t, 59.13, null, 'blur');
    g.clearRect(0, 0, W, H);
    if (t > 57.6) { g.globalCompositeOperation = 'lighter'; const k = P(t, 57.6, 58.2);
      const gr = g.createLinearGradient(625, 0, 455, 0); gr.addColorStop(0, 'rgba(182,255,214,.9)'); gr.addColorStop(1, 'rgba(43,227,138,.9)');
      g.fillStyle = gr; g.shadowColor = '#2BE38A'; g.shadowBlur = 30; g.fillRect(lerp(625, 455, k), 834, (625 - 455) * k, 12); g.shadowBlur = 0;
      for (let i = 0; i < 14; i++) { const ph = ((t - 57.6) * 1.6 + i / 14) % 1; const x = lerp(625, 455, ph), y = 840 + Math.sin(ph * 9 + i) * 26; g.globalAlpha = Math.sin(ph * Math.PI) * k; g.drawImage(sprite, x - 22, y - 22, 44, 44); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  };
});
HIT(55.95, 540, 470, { n: 40, R: 420, flare: true }); HIT(59.2, 290, 840, { n: 40, R: 420, flare: false });
DIPS.push([59.78, 59.95, 59.97, 60.2]);

// S11 — the big idea: every big page starts at 0 (59.95 – 65.21)
scene(59.95, 65.21, r => {
  const bg = el('div', 'bg', r); bg.style.background = 'radial-gradient(ellipse 80% 60% at 50% 55%, #0b3d24 0%, #020604 70%)';
  const doom = img(r, A.doom_cut, 540, 1080, 1000, 2040); doom.style.objectFit = 'contain'; 
  doom.style.webkitMaskImage = 'linear-gradient(180deg,#000 55%,transparent 92%)';
  const h1 = T(r, 'label', 'ה כ י   ח ש ו ב', 540, 560); h1.firstChild.style.fontSize = '52px';
  const h2 = T(r, 'kar metal', 'תזכרו', 540, 780, 300);
  const q1 = T(r, 'heb9', 'כל עמוד גדול', 540, 560, 110);
  const q2 = T(r, 'heb9', 'מתחיל מ-', 540, 720, 110);
  const zero = T(r, 'bebas neon', '0', 540, 1080, 760);
  const a1 = T(r, 'label', 'ה ש א ל ה   ה י א', 540, 520); a1.firstChild.style.fontSize = '50px';
  const a2 = T(r, 'kar metal', 'מה אתם עושים', 540, 760, 240);
  const a3 = T(r, 'heb9 neon', 'מההתחלה שלכם', 540, 1010, 120);
  const ul = el('div', 'abs', r); ul.style.cssText += 'width:820px;height:10px;border-radius:10px;background:linear-gradient(90deg,#2BE38A,#B6FFD6);box-shadow:0 0 24px #2BE38A'; at(ul, 540, 1100); tf(ul, { o: 0 });
  return t => {
    tf(doom, { o: lerp(0, .85, P(t, 60.0, 61.0)), s: lerp(1.05, 1.16, P(t, 60, 65.2, E.lin)), y: lerp(140, 80, P(t, 60, 65.2, E.lin)), f: 'grayscale(.35) brightness(.38) contrast(1.25) drop-shadow(0 0 40px rgba(43,227,138,.4))' });
    A_(h1, t, 60.0, 61.0, 'blur'); A_(h2, t, 60.59, 61.02, 'slam');
    A_(q1, t, 61.07, 62.65, 'blur'); A_(q2, t, 62.05, 62.65, 'blur');
    const zb = P(t, 62.67, 63.2, E.io);
    A_(zero, t, 62.31, null, 'slam', { s: lerp(1, 1.5, zb), mul: lerp(1, .16, zb), y: zb * 60 });
    A_(a1, t, 62.67, null, 'blur'); A_(a2, t, 63.37, null, 'slam'); A_(a3, t, 64.37, null, 'up');
    tf(ul, { o: t > 64.6 ? 1 : 0, sx: P(t, 64.6, 65.0, E.out5) });
  };
});
HIT(60.62, 540, 780, { n: 40, R: 600, flare: true });
HIT(62.31, 540, 1080, { n: 140, R: 1200, sp: 900 }); FLASH.push({ t: 62.31, a: .85, d: .4, c: '#d9ffe9' }); SHAKE.push({ t: 62.31, amp: 32, d: .55 });
HIT(63.4, 540, 760, { n: 40, R: 700 });

// S12 — let's go: a course every two days, free, no sign-up (65.21 – 71.5)
scene(65.21, 71.5, r => {
  const bg = seqBG(r, 'aurora', { speed: .9, offset: 10, tint: .25, filter: 'contrast(1.15) brightness(.7) saturate(1.2)', s0: 1.3, s1: 1.1, dur: 6.3 });
  const y1 = T(r, 'kar metal', 'יאללה', 540, 640, 330), y2 = T(r, 'kar metal', 'מתחילים!', 540, 900, 330);
  const rem = T(r, 'label', 'א ל   ת ש כ ח ו', 540, 600); rem.firstChild.style.fontSize = '50px';
  const bd = [['calendar', 'קורס חדש כל יומיים', 67.13], ['tag', 'חינם לגמרי', 69.55], ['noform', 'ללא הרשמה', 70.47]].map(([ic, tx, t0], i) => {
    const b = el('div', 'badge', r); b.innerHTML = `<div class="ic">${svgI(ic, 1.9)}</div><div class="tx">${tx}</div>`; at(b, 540, 860 + i * 235); tf(b, { o: 0 }); return { b, t0 }; });
  return t => {
    bg(t, 65.21);
    const up = P(t, 66.1, 66.5, E.io);
    A_(y1, t, 65.21, 66.5, 'slam'); A_(y2, t, 65.45, 66.5, 'slam');
    A_(rem, t, 66.19, null, 'blur');
    bd.forEach(({ b, t0 }) => A_(b, t, t0, null, 'right'));
  };
});
HIT(65.25, 540, 760, { n: 150, R: 1250, sp: 950 }); FLASH.push({ t: 65.21, a: 1, d: .45 }); SHAKE.push({ t: 65.25, amp: 34, d: .55 });
[67.13, 69.55, 70.47].forEach((t, i) => HIT(t + .1, 900, 860 + i * 235, { n: 26, R: 340, sp: 340, flare: i === 0, life: .8 }));
ZOOM.push({ t: 71.5, d: .22 });

// S13 — finale: let's start, be strong, we're doing this + lockup (71.5 – 79.5)
scene(71.5, 79.6, r => {
  const bg = seqBG(r, 'aurora', { speed: .55, offset: 120, tint: .3, filter: 'contrast(1.15) brightness(.55) saturate(1.2)', s0: 1.1, s1: 1.3, dur: 8 });
  const rays = el('div', 'abs', r); at(rays, 540, 760); rays.style.cssText += 'width:1800px;height:1800px;border-radius:50%;background:repeating-conic-gradient(from 0deg, rgba(43,227,138,.16) 0deg 6deg, rgba(0,0,0,0) 6deg 18deg);-webkit-mask-image:radial-gradient(circle, #000 20%, transparent 68%)';
  const rings = makeRings(r, 540, 760, 760);
  const logo = img(r, A.logo, 540, 760, 520); logo.style.borderRadius = '50%'; logo.style.boxShadow = '0 0 100px rgba(43,227,138,.7)';
  const s1 = T(r, 'kar metal', 'בואו נתחיל!', 540, 1215, 250);
  const s2 = T(r, 'kar metal', 'תהיו איתנים', 540, 1215, 250);
  const s3 = T(r, 'heb9 neon', 'ואנחנו עושים את זה', 540, 1215, 96);
  const n1 = T(r, 'kar metal', 'מארוול גיקים', 540, 1190, 230);
  const n2 = T(r, 'label', 'הקורס  ·  קורס חדש כל יומיים  ·  חינם', 540, 1330); n2.firstChild.style.fontSize = '36px'; n2.firstChild.style.letterSpacing = '.08em';
  return t => {
    bg(t, 71.5);
    tf(rays, { o: P(t, 71.6, 72.4) * .9, r: t * 8, s: 1 + .03 * Math.sin(t) });
    rings(t, { s: lerp(.5, 1, P(t, 71.55, 72.3, E.out5)), o: P(t, 71.55, 71.9) });
    const k = P(t, 71.53, 71.95, E.expo); tf(logo, { s: lerp(2.6, 1, k) * (1 + .02 * Math.sin(t * 2)), o: clamp((t - 71.53) / .1), blur: (1 - k) * 22 });
    A_(s1, t, 72.17, 73.3, 'slam'); A_(s2, t, 73.31, 74.9, 'slam'); A_(s3, t, 74.91, 77.45, 'up');
    A_(n1, t, 77.56, null, 'slam'); A_(n2, t, 77.85, null, 'blur', { d: .5 });
  };
});
HIT(71.6, 540, 760, { n: 130, R: 1200, sp: 850 }); FLASH.push({ t: 71.55, a: .75, d: .4, c: '#d9ffe9' }); SHAKE.push({ t: 71.6, amp: 24, d: .45 });
HIT(72.2, 540, 1215, { n: 50, R: 700 }); HIT(73.35, 540, 1215, { n: 50, R: 700 }); HIT(77.57, 540, 760, { n: 130, R: 1200, sp: 850 }); SHAKE.push({ t: 77.57, amp: 20, d: .45 });
FLASH.push({ t: 77.55, a: .7, d: .45, c: '#d9ffe9' });
DIPS.push([79.0, 79.5, 99, 100]);

// ---------- frame entry ----------
window.DURATION = 79.5;
window.renderFrame = async t => {
  pending.length = 0;
  for (const s of SCENES) { const on = t >= s.t0 && t < s.t1; s.root.style.display = on ? 'block' : 'none'; if (on) { const k = clamp((t - s.t0) / (s.t1 - s.t0)); s.root.style.transform = `scale(${(1 + .035 * k).toFixed(4)})`; s.update(t); } }
  applyGlobal(t); drawFX(t); drawGrain(t); drawCaps(t); drawBug(t);
  await Promise.all(pending);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.READY = (async () => {
  const fams = ['700 100px Karantina', '300 50px Heebo', '500 50px Heebo', '800 50px Heebo', '900 50px Heebo', '400 50px "Bebas Neue"'];
  await Promise.all(fams.map(f => document.fonts.load(f, 'אבגדה abc 0123')));
  await document.fonts.ready;
  await Promise.all([...document.images].filter(i => i.getAttribute('src')).map(i => i.decode().catch(() => console.error('img fail', i.src))));
  return true;
})();
})();
