// =============================================================================
//  J.A.R.V.I.S — 3D holographic arc reactor (three.js + bloom)
//  Edit while running: saving this file refreshes the HUD.
// =============================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const THEMES = {
  gold: { primary: 0xffa83a, secondary: 0xff6a10, hot: 0xffe2a0, star: 0xffcf8a },
  cyan: { primary: 0x34cfff, secondary: 0x1466ff, hot: 0xd8f7ff, star: 0x9adfff },
  denied: { primary: 0xff2a3c, secondary: 0xaa0010, hot: 0xffb0b8, star: 0xff8090 },
};
const STATE_ENERGY = { boot: .2, idle: .25, listening: .75, verifying: .8, thinking: 1, speaking: .85,
  denied: .6, enrolling: .55, sleeping: .1 };

const OUTER_R = 3.8;
const ease = t => 1 - Math.pow(1 - t, 4);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- geometry helpers --------------------------------------------------
function mergeNonIndexed(geos) {
  let total = 0;
  const parts = geos.map(g => { const ng = g.index ? g.toNonIndexed() : g; total += ng.attributes.position.count; return ng; });
  const pos = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return out;
}

/** n arc segments between r and r+w; fill = fraction of each slot that is solid */
function segmentedRing(r, w, n, fill, startJitter = 0) {
  const geos = [];
  const slot = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const jitter = startJitter ? rand(-startJitter, startJitter) : 0;
    const f = typeof fill === 'function' ? fill(i) : fill;
    if (f <= 0) continue;
    geos.push(new THREE.RingGeometry(r, r + w, Math.max(2, Math.ceil(24 * f / n * 6)), 1, i * slot + jitter, slot * f));
  }
  return mergeNonIndexed(geos);
}

function circlePoints(r, seg = 256, from = 0, to = Math.PI * 2) {
  const pts = [];
  for (let i = 0; i <= seg; i++) { const a = from + (to - from) * (i / seg); pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function ticks(r, len, n, majorEvery = 0, majorLen = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const l = majorEvery && i % majorEvery === 0 ? majorLen : len;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0), new THREE.Vector3(Math.cos(a) * (r + l), Math.sin(a) * (r + l), 0));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.18, 'rgba(255,255,255,.75)');
  grd.addColorStop(.45, 'rgba(255,255,255,.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// =============================================================================
export class Reactor {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x000000, 1);  // composer re-encodes the clear color, so true black reads as the HUD bg
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020509, 0.012);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    this.camera.position.set(0, 0, 17.5);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .7, 0.5, 0.12);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.mats = [];          // {mat, role, base}
    this.colors = {};        // role → current THREE.Color
    this.themeName = 'gold';
    this.denied = 0;
    for (const role of ['primary', 'secondary', 'hot', 'star']) this.colors[role] = new THREE.Color(THEMES.gold[role]);
    this.targetColors = { ...THEMES.gold };

    this.state = 'boot';
    this.energy = .2; this.level = 0; this.levelTarget = 0; this.speech = 0;
    this.mouse = new THREE.Vector2(); this.mouseSmooth = new THREE.Vector2();
    this.bootT = 0; this.booted = false;
    this.clock = new THREE.Clock();
    this.glow = glowTexture();

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.reactor = new THREE.Group();
    this.root.add(this.reactor);
    this.layers = [];        // {obj, spin, axis, delay, baseScale}

    this.buildStars();
    this.buildDrum();
    this.buildRings();
    this.buildGyros();
    this.buildCore();
    this.buildBeams();
    this.buildSparks();
    this.cracks = [];

    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', e => {
      this.mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    });
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ---------- materials ----------
  mat(role, opacity = 1, kind = 'basic', extra = {}) {
    const common = { color: this.colors[role].clone(), transparent: true, opacity, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, ...extra };
    const m = kind === 'line' ? new THREE.LineBasicMaterial(common)
      : kind === 'points' ? new THREE.PointsMaterial(common)
      : kind === 'sprite' ? new THREE.SpriteMaterial(common)
      : new THREE.MeshBasicMaterial(common);
    this.mats.push({ mat: m, role, base: opacity });
    return m;
  }

  layer(obj, { spin = 0, axis = 'z', delay = 0, parent = this.reactor, wobble = 0 } = {}) {
    parent.add(obj);
    this.layers.push({ obj, spin, axis, delay, wobble, phase: Math.random() * 10 });
    obj.scale.setScalar(0.001);
    return obj;
  }

  // ---------- builders ----------
  buildStars() {
    const n = 2600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = rand(35, 120), th = Math.random() * Math.PI * 2, ph = Math.acos(rand(-1, 1));
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph) - 30], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, this.mat('star', .55, 'points', { size: .16, sizeAttenuation: true, map: this.glow }));
    this.scene.add(this.stars);

    // floating dust near the reactor
    const m = 500, dp = new Float32Array(m * 3);
    for (let i = 0; i < m; i++) dp.set([rand(-14, 14), rand(-8, 8), rand(-6, 4)], i * 3);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, this.mat('primary', .35, 'points', { size: .05, map: this.glow }));
    this.scene.add(this.dust);
  }

  buildDrum() {
    // wireframe reactor housing (inspired by the holographic arc-reactor schematic)
    const drum = new THREE.Group();
    const prof = [[0.6, -0.9], [1.6, -0.9], [2.2, -0.7], [2.6, -0.4], [2.75, 0], [2.6, 0.45], [2.0, 0.7], [1.2, 0.75], [0.7, 0.55]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const lathe = new THREE.LatheGeometry(prof, 48);
    drum.add(new THREE.LineSegments(new THREE.WireframeGeometry(lathe), this.mat('primary', .07, 'line')));
    drum.add(new THREE.LineSegments(new THREE.EdgesGeometry(lathe, 25), this.mat('primary', .22, 'line')));
    const finGeo = new THREE.BoxGeometry(0.55, 1.15, 0.75);
    const finEdges = new THREE.EdgesGeometry(finGeo);
    const finMat = this.mat('primary', .22, 'line');
    const finFace = this.mat('secondary', .025);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const f = new THREE.Group();
      f.add(new THREE.LineSegments(finEdges, finMat));
      f.add(new THREE.Mesh(finGeo, finFace));
      f.position.set(Math.cos(a) * 3.05, 0, Math.sin(a) * 3.05);
      f.rotation.y = -a;
      drum.add(f);
    }
    drum.rotation.x = 1.05;
    drum.position.z = -2.2;
    this.drum = drum;
    this.layer(drum, { spin: .05, axis: 'y', delay: .1 });
  }

  buildRings() {
    const R = OUTER_R;
    const add = (geo, role, op, spin, delay, z = 0) => {
      const m = new THREE.Mesh(geo, this.mat(role, op)); m.position.z = z;
      return this.layer(m, { spin, delay });
    };
    const line = (geo, role, op, spin, delay, z = 0, segs = false) => {
      const l = segs ? new THREE.LineSegments(geo, this.mat(role, op, 'line')) : new THREE.Line(geo, this.mat(role, op, 'line'));
      l.position.z = z; return this.layer(l, { spin, delay });
    };
    // outermost: thin circle + fine ticks
    line(circlePoints(R + .55), 'primary', .35, 0, .0);
    line(ticks(R + .58, .08, 180, 15, .28), 'primary', .55, .02, .05, 0, true);
    // heavy segmented band
    add(segmentedRing(R, .14, 36, i => (i % 9 === 0 ? 0 : .8)), 'primary', .5, -.08, .1);
    add(segmentedRing(R - .32, .07, 120, .55), 'primary', .5, .14, .15);
    // dashed arcs with gaps, like the HUD rings in the references
    add(segmentedRing(R - .62, .22, 6, i => [.7, .3, .55, .15, .6, .4][i]), 'secondary', .32, .22, .2);
    line(circlePoints(R - .7), 'primary', .4, 0, .22);
    add(segmentedRing(R - 1.05, .05, 72, i => (i % 4 ? .7 : 0)), 'hot', .45, -.3, .25);
    line(ticks(R - 1.4, .14, 90, 6, .3), 'primary', .45, .1, .3, 0, true);
    add(segmentedRing(R - 1.75, .26, 3, .26), 'primary', .32, -.45, .35, .05);
    line(circlePoints(R - 1.9), 'secondary', .55, 0, .38);
    add(segmentedRing(R - 2.2, .08, 48, .5), 'primary', .35, .6, .4);
    // inner housing rings
    add(segmentedRing(1.45, .08, 10, .82), 'hot', .4, -.9, .45, .1);
    line(circlePoints(1.25), 'hot', .5, 0, .5, .12);

    // scanner arc used during "thinking"
    this.scanner = add(new THREE.RingGeometry(R - .45, R - .1, 64, 1, 0, Math.PI / 3), 'hot', 0, 2.4, .5);
    this.scanner.userData.isScanner = true;
  }

  buildGyros() {
    // tilted gyroscope rings orbiting the core in 3D
    this.gyros = [];
    const specs = [[2.9, .012, 1.1, 0], [3.25, .01, .6, 1.2], [2.55, .014, 1.4, 2.4]];
    for (const [r, t, tilt, rot] of specs) {
      const g = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 180), this.mat('primary', .4));
      const holder = new THREE.Group(); holder.rotation.set(tilt, rot, 0); holder.add(g);
      this.layer(holder, { delay: .3 });
      this.gyros.push({ holder, mesh: g, speed: rand(.15, .35) * (Math.random() > .5 ? 1 : -1) });
    }
  }

  buildCore() {
    const core = new THREE.Group();
    core.add(new THREE.Mesh(new THREE.TorusGeometry(.72, .06, 16, 96), this.mat('hot', .55)));
    core.add(new THREE.Mesh(new THREE.TorusGeometry(.95, .02, 8, 96), this.mat('primary', .5)));
    // triangle of the Mk VI reactor
    const tri = new THREE.Shape();
    for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + i * 2 * Math.PI / 3; i ? tri.lineTo(Math.cos(a) * .55, Math.sin(a) * .55) : tri.moveTo(Math.cos(a) * .55, Math.sin(a) * .55); }
    const hole = new THREE.Path();
    for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + i * 2 * Math.PI / 3; i ? hole.lineTo(Math.cos(a) * .4, Math.sin(a) * .4) : hole.moveTo(Math.cos(a) * .4, Math.sin(a) * .4); }
    tri.holes.push(hole);
    this.tri = new THREE.Mesh(new THREE.ShapeGeometry(tri), this.mat('hot', .3));
    core.add(this.tri);
    this.coreGlow = new THREE.Sprite(this.mat('hot', .45, 'sprite', { map: this.glow }));
    this.coreGlow.scale.setScalar(3.2);
    core.add(this.coreGlow);
    this.halo = new THREE.Sprite(this.mat('primary', .12, 'sprite', { map: this.glow }));
    this.halo.scale.setScalar(11);
    this.halo.position.z = -1;
    core.add(this.halo);
    core.position.z = .2;
    this.core = core;
    this.layer(core, { delay: .55 });
  }

  buildBeams() {
    // long faint light rays crossing the reactor (as in the golden reference)
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = rand(0, Math.PI * 2), r1 = rand(1.6, 2.4), r2 = rand(5, 8);
      pts.push(new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0), new THREE.Vector3(Math.cos(a) * r2, Math.sin(a) * r2, rand(-2, 1)));
    }
    this.beams = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), this.mat('primary', .09, 'line'));
    this.layer(this.beams, { spin: .015, delay: .6 });
  }

  buildSparks() {
    this.sparkN = 700;
    const pos = new Float32Array(this.sparkN * 3);
    this.sparkVel = new Float32Array(this.sparkN * 3);
    this.sparkLife = new Float32Array(this.sparkN);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.sparks = new THREE.Points(g, this.mat('hot', .8, 'points', { size: .08, map: this.glow }));
    this.sparks.frustumCulled = false;
    this.reactor.add(this.sparks);
    this.sparkCursor = 0;
  }

  emitSparks(count, speed = 1) {
    const pos = this.sparks.geometry.attributes.position.array;
    for (let k = 0; k < count; k++) {
      const i = this.sparkCursor = (this.sparkCursor + 1) % this.sparkN;
      const a = Math.random() * Math.PI * 2, r = rand(.7, 1.6);
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r; pos[i * 3 + 2] = rand(-.2, .3);
      const v = rand(.6, 2.6) * speed;
      this.sparkVel[i * 3] = Math.cos(a + rand(-.25, .25)) * v;
      this.sparkVel[i * 3 + 1] = Math.sin(a + rand(-.25, .25)) * v;
      this.sparkVel[i * 3 + 2] = rand(-.6, 1.2);
      this.sparkLife[i] = rand(.8, 2.2);
    }
  }

  spawnCrack() {
    // jagged electric line from the core outward
    const a = Math.random() * Math.PI * 2, pts = [];
    let r = .8;
    const end = rand(2.8, OUTER_R + .6);
    while (r < end) {
      const j = rand(-.12, .12);
      pts.push(new THREE.Vector3(Math.cos(a + j) * r, Math.sin(a + j) * r, rand(-.15, .15)));
      r += rand(.15, .45);
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.mat('hot', .9, 'line'));
    this.reactor.add(line);
    this.cracks.push({ line, life: rand(.08, .22), max: .2 });
  }

  // ---------- public API ----------
  setTheme(name) {
    this.themeName = THEMES[name] ? name : 'gold';
    this.targetColors = { ...THEMES[this.themeName] };
  }
  setState(s) {
    this.state = s;
    if (s === 'denied') { this.denied = 1; }
    if (s === 'listening') this.emitSparks(40, .8);
  }
  setLevel(v) { this.levelTarget = v; }
  setSpeech(v) { this.speech = v; }
  pulse(strength = 1) { this.emitSparks(Math.round(90 * strength), 1.4); for (let i = 0; i < 3 * strength; i++) this.spawnCrack(); }

  /** screen-space radius (px) of the outer ring – used to lay out DOM around the reactor */
  pxRadius() {
    const h = innerHeight;
    const dist = this.camera.position.z;
    const visible = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist;
    return (OUTER_R + .95) * this.reactor.scale.x * (h / visible);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // keep the reactor inside narrow windows
    const s = Math.min(1, (w / h) / 1.45);
    this.reactor.scale.setScalar(Math.max(.55, s));
  }

  // ---------- animation ----------
  tick() {
    const dt = Math.min(this.clock.getDelta(), .05);
    const t = this.clock.elapsedTime;

    // boot: layers fly in staggered
    this.bootT = t;  // wall-clock, so slow frames don't stall the intro
    for (const L of this.layers) {
      const p = Math.min(1, Math.max(0, (this.bootT - .3 - L.delay * 1.6) / 1.1));
      const e = ease(p);
      const s = lerp(1.7, 1, e) * e;
      L.obj.scale.setScalar(Math.max(.001, s));
      if (L.spin) L.obj.rotation[L.axis] += L.spin * dt * (1 + this.energy * 2.2 + this.speech * 2);
    }
    if (!this.booted && this.bootT > 2.8) { this.booted = true; this.pulse(1.5); }

    // energy follows state, plus mic / voice level
    const target = STATE_ENERGY[this.state] ?? .3;
    this.energy = lerp(this.energy, target, 1 - Math.exp(-dt * 3));
    this.level = lerp(this.level, this.levelTarget, 1 - Math.exp(-dt * 14));
    const voice = Math.max(this.level * (this.state === 'listening' || this.state === 'enrolling' ? 1 : .35), this.speech);

    // colors (smooth theme transitions, red flash on denied voice)
    this.denied = Math.max(0, this.denied - dt * .8);
    const k = 1 - Math.exp(-dt * 4);
    const tmp = new THREE.Color();
    for (const role in this.colors) {
      tmp.set(this.targetColors[role]);
      if (this.denied > 0) tmp.lerp(new THREE.Color(THEMES.denied[role]), Math.min(1, this.denied * 1.5));
      this.colors[role].lerp(tmp, k);
    }
    const flick = 1 + Math.sin(t * 23) * .02 + Math.sin(t * 7.3) * .03;
    for (const m of this.mats) {
      m.mat.color.copy(this.colors[m.role]);
      if (m.mat === this.scanner.material) continue;
      m.mat.opacity = m.base * (.75 + this.energy * .35) * flick;
    }
    this.scanner.material.opacity = lerp(this.scanner.material.opacity,
      this.state === 'thinking' || this.state === 'verifying' ? .85 : 0, 1 - Math.exp(-dt * 6));

    // core reacts to voice
    const cs = 1 + voice * .45 + Math.sin(t * 2.2) * .03;
    this.core.children.forEach(c => { if (c !== this.halo && c !== this.coreGlow) c.scale.setScalar(cs); });
    this.coreGlow.scale.setScalar(1.6 + voice * 3 + this.energy * .5);
    this.halo.scale.setScalar(7 + voice * 5 + this.energy * 2);
    this.tri.rotation.z += dt * (.3 + this.energy * 1.5);
    for (const g of this.gyros) {
      g.mesh.rotation.x += dt * g.speed * (1 + this.energy * 2);
      g.mesh.rotation.y += dt * g.speed * .7;
    }
    this.bloom.strength = .55 + this.energy * .35 + voice * .7;

    // sparks
    const sparkRate = (this.state === 'speaking' ? 90 : this.state === 'thinking' ? 60 : 10) * (0.3 + voice * 2);
    this.emitSparks(Math.floor(sparkRate * dt + Math.random()), 1);
    const pos = this.sparks.geometry.attributes.position.array;
    for (let i = 0; i < this.sparkN; i++) {
      if (this.sparkLife[i] <= 0) { pos[i * 3 + 2] = -999; continue; }
      this.sparkLife[i] -= dt;
      pos[i * 3] += this.sparkVel[i * 3] * dt;
      pos[i * 3 + 1] += this.sparkVel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += this.sparkVel[i * 3 + 2] * dt;
      this.sparkVel[i * 3] *= .985; this.sparkVel[i * 3 + 1] *= .985;
    }
    this.sparks.geometry.attributes.position.needsUpdate = true;

    // electric cracks
    if (Math.random() < dt * (this.state === 'speaking' ? 6 : this.state === 'thinking' ? 4 : .4) * (1 + voice * 3)) this.spawnCrack();
    for (let i = this.cracks.length - 1; i >= 0; i--) {
      const c = this.cracks[i]; c.life -= dt;
      c.line.material.opacity = Math.max(0, c.life / c.max) * (Math.random() > .3 ? 1 : .3);
      if (c.life <= 0) {
        this.reactor.remove(c.line); c.line.geometry.dispose();
        this.mats = this.mats.filter(m => m.mat !== c.line.material); c.line.material.dispose();
        this.cracks.splice(i, 1);
      }
    }

    // parallax + idle sway
    this.mouseSmooth.lerp(this.mouse, 1 - Math.exp(-dt * 2.5));
    this.root.rotation.y = this.mouseSmooth.x * .22 + Math.sin(t * .23) * .05;
    this.root.rotation.x = -.16 - this.mouseSmooth.y * .14 + Math.sin(t * .31) * .03;
    this.stars.rotation.y += dt * .004;
    this.stars.rotation.x = this.mouseSmooth.y * .03;
    this.dust.rotation.z += dt * .01;

    this.composer.render(dt);
  }
}
