// Realistic edit engine: full-frame photo/footage shots, camera moves, 2.5D parallax, transition library.
// Version via ?v=cinema|hype|doc|green. Every frame is a pure function of t.
(() => {
const W = 1080, H = 1920;
const VKEY = new URLSearchParams(location.search).get('v') || 'cinema';
document.body.className = VKEY;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  lin: x => x, out: x => 1 - Math.pow(1 - x, 3), out5: x => 1 - Math.pow(1 - x, 5), in: x => x * x * x, in2: x => x * x,
  io: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), sine: x => .5 - .5 * Math.cos(Math.PI * x),
  expo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  back: x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const P = (t, a, b, e = E.out) => e(clamp((t - a) / (b - a)));
function rnd(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const H1 = (n) => { const r = rnd(n * 2654435761 + 12345); r(); return r(); };

// ---------------- versions ----------------
const VERS = {
  cinema: { grade: 'contrast(1.14) saturate(0.8) brightness(0.9)', tint: [['soft-light', '#14606c', .5], ['soft-light', '#ff8a3d', .14]],
    letterbox: 112, grain: .11, halation: .2, camera: 'push', parallax: 1, shake: 0, gap: 1.7,
    pool: ['dissolve', 'lightleak', 'dissolve', 'burn', 'zoomSoft', 'lightleak', 'dip'], chapter: 'burn', music: 676 },
  hype: { grade: 'contrast(1.28) saturate(1.22) brightness(0.98)', tint: [['soft-light', '#000000', .12]],
    letterbox: 0, grain: .06, halation: .08, camera: 'punch', parallax: .45, shake: 5, gap: .55,
    pool: ['whip', 'zoom', 'glitch', 'spin', 'push', 'whip', 'flashcut', 'zoom', 'whipV'], chapter: 'glitch', music: 680 },
  doc: { grade: 'contrast(1.04) saturate(0.95) brightness(1.0) sepia(0.12)', tint: [['soft-light', '#ffb070', .14]],
    letterbox: 0, grain: .07, halation: .07, camera: 'pan', parallax: 1, shake: 1.6, gap: 2.4,
    pool: ['dissolve', 'push', 'wipe', 'dissolve', 'iris', 'push', 'dip'], chapter: 'dip', music: 79 },
  green: { grade: 'grayscale(0.6) contrast(1.45) brightness(0.74)', tint: [['color', '#13a35e', .58], ['multiply', '#8fd0aa', .45], ['soft-light', '#000000', .2]],
    letterbox: 0, grain: .1, halation: .18, camera: 'push', parallax: .8, shake: 2, gap: 1.0,
    pool: ['ink', 'glitch', 'leakG', 'zoom', 'iris', 'ink', 'glitch', 'whip'], chapter: 'ink', music: 140 },
};
Object.assign(VERS, {
  gold: { grade: 'contrast(1.24) saturate(0.78) brightness(0.8) sepia(0.2)', tint: [['soft-light', '#ffb347', .22], ['soft-light', '#000000', .28]],
    letterbox: 150, grain: .07, halation: .22, camera: 'luxe', parallax: 1.25, shake: 0, gap: 2.0, lux: 1,
    pool: ['blurdis', 'sweep', 'glint', 'luma', 'goldleak', 'sweep', 'blurdis', 'iris', 'dissolve'], chapter: 'glint', particles: ['255,214,140', 70], flare: '255,222,165', music: 614 },
  emerald: { grade: 'contrast(1.22) saturate(0.85) brightness(0.8)', tint: [['soft-light', '#0d6b45', .48], ['soft-light', '#ffcf70', .1], ['soft-light', '#000000', .22]],
    letterbox: 150, grain: .07, halation: .2, camera: 'luxe', parallax: 1.25, shake: 0, gap: 2.0, lux: 1,
    pool: ['luma', 'sweep', 'blurdis', 'glint', 'emleak', 'sweep', 'iris', 'blurdis', 'dissolve'], chapter: 'glint', particles: ['190,255,215', 60], flare: '200,255,225', music: 606 },
  noir: { grade: 'grayscale(1) contrast(1.42) brightness(0.84)', tint: [['soft-light', '#000000', .15]],
    letterbox: 150, grain: .12, halation: .16, camera: 'luxe', parallax: 1.3, shake: 0, gap: 2.2, lux: 1,
    pool: ['blurdis', 'sweep', 'dissolve', 'luma', 'glint', 'sweep', 'dip', 'blurdis'], chapter: 'dip', particles: ['255,255,255', 40], flare: '255,255,255', music: 188 },
  platinum: { grade: 'contrast(1.18) saturate(0.55) brightness(0.88)', tint: [['soft-light', '#2d4f80', .4], ['soft-light', '#000000', .15]],
    letterbox: 150, grain: .06, halation: .22, camera: 'luxe', parallax: 1.25, shake: 0, gap: 1.9, lux: 1,
    pool: ['sweep', 'glint', 'blurdis', 'luma', 'zoomSoft', 'sweep', 'iris', 'dissolve'], chapter: 'glint', particles: ['205,228,255', 55], flare: '210,232,255', music: 184 },
});
const V = VERS[VKEY]; const LUX = !!V.lux; if (LUX) document.body.classList.add('lux');
const TDUR = { blurdis: .95, sweep: .95, glint: .85, luma: 1.05, goldleak: .95, emleak: .95, cut: 0, flashcut: .14, dissolve: .7, dip: .7, lightleak: .8, leakG: .7, burn: .7, zoomSoft: .5, zoom: .32, whip: .28, whipV: .28, spin: .34, push: .4, glitch: .24, iris: .55, wipe: .6, ink: .65, flash: .3 };
if (VKEY === 'doc') { TDUR.push = .55; TDUR.dissolve = .85; }
if (VKEY === 'hype') { TDUR.push = .3; }

// ---------------- media ----------------
const HERO = (tag, i = 0) => { const l = (A.heroes || {})[tag]; return l && l.length ? l[i % l.length] : null; };
const stem = p => p.split('/').pop().replace(/\.(jpg|png)$/, '');
const MEDIA = {};
function addPhoto(key, src) { if (src) MEDIA[key] = { type: 'photo', src, cut: (A.cuts || {})[stem(src)] || null }; }
['loki_window', 'loki_think', 'loki_dagger', 'loki_cross', 'loki_wondercon', 'loki_young', 'loki_stage', 'doom_studio', 'doom_galaxy', 'doom_galaxy2', 'doom_nycc12', 'doom_nycc22', 'doom_pax', 'hiddleston_wide', 'hiddleston_crop']
  .forEach(k => addPhoto(k, A[k]));
for (const [tag, list] of Object.entries(A.heroes || {})) list.forEach((p, i) => addPhoto(`${tag}_${i}`, p));
for (const [k, [n, dir]] of Object.entries(A.seq)) MEDIA[k] = { type: 'seq', n, dir };
MEDIA.doomdark = { type: 'comp', bg: 'orion2', fg: A.doom_cut };
MEDIA.black = { type: 'black' };
const has = k => !!MEDIA[k];
const pick = (...ks) => ks.find(has) || 'loki_think';

// ---------------- image loading + pre-grading ----------------
const IMG = {};
const loadImg = src => IMG[src] || (IMG[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(src); i.src = src; }));
const GR = {}; // graded canvases
function gradeCanvas(img, grade, tint, extra = '') {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d');
  g.filter = grade + (extra ? ' ' + extra : ''); g.drawImage(img, 0, 0); g.filter = 'none';
  for (const [mode, col, a] of tint) { g.globalCompositeOperation = mode; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  return c;
}
async function graded(src, extra = '') {
  const key = src + '|' + extra; if (GR[key]) return GR[key];
  const img = await loadImg(src); return (GR[key] = gradeCanvas(img, V.grade, V.tint, extra));
}
async function gradedCut(src) { // cutouts: grade colour but keep alpha
  const key = src + '|cut'; if (GR[key]) return GR[key];
  const img = await loadImg(src); const c = gradeCanvas(img, V.grade, [], '');
  const g = c.getContext('2d'); for (const [mode, col, a] of V.tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a * .8; g.fillStyle = col; if (mode === 'color' || mode === 'soft-light') g.globalCompositeOperation = 'source-atop'; g.fillRect(0, 0, c.width, c.height); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; return (GR[key] = c);
}
const FOCUS = { avengers_0: [.58, .5] };
async function focusOf(key) { // subject centre from the cutout alpha (0..1)
  if (FOCUS[key]) return FOCUS[key]; const m = MEDIA[key]; let f = [.5, .42];
  if (m && m.cut) { const img = await loadImg(m.cut); const c = document.createElement('canvas'); c.width = 64; c.height = Math.round(64 * img.naturalHeight / img.naturalWidth);
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); const d = g.getImageData(0, 0, c.width, c.height).data; let sx = 0, sy = 0, n = 0, top = c.height;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const a = d[(y * c.width + x) * 4 + 3]; if (a > 128) { sx += x; sy += y; n++; if (y < top) top = y; } }
    if (n > 20) f = [sx / n / c.width, Math.min(sy / n / c.height, (top / c.height) + .22)]; }
  return (FOCUS[key] = f);
}
const SEQC = new Map(); // LRU of graded footage frames
async function seqFrame(name, f, extra = '') {
  const m = MEDIA[name]; const src = m.dir + String(f + 1).padStart(4, '0') + '.jpg'; const key = src + extra;
  if (SEQC.has(key)) return SEQC.get(key);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(src); i.src = src; });
  const c = gradeCanvas(img, V.grade, V.tint, extra); SEQC.set(key, c); if (SEQC.size > 10) SEQC.delete(SEQC.keys().next().value); return c;
}

// ---------------- edit decision list ----------------
const FLIP = [pick('ironman_0'), pick('spiderman_1'), 'loki_think', pick('capamerica_0'), pick('thor_0'), 'doom_galaxy', pick('blackpanther_0'), pick('spiderman_2')];
const FS = .104;
// zones: [start, media pool, {noExtra}]
const ZONES = [
  [1.03, ['aurora'], { hold: 1 }],
  [3.83, ['loki_window', 'hiddleston_crop', 'loki_young']],
  [7.05, [pick('spiderman_0'), 'doom_pax', pick('ironman_0'), 'doom_nycc22']],
  [10.95, [pick('ironman_0')], { hold: 1 }], [12.45, ['loki_think'], { hold: 1 }], [13.91, [pick('spiderman_1')], { hold: 1 }], [14.77, ['hiddleston_crop', 'loki_stage']],
  [16.33, ['orion1'], { hold: 1 }],
  [17.87, [pick('capamerica_0'), 'doom_galaxy', pick('thor_0'), pick('blackpanther_1'), 'loki_dagger', pick('hulk_0')]],
  [22.47, ['orion2', 'aurora'], { hold: 1 }],
  [25.67, ['loki_stage', 'doom_nycc12', pick('thanos_0')]],
  [28.75, ['doomdark'], { hold: 1 }],
  [29.45, [pick('thor_1'), pick('spiderman_2'), pick('strange_0'), pick('blackpanther_0'), pick('capamerica_1'), pick('wanda_0'), pick('ironman_0'), pick('thanos_1'), 'loki_young', 'doom_galaxy2', pick('hulk_0'), pick('spiderman_0')]],
  [37.17, ['loki_window', 'doom_studio', 'loki_cross', 'doom_nycc22', 'loki_wondercon', 'hiddleston_wide']],
  [42.95, ['aurora'], { hold: 1 }],
  [45.05, [pick('avengers_0', 'spiderman_0'), pick('spiderman_0'), 'doom_pax']],
  [46.93, [pick('avengers_1', 'doom_nycc22'), 'doom_nycc22', pick('thanos_1')]],
  [49.25, ['orion1'], { hold: 1 }],
  [50.73, [pick('blackpanther_1')], { hold: 1 }], [51.19, [pick('capamerica_0')], { hold: 1 }], [51.87, [pick('avengers_1', 'thor_0')], { hold: 1 }], [52.91, [pick('spiderman_1')], { hold: 1 }], [53.69, ['loki_think', pick('ironman_0')]],
  [55.1, ['hiddleston_crop', 'loki_stage', 'loki_young']],
  [59.95, ['doomdark'], { hold: 1 }],
  [62.31, ['doom_galaxy', 'doom_nycc12', pick('thanos_0')]],
  [65.21, ['aurora', pick('ironman_0'), pick('wanda_0'), pick('spiderman_2'), pick('capamerica_1'), pick('strange_0'), pick('thor_1'), pick('blackpanther_0'), 'loki_dagger', pick('thanos_1'), pick('hulk_0')]],
  [71.5, ['aurora'], { hold: 1 }],
];
const END = 79.5;
function buildCuts() {
  const fixed = new Set([...(LUX ? [0] : FLIP.map((_, i) => +(i * FS).toFixed(3))), ...ZONES.map(z => z[0])]);
  const holds = ZONES.map((z, i) => z[2]?.hold ? [z[0], (ZONES[i + 1] || [END])[0]] : null).filter(Boolean);
  const inHold = t => holds.some(([a, b]) => t > a && t < b);
  let cuts = [...fixed].sort((a, b) => a - b);
  // candidate cut points: phrase starts (+ word starts for the fast edit)
  const cand = [];
  CAPTIONS.forEach(c => { cand.push(c.s); if (VKEY === 'hype') c.words.forEach((w, i) => { if (i > 0) cand.push(w.s); }); });
  cand.sort((a, b) => a - b);
  for (const t of cand) {
    if (t < 1.2 || t > 71.4 || inHold(t)) continue;
    const prev = Math.max(...cuts.filter(c => c <= t)), next = Math.min(...cuts.filter(c => c > t), END);
    if (t - prev >= V.gap && next - t >= V.gap * .6) { cuts.push(t); cuts.sort((a, b) => a - b); }
  }
  // the fast edit: never hold a photo longer than ~1.15 s outside holds
  if (VKEY === 'hype') { let changed = true; while (changed) { changed = false; for (let i = 0; i < cuts.length; i++) { const a = cuts[i], b = cuts[i + 1] ?? END; if (b - a > 1.25 && !inHold((a + b) / 2) && a > 1.2 && a < 71.4) { cuts.splice(i + 1, 0, +((a + b) / 2).toFixed(3)); changed = true; break; } } } }
  return cuts;
}
const KEYT_ = { 1.03: LUX ? 'glint' : 'flash', 16.33: V.chapter, 22.47: V.chapter, 42.95: V.chapter, 28.75: VKEY === 'hype' ? 'zoom' : (VKEY === 'green' ? 'glitch' : 'flash'), 59.95: 'dip', 62.31: 'flash', 65.21: VKEY === 'hype' ? 'zoom' : 'flash', 71.5: { cinema: 'lightleak', hype: 'spin', doc: 'dissolve', green: 'ink' }[VKEY] };
const KEYT = Object.assign({}, KEYT_, LUX ? { 28.75: 'glint', 62.31: 'glint', 65.21: 'glint', 71.5: VKEY === 'noir' ? 'dip' : 'sweep' } : {});
function buildEDL() {
  const cuts = buildCuts(); const shots = []; const zc = {};
  cuts.forEach((t0, i) => {
    const t1 = cuts[i + 1] ?? END; let media;
    if (t0 < 1.0) media = LUX ? 'black' : (FLIP[i] || FLIP[0]);
    else { let zi = 0; ZONES.forEach((z, j) => { if (t0 >= z[0] - 1e-6) zi = j; }); const pool = ZONES[zi][1].filter(has); zc[zi] = (zc[zi] ?? -1) + 1; media = pool[zc[zi] % pool.length] || 'aurora'; }
    shots.push({ i, t0, t1, media });
  });
  let pi = 0; const trans = shots.slice(1).map((s, k) => {
    const T = s.t0; let type = KEYT[+T.toFixed(2)];
    if (!type) type = T < 1.0 ? 'cut' : V.pool[(pi++) % V.pool.length];
    return { t: T, type, d: TDUR[type] ?? .4, dir: H1(k + 7) < .5 ? 1 : -1 };
  });
  return { shots, trans };
}
const EDL = buildEDL(); window.EDL = EDL;

// camera for a shot (normalised): scale, offset px, rotation
function camera(shot, t) {
  const r = rnd(shot.i * 977 + 31 + VKEY.length * 101); const a = r(), b = r(), c = r(), d = r();
  const len = Math.max(.4, shot.t1 - shot.t0 + .6); const k = clamp((t - shot.t0 + .3) / len);
  let s, x, y, rot = 0;
  if (V.camera === 'push') { const inn = a < .7; s = inn ? lerp(1.04, 1.16, E.sine(k)) : lerp(1.16, 1.05, E.sine(k)); x = lerp(-30, 30, b) * (2 * k - 1); y = lerp(-20, 20, c) * (2 * k - 1); }
  else if (V.camera === 'punch') { const q = E.expo(clamp((t - shot.t0) / .35)); s = lerp(1.22, 1.06, q) + .04 * k; x = (b - .5) * 60 * (1 - q); y = (c - .5) * 40 * (1 - q); rot = (d - .5) * 3 * (1 - q); }
  else if (V.camera === 'luxe') { const inn = a < .75; s = inn ? lerp(1.03, 1.11, E.sine(k)) : lerp(1.11, 1.04, E.sine(k)); x = lerp(-26, 26, b) * (2 * E.sine(k) - 1); y = lerp(-14, 14, c) * (2 * E.sine(k) - 1); }
  else { s = lerp(1.1, 1.16, E.sine(k)); const dir = a < .5 ? 1 : -1; x = dir * lerp(-70, 70, E.sine(k)); y = (b - .5) * 40 * (2 * k - 1); }
  if (V.shake) { const sh = V.shake; x += Math.sin(t * 7.3 + shot.i) * sh * .6 + Math.sin(t * 13.1) * sh * .4; y += Math.cos(t * 6.1 + shot.i * 2) * sh * .6; }
  return { s, x, y, rot, k };
}
// hits: punch-in + shake
const HITS = [[1.03, 1], [6.35, .5], [8.35, .8], [16.71, .7], [23.29, .7], [28.75, 1], [44.03, .7], [46.93, .6], [62.31, 1.2], [65.21, 1.2], [71.6, .8], [77.57, .9]];
function hitFx(t) { let s = 1, x = 0, y = 0; const amp = { cinema: .35, hype: 1.2, doc: .15, green: .8 }[VKEY] ?? .12;
  for (const [ht, w] of HITS) { const dt = t - ht; if (dt < 0 || dt > .6) continue; const q = Math.pow(1 - dt / .6, 2) * w * amp; s += .05 * q; x += Math.sin(dt * 90 + ht) * 26 * q; y += Math.cos(dt * 70 + ht * 3) * 26 * q; }
  return { s, x, y }; }

// ---------------- drawing ----------------
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const bufA = mk(), bufB = mk(), tmp = mk(), tmp2 = mk();
function placeRect(iw, ih, f, cam, fy = .44) { // cover-fit centred on the focus point
  const sc = Math.max(W / iw, H / ih) * cam.s, w = iw * sc, h = ih * sc;
  let ox = W / 2 - f[0] * w + cam.x, oy = H * fy - f[1] * h + cam.y;
  ox = clamp(ox, W - w, 0); oy = clamp(oy, H - h, 0); return [ox, oy, w, h];
}
async function drawShot(buf, shot, t) {
  const g = buf.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const m = MEDIA[shot.media]; const cam = camera(shot, t);
  g.save(); if (cam.rot) { g.translate(W / 2, H / 2); g.rotate(cam.rot * Math.PI / 180); g.translate(-W / 2, -H / 2); }
  if (m.type === 'black') { /* pure black: particles + flare carry the frame */ }
  else if (m.type === 'seq' || m.type === 'comp') {
    const sq = m.type === 'comp' ? MEDIA[m.bg] : m; const name = m.type === 'comp' ? m.bg : shot.media;
    let f = Math.floor((t - shot.t0) * 30 * .6) + shot.i * 17; const per = 2 * (sq.n - 1); f = ((f % per) + per) % per; if (f >= sq.n) f = per - f;
    const fr = await seqFrame(name, f, m.type === 'comp' ? 'brightness(0.55)' : '');
    const [ox, oy, w, h] = placeRect(fr.width, fr.height, [.5, .5], cam); g.drawImage(fr, ox, oy, w, h);
    if (m.type === 'comp') { const fg = await gradedCut(m.fg); const k = cam.k; const s = lerp(1.0, 1.1, E.sine(k)); const hh = H * 1.02 * s, ww = hh * fg.width / fg.height;
      g.globalAlpha = .95; g.drawImage(fg, W / 2 - ww / 2 + cam.x * .5, H - hh * .97 + 120 - 60 * k, ww, hh); g.globalAlpha = 1; }
  } else {
    const base = await graded(m.src); const f = await focusOf(shot.media); const par = V.parallax * (m.cut ? 1 : 0);
    if (par > 0) {
      const bcam = { ...cam, s: cam.s * (1 - .025 * par), x: cam.x - 26 * par * (cam.k - .5) * 2, y: cam.y };
      const bblur = await graded(m.src, VKEY === 'hype' ? '' : 'blur(3px)');
      const [bx, by, bw, bh] = placeRect(base.width, base.height, f, bcam); g.drawImage(bblur, bx, by, bw, bh);
      const fg = await gradedCut(m.cut); const fcam = { ...cam, s: cam.s * (1 + .03 * par), x: cam.x + 30 * par * (cam.k - .5) * 2 };
      const [fx, fy2, fw, fh] = placeRect(base.width, base.height, f, fcam);
      // match the cut-out geometry to the photo rect (the cutout is a resized copy of the photo)
      g.drawImage(fg, fx, fy2, fw, fh);
    } else { const [ox, oy, w, h] = placeRect(base.width, base.height, f, cam); g.drawImage(base, ox, oy, w, h); }
  }
  g.restore();
}
// directional / radial motion blur by averaging copies
function smear(dst, src, dx, dy, n = 8, alpha = 1) { const g = dst.getContext('2d'); for (let i = 0; i < n; i++) { g.globalAlpha = alpha / (i + 1) * (i === 0 ? 1 : 1); g.globalAlpha = i === 0 ? alpha : alpha / (i + 1); g.drawImage(src, dx * (i / (n - 1) - .5), dy * (i / (n - 1) - .5)); } g.globalAlpha = 1; }
function zoomCopies(g, src, s0, s1, rot0 = 0, rot1 = 0, n = 6, alpha = 1) { for (let i = 0; i < n; i++) { const k = n === 1 ? 0 : i / (n - 1); const s = lerp(s0, s1, k), r = lerp(rot0, rot1, k);
    g.save(); g.translate(W / 2, H / 2); g.rotate(r * Math.PI / 180); g.scale(s, s); g.translate(-W / 2, -H / 2); g.globalAlpha = i === 0 ? alpha : alpha / (i + 1); g.drawImage(src, 0, 0); g.restore(); } g.globalAlpha = 1; }
let NOISE = null;
function noiseField() { if (NOISE) return NOISE; const w = 135, h = 240, r = rnd(99); const base = []; const lay = (s) => { const gw = Math.ceil(w / s) + 2, gh = Math.ceil(h / s) + 2; const gr = Array.from({ length: gw * gh }, () => r()); return (x, y) => { const fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy), tx = E.sine(fx - ix), ty = E.sine(fy - iy);
      const v = (i, j) => gr[j * gw + i]; return lerp(lerp(v(ix, iy), v(ix + 1, iy), tx), lerp(v(ix, iy + 1), v(ix + 1, iy + 1), tx), ty); }; };
  const L = [lay(40), lay(16), lay(6)]; const a = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { a[y * w + x] = L[0](x, y) * .55 + L[1](x, y) * .3 + L[2](x, y) * .15; }
  // vertical bias: reveal sweeps upward
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = a[y * w + x] * .6 + (1 - y / h) * .4;
  return (NOISE = { a, w, h }); }
const mcan = document.createElement('canvas'); mcan.width = 135; mcan.height = 240; const mctx = mcan.getContext('2d'); const mdat = mctx.createImageData(135, 240);
function inkMask(p) { const { a, w, h } = noiseField(); const thr = lerp(-.05, 1.05, p); for (let i = 0; i < w * h; i++) { const v = clamp((thr - a[i]) / .07); mdat.data[i * 4 + 3] = v * 255; } mctx.putImageData(mdat, 0, 0); return mcan; }

function leak(g, p, color, t) { // light leak overlay, peak at p = .5
  const a = Math.sin(Math.PI * clamp(p)) ; if (a <= 0) return; g.globalCompositeOperation = 'screen';
  const spots = [[.15 + .5 * p, .25], [.85 - .4 * p, .6], [.4, .9 - .5 * p]];
  spots.forEach(([x, y], i) => { const R = 900 + 300 * i; const gr = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, R); const c = color[i % color.length];
    const LA = VKEY === 'cinema' ? .72 : .9; gr.addColorStop(0, c.replace('A', (a * .95 * LA).toFixed(3))); gr.addColorStop(.45, c.replace('A', (a * .35 * LA).toFixed(3))); gr.addColorStop(1, c.replace('A', '0')); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  g.globalCompositeOperation = 'source-over'; }
function rgbSplit(g, src, amt, alpha = .55) { if (amt < .5) return; g.globalCompositeOperation = 'screen'; g.globalAlpha = alpha; g.filter = 'sepia(1) saturate(9) hue-rotate(-50deg) brightness(.7)'; g.drawImage(src, amt, 0);
  g.filter = 'sepia(1) saturate(9) hue-rotate(140deg) brightness(.7)'; g.drawImage(src, -amt, 0); g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }

const small = document.createElement('canvas'); small.width = 135; small.height = 240; const sm2 = document.createElement('canvas'); sm2.width = 135; sm2.height = 240;
const blurA = mk(), blurB = mk();
function blurry(src, which = 0) { const s1 = which ? sm2 : small, out = which ? blurB : blurA; const sg = s1.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(src, 0, 0, 135, 240);
  const og = out.getContext('2d'); og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high'; og.drawImage(s1, 0, 0, W, H); return out; }
function glintStar(g, x, y, a) { if (a <= .01) return; const fc = V.flare || '255,255,255'; g.save(); g.globalCompositeOperation = 'screen';
  const core = g.createRadialGradient(x, y, 0, x, y, 420 * a + 40); core.addColorStop(0, `rgba(255,255,255,${a})`); core.addColorStop(.15, `rgba(${fc},${.8 * a})`); core.addColorStop(1, `rgba(${fc},0)`); g.fillStyle = core; g.fillRect(0, 0, W, H);
  for (const [w, h, al] of [[W * 1.1 * a + 200, 10, .95], [16, 900 * a + 120, .7], [W * .7 * a, 34, .35]]) { const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(w, h) / 2); gr.addColorStop(0, `rgba(255,255,255,${al * a})`); gr.addColorStop(.3, `rgba(${fc},${al * a * .7})`); gr.addColorStop(1, `rgba(${fc},0)`);
    g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(w / Math.max(w, h), h / Math.max(w, h)); g.beginPath(); g.arc(0, 0, Math.max(w, h) / 2, 0, 6.2832); g.fill(); g.restore(); }
  g.restore(); }
const PART = V.particles ? (() => { const [rgb, n] = V.particles; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(255,255,255,.95)`); gr.addColorStop(.2, `rgba(${rgb},.75)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const ps = Array.from({ length: n }, (_, i) => { const r = rnd(5000 + i * 13); return { x: r() * W, y: r() * H, sp: 10 + r() * 40, sz: 4 + Math.pow(r(), 3) * 70, ph: r() * 6.28, f: .2 + r() * .8, dx: (r() - .5) * 30, a: .25 + r() * .55 }; });
  return { c, ps }; })() : null;
function drawParticles(t) { if (!PART) return; const g = ctx; g.globalCompositeOperation = 'screen';
  for (const p of PART.ps) { const y = ((p.y - t * p.sp) % (H + 140) + H + 140) % (H + 140) - 70, x = p.x + Math.sin(t * p.f + p.ph) * 26 + p.dx * t * .2; g.globalAlpha = p.a * (.55 + .45 * Math.sin(t * 1.7 * p.f + p.ph * 3)) * (t < 1.1 ? clamp(t / .6) : 1);
    g.drawImage(PART.c, x - p.sz / 2, y - p.sz / 2, p.sz, p.sz); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
const LUXHITS = [[1.03, 760, 1.2], [6.35, 960, .7], [8.35, 900, .7], [16.71, 940, .8], [23.29, 940, .7], [28.75, 960, 1.1], [44.03, 940, .7], [62.31, 960, 1.1], [65.21, 900, 1.0], [71.6, 760, 1.0], [77.57, 1250, .9]];
function drawFlares(t) { if (!LUX) return; const g = ctx;
  if (t < 1.1) { const a = P(t, .1, 1.0, E.in2); g.save(); g.globalCompositeOperation = 'screen'; const fc = V.flare; const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, `rgba(${fc},0)`); gr.addColorStop(.5, `rgba(255,255,255,${.9 * a})`); gr.addColorStop(1, `rgba(${fc},0)`); g.fillStyle = gr; g.fillRect(0, 760 - 2 - 5 * a, W, 4 + 10 * a); g.restore(); }
  for (const [ht, y, w] of LUXHITS) { const dt = t - ht; if (dt < -.05 || dt > .9) continue; const a = (dt < 0 ? 1 + dt / .05 : Math.pow(1 - dt / .9, 1.6)) * w * .8;
    g.save(); g.globalCompositeOperation = 'screen'; const fc = V.flare; const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, `rgba(${fc},0)`); gr.addColorStop(.5, `rgba(255,255,255,${Math.min(1, a)})`); gr.addColorStop(1, `rgba(${fc},0)`);
    g.fillStyle = gr; g.fillRect(0, y - 3 - 6 * a, W, 6 + 12 * a); g.restore(); glintStar(g, W / 2, y, Math.min(1, a) * .55); } }
let FLASHV = 0, FLASHC = '#ffffff';
function composite(t, A_, B_, tr) { // A_, B_: canvases; tr: {type,p,dir}
  const g = ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  const { type, p, dir } = tr; const peak = 1 - Math.abs(p - .5) * 2;
  const draw = (c, a = 1) => { g.globalAlpha = a; g.drawImage(c, 0, 0); g.globalAlpha = 1; };
  switch (type) {
    case 'dissolve': draw(A_); draw(B_, E.sine(p)); break;
    case 'dip': if (p < .5) { draw(A_); g.fillStyle = `rgba(0,0,0,${E.sine(p * 2)})`; } else { draw(B_); g.fillStyle = `rgba(0,0,0,${1 - E.sine((p - .5) * 2)})`; } g.fillRect(0, 0, W, H); break;
    case 'flash': case 'flashcut': draw(p < .5 ? A_ : B_); FLASHV = Math.max(FLASHV, Math.pow(peak, type === 'flash' ? 1.5 : 1) * (type === 'flash' ? .95 : .8)); FLASHC = VKEY === 'green' ? '#d9ffe9' : (VKEY === 'cinema' ? '#fff2e0' : '#ffffff'); break;
    case 'lightleak': case 'leakG': draw(A_); draw(B_, E.sine(clamp((p - .3) / .4)));
      leak(g, p, type === 'leakG' ? ['rgba(60,255,150,A)', 'rgba(170,255,210,A)', 'rgba(20,160,90,A)'] : ['rgba(255,150,60,A)', 'rgba(255,90,60,A)', 'rgba(255,220,160,A)'], t); break;
    case 'burn': { draw(p < .5 ? A_ : B_); const a = Math.pow(peak, .8); g.globalCompositeOperation = 'screen';
      const cx = W * (dir > 0 ? .15 : .85), cy = H * .3; const R = lerp(300, 2400, peak);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, `rgba(255,255,240,${a})`); gr.addColorStop(.35, `rgba(255,170,70,${a * .9})`); gr.addColorStop(.7, `rgba(200,60,20,${a * .5})`); gr.addColorStop(1, 'rgba(120,20,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; break; }
    case 'zoomSoft': case 'zoom': { const strong = type === 'zoom' ? 1 : .45;
      if (p < .5) { const q = E.in2(p * 2); zoomCopies(g, A_, 1 + q * .5 * strong, 1 + q * 1.1 * strong, 0, 0, 6); }
      else { const q = 1 - E.out((p - .5) * 2); zoomCopies(g, B_, 1 + q * .35 * strong, 1 + q * .8 * strong, 0, 0, 6); }
      FLASHV = Math.max(FLASHV, Math.pow(peak, 3) * .35 * strong); FLASHC = '#ffffff'; break; }
    case 'spin': { if (p < .5) { const q = E.in2(p * 2); zoomCopies(g, A_, 1 + q * .5, 1 + q * .9, q * 25 * dir, q * 45 * dir, 6); }
      else { const q = 1 - E.out((p - .5) * 2); zoomCopies(g, B_, 1 + q * .3, 1 + q * .7, -q * 45 * dir, -q * 25 * dir, 6); } break; }
    case 'whip': case 'whipV': { const vert = type === 'whipV'; const tg = tmp.getContext('2d'); tg.clearRect(0, 0, W, H);
      const off = (c, d) => { tg.clearRect(0, 0, W, H); tg.drawImage(c, vert ? 0 : d, vert ? d : 0); };
      if (p < .5) { const q = E.in2(p * 2); off(A_, -dir * q * (vert ? H : W) * .9); } else { const q = 1 - E.out((p - .5) * 2); off(B_, dir * q * (vert ? H : W) * .9); }
      const amt = peak * (vert ? 520 : 380); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); smear(cv, tmp, vert ? 0 : amt, vert ? amt : 0, 9); break; }
    case 'push': { const q = E.io(p), sx = -dir * q * W; g.drawImage(A_, sx, 0); g.drawImage(B_, sx + dir * W, 0);
      if (VKEY !== 'doc') { tmp.getContext('2d').drawImage(cv, 0, 0); g.fillRect(0, 0, 0, 0); smear(cv, tmp, peak * 160, 0, 5, 1); } break; }
    case 'glitch': { const src = p < .5 ? A_ : B_; draw(src); const r = rnd(Math.floor(t * 30) * 131 + 7); const amp = Math.pow(peak, .7);
      for (let i = 0; i < 16; i++) { const y = r() * H, h = 8 + r() * 120, dx = (r() - .5) * 220 * amp; const s2 = r() < p ? B_ : A_; g.drawImage(s2, 0, y, W, h, dx, y, W, h); }
      rgbSplit(g, cv === null ? src : src, 18 * amp, .5 * amp);
      g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(43,227,138,${.18 * amp})`; for (let i = 0; i < 6; i++) g.fillRect(0, r() * H, W, 2 + r() * 10); g.globalCompositeOperation = 'source-over'; break; }
    case 'iris': { draw(A_); const R = E.io(p) * Math.hypot(W, H) * .55; const cx = W / 2, cy = H * .45;
      g.save(); g.beginPath(); g.arc(cx, cy, Math.max(1, R), 0, 6.2832); g.clip(); g.drawImage(B_, 0, 0); g.restore();
      if (R > 2 && p < .98) { g.strokeStyle = VKEY === 'green' ? 'rgba(140,255,195,.9)' : 'rgba(255,240,220,.8)'; g.lineWidth = 10 * peak + 2; g.shadowColor = VKEY === 'green' ? '#2BE38A' : '#ffcf8a'; g.shadowBlur = 40; g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.stroke(); g.shadowBlur = 0; } break; }
    case 'wipe': { draw(A_); const tg = tmp.getContext('2d'); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(B_, 0, 0);
      const pos = lerp(-.3, 1.3, E.io(p)); const gr = tg.createLinearGradient(W * (1 - pos) + 300, H * .2, W * (1 - pos) - 300, H * .8);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(.62, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = gr; tg.fillRect(0, 0, W, H); tg.globalCompositeOperation = 'source-over'; g.drawImage(tmp, 0, 0); break; }
    case 'ink': { draw(A_); const tg = tmp.getContext('2d'); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(B_, 0, 0);
      tg.globalCompositeOperation = 'destination-in'; tg.imageSmoothingEnabled = true; tg.drawImage(inkMask(E.io(p)), 0, 0, W, H); tg.globalCompositeOperation = 'source-over';
      g.drawImage(tmp, 0, 0); if (VKEY === 'green') { g.globalCompositeOperation = 'screen'; g.globalAlpha = .35 * peak; g.filter = 'blur(18px)'; g.drawImage(tmp, 0, 0); g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; } break; }
    case 'blurdis': { const ba = blurry(A_), bb = blurry(B_, 1); const qa = E.sine(clamp(p * 1.6)), qb = 1 - E.sine(clamp((p - .35) * 1.6));
      draw(A_); draw(ba, qa); g.globalAlpha = E.sine(clamp((p - .25) / .6)); g.drawImage(B_, 0, 0); g.globalAlpha = E.sine(clamp((p - .25) / .6)) * qb; g.drawImage(bb, 0, 0); g.globalAlpha = 1; break; }
    case 'luma': { draw(A_); g.globalCompositeOperation = 'lighten'; g.globalAlpha = E.sine(clamp(p * 1.7)); g.drawImage(B_, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = E.sine(clamp((p - .45) / .55)); g.drawImage(B_, 0, 0); g.globalAlpha = 1; break; }
    case 'sweep': { draw(A_); const pos = lerp(-.35, 1.35, E.io(p)); const tg = tmp.getContext('2d'); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(B_, 0, 0);
      const x0 = W * pos, ang = 380; const gr = tg.createLinearGradient(x0 + ang, 0, x0 - ang, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.42, 'rgba(0,0,0,0)'); gr.addColorStop(.58, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      tg.globalCompositeOperation = 'destination-in'; tg.fillStyle = gr; tg.fillRect(0, 0, W, H); tg.globalCompositeOperation = 'source-over'; g.drawImage(tmp, 0, 0);
      const band = g.createLinearGradient(x0 + ang, 0, x0 - ang, H); const fc = V.flare || '255,240,210'; band.addColorStop(0, `rgba(${fc},0)`); band.addColorStop(.47, `rgba(${fc},0)`); band.addColorStop(.5, `rgba(${fc},${.85 * peak})`); band.addColorStop(.53, `rgba(${fc},0)`); band.addColorStop(1, `rgba(${fc},0)`);
      g.globalCompositeOperation = 'screen'; g.fillStyle = band; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; break; }
    case 'glint': { draw(A_); draw(B_, E.sine(clamp((p - .3) / .45))); glintStar(g, W / 2, H * .42, Math.pow(peak, 1.3)); break; }
    case 'goldleak': case 'emleak': draw(A_); draw(B_, E.sine(clamp((p - .3) / .4)));
      leak(g, p, type === 'emleak' ? ['rgba(60,230,150,A)', 'rgba(255,214,140,A)', 'rgba(20,140,90,A)'] : ['rgba(255,200,110,A)', 'rgba(255,160,70,A)', 'rgba(255,236,190,A)'], t); break;
    default: draw(p < .5 ? A_ : B_);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

// ---------------- titles (DOM) ----------------
const titlesEl = document.getElementById('titles');
const TT = [];
function title(t0, t1, lines, o = {}) { // lines: [[text, cls, delay]]
  const el = document.createElement('div'); el.className = 'tt'; titlesEl.appendChild(el);
  const lns = lines.map(([tx, cls, dl = 0]) => { const s = document.createElement('div'); s.className = 'ln ' + cls; s.textContent = tx; el.appendChild(s); return { s, dl }; });
  if (o.rule) { const r = document.createElement('div'); r.className = 'rule'; el.insertBefore(r, el.children[1] || null); }
  TT.push({ t0, t1, el, lns, y: o.y ?? 900, upd: o.upd }); return TT[TT.length - 1];
}
function animLine(s, t, t0, t1, i) {
  const d = { cinema: .7, hype: .22, doc: .5, green: .3 }[VKEY] ?? 1.0; const k = clamp((t - t0) / d), ko = clamp((t - (t1 - .25)) / .25);
  if (t < t0 || t >= t1) { s.style.opacity = 0; return; }
  let op = 1, tr = '', fl = '';
  if (LUX) { const dl = 1.0; const q = E.out(clamp((t - t0) / dl)); op = q; tr = `scale(${lerp(1.03, 1, q)})`; fl = `blur(${((1 - q) * 14).toFixed(1)}px)`;
    s.style.letterSpacing = s.classList.contains('sm') ? '' : `${lerp(.28, .04, E.out5(clamp((t - t0) / 1.4))).toFixed(3)}em`;
    s.style.backgroundPosition = `${lerp(160, -60, E.io(clamp((t - t0 - .25) / 1.6))).toFixed(1)}% 0`; }
  else if (VKEY === 'cinema') { const q = E.out(k); op = q; tr = `scale(${lerp(1.06, 1, q)})`; fl = `blur(${(1 - q) * 12}px)`; s.style.letterSpacing = ''; }
  else if (VKEY === 'hype') { const q = E.back(k); op = clamp(k * 3); tr = `scale(${lerp(1.8, 1, Math.min(q, 1.08))}) rotate(${(1 - clamp(k * 1.5)) * (i % 2 ? 4 : -4)}deg)`; fl = k < .5 ? `blur(${(1 - k * 2) * 10}px)` : ''; }
  else if (VKEY === 'doc') { const q = E.out(k); op = q; tr = `translateY(${(1 - q) * 30}px)`; }
  else { const q = E.expo(k); op = clamp(k * 4) * (k < .6 && Math.floor(t * 30) % 3 === 0 ? .4 : 1); tr = `scale(${lerp(2.2, 1, q)})`; fl = `blur(${(1 - q) * 16}px)`; }
  op *= 1 - E.in(ko); s.style.opacity = op; s.style.transform = tr; if (LUX) s.style.filter = (fl ? fl + ' ' : '') + 'drop-shadow(0 6px 22px rgba(0,0,0,.75))'; else if (!s.classList.contains('md') && !s.classList.contains('lg') && !s.classList.contains('xl') || VKEY !== 'green') s.style.filter = fl;
  else s.style.filter = (fl ? fl + ' ' : '') + 'drop-shadow(0 0 14px rgba(43,227,138,.55)) drop-shadow(0 5px 0 rgba(0,0,0,.65))';
}
const isGreen = VKEY === 'green';
const Y0 = VKEY === 'doc' ? 1060 : 900;
// shared content, styled per version
title(1.25, 3.83, [['ברוכים הבאים', 'sm', 1.16], ['לקורס', 'xl', 1.62]], { y: 1240 });
title(6.35, 7.05, [['מארוול גיקים', 'xl', 0]], { y: 960 });
const cnt = title(7.09, 9.85, [['0', 'num unbidi', 0], ['עוקבים', 'lg', 1.34], ['בפחות מחצי שנה', 'sm', 1.76]], { y: 900 });
cnt.upd = t => { const v = t < 7.55 ? 0 : Math.round(1000 * E.out(clamp((t - 7.55) / .8))); cnt.lns[0].s.textContent = String(v); };
[['01', 'הדרך', 10.95, 12.45], ['02', 'ההחלטות', 12.45, 13.91], ['03', 'הטעויות', 13.91, 14.77], ['04', 'מה למדתי', 14.77, 16.3]].forEach(([n, tx, a, b]) => title(a, b, [[n, 'sm acc', 0], [tx, 'lg', .06]], { y: Y0, rule: VKEY === 'doc' }));
title(16.37, 17.85, [['פרק 1', 'sm', 0], ['הבסיס', 'xl', .34]], { y: 940 });
[['בניית עמוד', 17.87, 18.59], ['זהות ברורה', 18.59, 19.45], ['קהל יעד מוגדר', 19.45, 21.01], ['מטרה אמיתית', 21.01, 22.45]].forEach(([tx, a, b], i) => title(a, b, [[`0${i + 1}`, 'sm acc unbidi', 0], [tx, 'md', .05]], { y: Y0 }));
title(22.47, 25.65, [['פרק 2', 'sm', 0], ['יצירת תוכן', 'lg', .82], ['שמביא קהל', 'md acc', 2.34]], { y: 940 });
title(28.75, 29.45, [['התוכן', 'xl', 0]], { y: 960 });
title(43.0, 45.03, [['פרק 3', 'sm', 0], ['הדרך לצמיחה', 'lg', 1.03]], { y: 940 });
const c2 = title(46.93, 49.2, [['1', 'num unbidi', 0], ['עוקבים', 'lg', .9]], { y: 900 });
c2.upd = t => { const v = Math.round(1 + 999 * E.out(clamp((t - 46.93) / 1.0))); c2.lns[0].s.textContent = v >= 1000 ? '1000?' : String(v); };
title(49.31, 50.7, [['הפרק האחרון', 'sm', 0]], { y: 900 });
[['עקביות', 50.73, 51.19], ['חשיפה', 51.19, 51.87], ['שיתופי פעולה', 51.87, 52.91], ['הבנת הקהל', 52.91, 53.69], ['ניתוח הביצועים', 53.69, 55.05]].forEach(([tx, a, b], i) => title(a, b, [[`0${i + 1}`, 'sm acc', 0], [tx, 'lg', .04]], { y: Y0 }));
title(59.95, 61.03, [['הכי חשוב', 'sm', 0], ['תזכרו', 'xl', .64]], { y: 900 });
title(61.07, 62.3, [['כל עמוד גדול', 'md', 0], ['מתחיל מ-', 'md', .98]], { y: 820 });
title(62.31, 62.66, [['0', 'num', 0]], { y: 960 });
title(62.67, 65.18, [['השאלה היא', 'sm', 0], ['מה אתם עושים', 'lg', .7], ['מההתחלה שלכם?', 'md acc', 1.7]], { y: 900 });
title(65.21, 66.6, [['יאללה', 'xl', 0], ['מתחילים!', 'xl', .2]], { y: 900 });
title(66.19, 71.45, [['אל תשכחו', 'sm', 0], ['קורס חדש כל יומיים', 'md', .94], ['חינם לגמרי', 'md acc', 3.36], ['ללא הרשמה', 'md', 4.28]], { y: 900 });
title(72.17, 73.3, [['בואו נתחיל!', 'xl', 0]], { y: 1260 });
title(73.31, 74.9, [['תהיו איתנים', 'xl', 0]], { y: 1260 });
title(74.91, 77.45, [['ואנחנו עושים את זה', 'md', 0]], { y: 1260 });
title(77.56, 80, [['מארוול גיקים', isGreen ? 'lg' : 'lg', 0], ['הקורס · קורס חדש כל יומיים · חינם', 'sm', .4]], { y: 1250 });
const CAPHIDE = TT.map(x => [x.t0 - .02, x.t1]);
// logo emblem (intro + finale)
const logo = document.createElement('img'); logo.className = 'logo'; logo.src = A.logo; logo.style.width = logo.style.height = '520px'; titlesEl.appendChild(logo);
logo.style.boxShadow = LUX ? `0 0 0 3px rgba(${V.flare},.85), 0 0 0 10px rgba(0,0,0,.6), 0 0 70px rgba(${V.flare},.35), 0 30px 90px rgba(0,0,0,.85)` : VKEY === 'cinema' ? '0 0 80px rgba(255,190,120,.35), 0 20px 60px rgba(0,0,0,.8)' : (VKEY === 'doc' ? '0 20px 60px rgba(0,0,0,.7)' : '0 0 90px rgba(43,227,138,.6)');
function drawLogo(t) {
  let o = 0, s = 1, y = 760, bl = 0;
  if (t >= .84 && t < 3.9) { const k = P(t, .84, 1.03, E.expo); s = lerp(2.6, 1, k) * (1 + .015 * Math.sin(t * 2)); o = clamp((t - .84) / .06) * (1 - P(t, 3.6, 3.83)); bl = (1 - k) * 20; y = 760; }
  if (t >= 71.5) { const k = P(t, 71.53, 71.95, E.expo); s = lerp(2.4, 1, k) * (1 + .015 * Math.sin(t * 2)); o = clamp((t - 71.53) / .08) * (1 - P(t, 79.1, 79.5)); bl = (1 - k) * 18; y = 760; }
  logo.style.opacity = o; logo.style.visibility = o < .01 ? 'hidden' : 'visible';
  logo.style.transform = `translate(${540 - 260}px,${y - 260}px) scale(${s})`; logo.style.filter = bl > .1 ? `blur(${bl}px)` : '';
}
function drawTitles(t) {
  for (const x of TT) {
    const on = t >= x.t0 - .01 && t < x.t1; x.el.style.visibility = on ? 'visible' : 'hidden'; if (!on) continue;
    if (x.upd) x.upd(t);
    x.el.style.transform = `translate(540px, ${x.y}px) translate(-50%, -50%)`;
    x.lns.forEach(({ s, dl }, i) => animLine(s, t, x.t0 + dl, x.t1, i));
  }
}

// ---------------- captions ----------------
const caps = document.getElementById('caps'); let capCur = -1, capEls = [];
function drawCaps(t) {
  let gi = -1; for (let i = 0; i < CAPTIONS.length; i++) if (t >= CAPTIONS[i].s && t < CAPTIONS[i].e) gi = i;
  if (gi < 0 || CAPHIDE.some(([a, b]) => t >= a && t < b)) { caps.style.visibility = 'hidden'; return; }
  caps.style.visibility = 'visible'; const g = CAPTIONS[gi];
  if (gi !== capCur) { caps.innerHTML = ''; capCur = gi;
    if (VKEY === 'cinema' || VKEY === 'doc' || LUX) { const s = document.createElement('span'); s.className = VKEY === 'doc' ? 'box' : 'w'; s.textContent = g.words.map(w => w.w).join(' '); caps.appendChild(s); capEls = [s]; }
    else capEls = g.words.map(w => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w.w; caps.appendChild(s); return s; }); }
  if (VKEY === 'cinema' || VKEY === 'doc' || LUX) { const k = clamp((t - g.s) / .3), ko = clamp((t - (g.e - .15)) / .15); capEls[0].style.opacity = E.out(k) * (1 - ko); return; }
  g.words.forEach((w, i) => { const s = capEls[i], nx = g.words[i + 1]?.s ?? g.e, dt = t - w.s + .04, k = clamp(dt / .14), on = t >= w.s - .04 && t < nx;
    s.classList.toggle('on', on); s.style.opacity = dt < 0 ? 0 : E.out(k);
    s.style.transform = VKEY === 'hype' ? `scale(${dt < 0 ? .6 : lerp(1.35, on ? 1.08 : 1, E.out(k))})` : `translateY(${(1 - E.out(k)) * 26}px) scale(${on ? 1.06 : 1})`; });
  caps.style.opacity = 1 - clamp((t - (g.e - .1)) / .1);
}

// ---------------- overlays ----------------
const bars = document.getElementById('bars');
if (V.letterbox) { [0, 1].forEach(i => { const b = document.createElement('div'); b.className = 'bar'; b.style.height = V.letterbox + 'px'; b.style[i ? 'bottom' : 'top'] = '0'; bars.appendChild(b); }); document.getElementById('caps').style.top = LUX ? '1300px' : '1330px'; }
const gc = document.getElementById('grain'); gc.style.opacity = V.grain; const gctx = gc.getContext('2d'), gimg = gctx.createImageData(540, 960);
function drawGrain(t) { const r = rnd(Math.floor(t * 30) * 7919 + 1), d = gimg.data; for (let i = 0; i < d.length; i += 4) { const v = (r() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } gctx.putImageData(gimg, 0, 0); }
const flashEl = document.getElementById('flash'), dipEl = document.getElementById('dip'), wrap = document.getElementById('wrap');

// ---------------- frame ----------------
window.DURATION = END;
window.renderFrame = async t => {
  FLASHV = 0;
  const S = EDL.shots; let i = S.findIndex(s => t >= s.t0 && t < s.t1); if (i < 0) i = S.length - 1;
  // active transition window?
  let tr = null, A_ = null, B_ = null;
  for (const x of EDL.trans) { const a = x.t - x.d / 2, b = x.t + x.d / 2; if (x.d > 0 && t >= a && t < b) { tr = { ...x, p: (t - a) / (b - a) }; break; } }
  if (tr) { const bi = S.findIndex(s => Math.abs(s.t0 - tr.t) < 1e-6); await drawShot(bufA, S[bi - 1], t); await drawShot(bufB, S[bi], t); composite(t, bufA, bufB, tr); }
  else { await drawShot(bufA, S[i], t); composite(t, bufA, bufA, { type: 'cut', p: 1 }); }
  // flip-montage flash ticks + logo slam flash
  if (!LUX) for (let k = 1; k < 8; k++) { const dt = t - k * FS; if (dt >= 0 && dt < .07) FLASHV = Math.max(FLASHV, .35 * (1 - dt / .07)); }
  // halation
  if (V.halation) { tmp2.getContext('2d').filter = 'blur(26px) brightness(1.3)'; tmp2.getContext('2d').clearRect(0, 0, W, H); tmp2.getContext('2d').drawImage(cv, 0, 0); tmp2.getContext('2d').filter = 'none';
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = V.halation; ctx.drawImage(tmp2, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  drawParticles(t); drawFlares(t);
  const hf = hitFx(t); wrap.style.transform = `translate(${hf.x.toFixed(1)}px,${hf.y.toFixed(1)}px) scale(${hf.s.toFixed(4)})`;
  flashEl.style.opacity = FLASHV; flashEl.style.background = FLASHC;
  dipEl.style.opacity = t > 79.0 ? P(t, 79.0, 79.5, E.io) : 0;
  drawLogo(t); drawTitles(t); drawCaps(t); drawGrain(t);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.READY = (async () => {
  await Promise.all(['400 100px Bellefair', '500 100px "Frank Ruhl Libre"', '300 100px "Frank Ruhl Libre"', '700 100px Karantina', '200 50px Heebo', '300 50px Heebo', '400 50px Heebo', '500 50px Heebo', '700 50px Heebo', '800 50px Heebo', '900 50px Heebo', '400 50px "Bebas Neue"'].map(f => document.fonts.load(f, 'אבגדה abc 0123 ✓')));
  await document.fonts.ready;
  // pre-grade all photos used in the EDL
  const used = [...new Set(EDL.shots.map(s => s.media))];
  for (const k of used) { const m = MEDIA[k]; if (m.type === 'photo') { await graded(m.src); if (m.cut) { await gradedCut(m.cut); if (VKEY !== 'hype') await graded(m.src, 'blur(3px)'); } await focusOf(k); } if (m.type === 'comp') await gradedCut(m.fg); }
  await logo.decode().catch(() => {});
  // auto-fit long title lines to the frame (max 960 px wide)
  for (const x of TT) { x.el.style.visibility = 'visible'; for (const { s } of x.lns) { const w = s.scrollWidth; if (w > 960) { const fs = parseFloat(getComputedStyle(s).fontSize); s.style.fontSize = (fs * 960 / w).toFixed(1) + 'px'; } } x.el.style.visibility = 'hidden'; }
  return true;
})();
})();
