// Force-directed knowledge graph on <canvas>.
// Canvas, not SVG: one DOM node per element stalls past ~1,500 nodes.
// Repulsion uses a spatial grid with a distance cutoff, so a tick stays near-linear.

const TYPE_COLORS = {
  person: "#4f8cff", project: "#a26bff", area: "#f4c430", topic: "#3ddc97",
  daily: "#4b5866", place: "#ff9f43", tool: "#ff5fa2", money: "#ff6b6b",
  file: "#d6dde4", note: "#8fa3b8", ghost: "#2c333b",
};
const EXTRA = ["#2ee6c8", "#c3e88d", "#f78c6c", "#89ddff", "#bb80b3", "#ffcb6b"];

const CUTOFF = 210;          // repulsion ignored beyond this distance (world units)
const REPULSE = 7000;
const SPRING = 0.035;
const SPRING_LEN = 58;
const GRAVITY = 0.007;
const DAMPING = 0.82;
const PULSE_EVERY_MS = 2600;

export function colorFor(type) {
  if (TYPE_COLORS[type]) return TYPE_COLORS[type];
  let h = 0;
  for (const c of type) h = (h * 31 + c.charCodeAt(0)) | 0;
  return EXTRA[Math.abs(h) % EXTRA.length];
}

function rng(seed) {                       // deterministic layout start
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export class Graph {
  constructor(canvas, data, { onFocus, onPath, onHover } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onFocus = onFocus || (() => {});
    this.onPath = onPath || (() => {});
    this.onHover = onHover || (() => {});
    this.hiddenTypes = new Set();
    this.highlight = new Set();            // search hits: ringed
    this.pathSet = null;                   // {nodes:Set, edges:Set}
    this.pulses = [];
    this.lastPulse = 0;
    this.activity = 0;                     // >0 while thinking: more pulses
    this.cam = { x: 0, y: 0, k: 1 };
    this.camTarget = null;

    const rand = rng(7);
    this.index = new Map();
    this.nodes = data.nodes.map((n, i) => {
      const a = rand() * Math.PI * 2, d = 40 + rand() * 420;
      const node = { ...n, i, x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0,
                     r: 3 + Math.sqrt(n.degree) * 1.7, color: colorFor(n.type), nb: [] };
      this.index.set(n.id, node);
      return node;
    });
    this.edges = [];
    for (const [a, b] of data.edges) {
      const s = this.index.get(a), t = this.index.get(b);
      if (!s || !t) continue;
      this.edges.push([s, t]);
      s.nb.push(t); t.nb.push(s);
    }
    for (let i = 0; i < 400; i++) { this.alpha = 1 - i / 450; this.tick(); }   // settle before first paint
    this.alpha = 0.12;
    this.fit(false);
    setTimeout(() => { if (!this.touched) this.fit(); }, 1500);           // reframe once it has settled
    this.bind();
    this.resize();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ------------------------------------------------------------- simulation
  visible(n) { return !this.hiddenTypes.has(n.type); }

  tick() {
    const nodes = this.nodes, a = this.alpha;
    const grid = new Map(), cell = CUTOFF;
    for (const n of nodes) {
      if (!this.visible(n)) continue;
      const key = `${Math.floor(n.x / cell)},${Math.floor(n.y / cell)}`;
      (grid.get(key) || grid.set(key, []).get(key)).push(n);
    }
    this.grid = grid;
    const c2 = CUTOFF * CUTOFF;
    for (const n of nodes) {
      if (!this.visible(n)) continue;
      const gx = Math.floor(n.x / cell), gy = Math.floor(n.y / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const bucket = grid.get(`${gx + dx},${gy + dy}`);
        if (!bucket) continue;
        for (const m of bucket) {
          if (m.i <= n.i) continue;
          let x = n.x - m.x, y = n.y - m.y, d2 = x * x + y * y;
          if (d2 > c2) continue;
          if (d2 < 1) { x = Math.random() - 0.5; y = Math.random() - 0.5; d2 = 1; }
          const f = (REPULSE * a) / d2, d = Math.sqrt(d2);
          const fx = (x / d) * f, fy = (y / d) * f;
          n.vx += fx; n.vy += fy; m.vx -= fx; m.vy -= fy;
        }
      }
    }
    for (const [s, t] of this.edges) {
      if (!this.visible(s) || !this.visible(t)) continue;
      const x = t.x - s.x, y = t.y - s.y, d = Math.sqrt(x * x + y * y) || 1;
      const f = (d - SPRING_LEN) * SPRING * a, fx = (x / d) * f, fy = (y / d) * f;
      s.vx += fx; s.vy += fy; t.vx -= fx; t.vy -= fy;
    }
    for (const n of nodes) {
      if (n.fixed) { n.vx = n.vy = 0; continue; }
      const g = GRAVITY * a * (n.nb.length ? 1 : 4);     // loners drift in instead of orbiting far out
      n.vx = (n.vx - n.x * g) * DAMPING;
      n.vy = (n.vy - n.y * g) * DAMPING;
      n.x += n.vx; n.y += n.vy;
    }
  }

  // ------------------------------------------------------------- camera
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.clientWidth; this.h = this.canvas.clientHeight;
    this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
    this.dpr = dpr;
  }
  toScreen(x, y) { return [(x - this.cam.x) * this.cam.k + this.w / 2, (y - this.cam.y) * this.cam.k + this.h / 2]; }
  toWorld(x, y) { return [(x - this.w / 2) / this.cam.k + this.cam.x, (y - this.h / 2) / this.cam.k + this.cam.y]; }

  fit(animate = true) {
    const vis = this.nodes.filter((n) => this.visible(n));
    if (!vis.length) return;
    // 2nd–98th percentile, so one stray node can't shrink the whole view
    const xs = vis.map((n) => n.x).sort((a, b) => a - b), ys = vis.map((n) => n.y).sort((a, b) => a - b);
    const lo = Math.floor(vis.length * 0.02), hi = Math.ceil(vis.length * 0.98) - 1;
    const x0 = xs[lo], x1 = xs[hi], y0 = ys[lo], y1 = ys[hi];
    const w = this.canvas.clientWidth || 1200, h = this.canvas.clientHeight || 800;
    const k = Math.min(w / (x1 - x0 + 120), h / (y1 - y0 + 120)) * 0.9;
    const target = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, k: Math.max(0.15, Math.min(k, 2.5)) };
    if (animate) this.camTarget = target; else this.cam = target;
  }

  focusOn(id, zoom = 1.6) {
    const n = this.index.get(id);
    if (!n) return;
    this.focused = n;
    this.camTarget = { x: n.x, y: n.y, k: Math.max(this.cam.k, zoom) };
    this.onFocus(n);
  }

  // ------------------------------------------------------------- interaction
  nodeAt(sx, sy) {
    const [wx, wy] = this.toWorld(sx, sy);
    let best = null, bestD = Infinity;
    for (const n of this.nodes) {
      if (!this.visible(n)) continue;
      const d = Math.hypot(n.x - wx, n.y - wy), hit = n.r + 4 / this.cam.k;
      if (d < hit && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  bind() {
    const c = this.canvas;
    let drag = null, moved = false;
    window.addEventListener("resize", () => this.resize());
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      this.touched = true;
      const n = this.nodeAt(e.offsetX, e.offsetY);
      drag = { n, sx: e.offsetX, sy: e.offsetY, cx: this.cam.x, cy: this.cam.y };
      moved = false;
      if (n) { n.fixed = true; this.alpha = Math.max(this.alpha, 0.3); }
      this.camTarget = null;
    });
    c.addEventListener("pointermove", (e) => {
      if (drag) {
        const dx = e.offsetX - drag.sx, dy = e.offsetY - drag.sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        if (drag.n) { [drag.n.x, drag.n.y] = this.toWorld(e.offsetX, e.offsetY); }
        else { this.cam.x = drag.cx - dx / this.cam.k; this.cam.y = drag.cy - dy / this.cam.k; }
        return;
      }
      const n = this.nodeAt(e.offsetX, e.offsetY);
      if (n !== this.hover) { this.hover = n; this.onHover(n, e.offsetX, e.offsetY); }
      else if (n) this.onHover(n, e.offsetX, e.offsetY);
      c.style.cursor = n ? "pointer" : "grab";
    });
    c.addEventListener("pointerup", (e) => {
      if (drag?.n) drag.n.fixed = false;
      if (drag && !moved) {
        const n = drag.n;
        if (n && e.shiftKey && this.focused && this.focused !== n) this.tracePath(this.focused, n);
        else if (n) { this.pathSet = null; this.focusOn(n.id, this.cam.k); }
        else { this.focused = null; this.pathSet = null; this.onFocus(null); }
      }
      drag = null;
    });
    c.addEventListener("pointerleave", () => { this.hover = null; this.onHover(null); });
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.camTarget = null;
      this.touched = true;
      const [wx, wy] = this.toWorld(e.offsetX, e.offsetY);
      const k = Math.min(6, Math.max(0.08, this.cam.k * Math.exp(-e.deltaY * 0.0015)));
      this.cam.k = k;
      this.cam.x = wx - (e.offsetX - this.w / 2) / k;
      this.cam.y = wy - (e.offsetY - this.h / 2) / k;
    }, { passive: false });
  }

  tracePath(a, b) {
    const prev = new Map([[a, null]]), q = [a];
    while (q.length) {
      const cur = q.shift();
      if (cur === b) break;
      for (const n of cur.nb) if (!prev.has(n) && this.visible(n)) { prev.set(n, cur); q.push(n); }
    }
    if (!prev.has(b)) { this.pathSet = null; this.onPath([]); return; }
    const path = [];
    for (let cur = b; cur; cur = prev.get(cur)) path.unshift(cur);
    const edges = new Set();
    for (let i = 0; i < path.length - 1; i++) edges.add(path[i].id + "\u0000" + path[i + 1].id).add(path[i + 1].id + "\u0000" + path[i].id);
    this.pathSet = { nodes: new Set(path), edges };
    this.onPath(path);
  }

  setHidden(types) { this.hiddenTypes = new Set(types); this.alpha = Math.max(this.alpha, 0.4); }
  setHighlight(ids) { this.highlight = new Set(ids); }

  // ------------------------------------------------------------- render loop
  frame(t) {
    // Keep breathing: alpha never fully cools.
    this.alpha = Math.max(0.018, this.alpha * 0.992);
    this.tick();
    if (this.camTarget) {
      const c = this.cam, g = this.camTarget, s = 0.12;
      c.x += (g.x - c.x) * s; c.y += (g.y - c.y) * s; c.k += (g.k - c.k) * s;
      if (Math.abs(g.k - c.k) < 0.002 && Math.hypot(g.x - c.x, g.y - c.y) < 0.5) this.camTarget = null;
    }
    const every = this.activity > 0 ? 260 : PULSE_EVERY_MS;
    if (t - this.lastPulse > every && this.edges.length) {
      const e = this.edges[(Math.random() * this.edges.length) | 0];
      if (this.visible(e[0]) && this.visible(e[1])) this.pulses.push({ e, t0: t, flip: Math.random() < 0.5 });
      this.lastPulse = t;
    }
    this.draw(t);
    requestAnimationFrame((tt) => this.frame(tt));
  }

  draw(t) {
    const ctx = this.ctx, k = this.cam.k;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const lit = this.hover || this.focused;
    const litSet = lit ? new Set([lit, ...lit.nb]) : null;
    const dim = (n) => (this.pathSet ? !this.pathSet.nodes.has(n) : litSet ? !litSet.has(n) : false);

    // edges — one batched path for the quiet ones
    ctx.lineWidth = Math.max(0.4, 0.7 * Math.sqrt(k));
    ctx.strokeStyle = litSet || this.pathSet ? "rgba(46,230,200,0.035)" : "rgba(46,230,200,0.11)";
    ctx.beginPath();
    const hot = [];
    for (const ed of this.edges) {
      const [s, e] = ed;
      if (!this.visible(s) || !this.visible(e)) continue;
      const isPath = this.pathSet?.edges.has(s.id + "\u0000" + e.id);
      if (isPath || (litSet && (s === lit || e === lit))) { hot.push([s, e, isPath]); continue; }
      const [x1, y1] = this.toScreen(s.x, s.y), [x2, y2] = this.toScreen(e.x, e.y);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    for (const [s, e, isPath] of hot) {
      const [x1, y1] = this.toScreen(s.x, s.y), [x2, y2] = this.toScreen(e.x, e.y);
      ctx.strokeStyle = isPath ? "rgba(255,154,60,0.95)" : "rgba(46,230,200,0.7)";
      ctx.lineWidth = isPath ? 2.2 : 1.2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // pulses travelling along links
    this.pulses = this.pulses.filter((p) => t - p.t0 < 1400);
    for (const p of this.pulses) {
      const u = (t - p.t0) / 1400, [a, b] = p.flip ? [p.e[1], p.e[0]] : p.e;
      const [x, y] = this.toScreen(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, "rgba(46,230,200,0.9)"); g.addColorStop(1, "rgba(46,230,200,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    }

    // nodes
    for (const n of this.nodes) {
      if (!this.visible(n)) continue;
      const [x, y] = this.toScreen(n.x, n.y);
      const r = Math.max(1.2, n.r * Math.sqrt(k)) * (n === lit ? 1.35 : 1);
      if (x < -r || y < -r || x > this.w + r || y > this.h + r) continue;
      ctx.globalAlpha = dim(n) ? 0.1 : 1;
      if (n.degree > 14 && !dim(n)) {
        ctx.fillStyle = n.color + "22";
        ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = n.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (this.highlight.has(n.id) || n === this.focused) {
        ctx.strokeStyle = n === this.focused ? "#2ee6c8" : "rgba(255,154,60,0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r + 4 + Math.sin(t / 300) * 1.5, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    this.drawLabels(lit, litSet, dim);
  }

  // Most-connected first; skip any label whose box collides with one already placed.
  drawLabels(lit, litSet, dim) {
    const ctx = this.ctx, k = this.cam.k, placed = [];
    const order = [];
    if (lit) order.push(lit);
    if (this.focused && this.focused !== lit) order.push(this.focused);
    if (this.pathSet) order.push(...this.pathSet.nodes);
    if (litSet) order.push(...[...litSet].sort((a, b) => b.degree - a.degree));
    const minDeg = k > 2 ? 0 : k > 1.2 ? 3 : k > 0.7 ? 8 : 14;
    order.push(...this.sortedByDegree().filter((n) => n.degree >= minDeg));
    const seen = new Set();
    for (const n of order) {
      if (seen.has(n) || !this.visible(n) || n.type === "ghost" && n !== lit) continue;
      seen.add(n);
      if (placed.length > 160) break;
      const strong = n === lit || n === this.focused;
      if (dim(n) && !strong) continue;
      const [x, y] = this.toScreen(n.x, n.y);
      if (x < -50 || y < -20 || x > this.w + 50 || y > this.h + 20) continue;
      const size = strong ? 14 : n.degree > 20 ? 12 : 11;
      ctx.font = `${strong ? 600 : 400} ${size}px "Segoe UI", Inter, system-ui, sans-serif`;
      const label = n.title.length > 34 ? n.title.slice(0, 33) + "…" : n.title;
      const w = ctx.measureText(label).width, r = Math.max(1.2, n.r * Math.sqrt(k));
      const box = [x - w / 2 - 3, y + r + 3, x + w / 2 + 3, y + r + 5 + size];
      if (!strong && placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      ctx.fillStyle = strong ? "#ffffff" : "rgba(214,221,228,0.78)";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(label, x, y + r + 4);
    }
  }

  sortedByDegree() {
    return this._sorted || (this._sorted = [...this.nodes].sort((a, b) => b.degree - a.degree));
  }
}
