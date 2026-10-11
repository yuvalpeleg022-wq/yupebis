// =============================================================================
//  J.A.R.V.I.S — the plasma orb
//  One living sphere on black: a particle shell that flows and boils with the
//  voice, a triangulated wireframe core, a white-hot heart, light beams shooting
//  through it and fiery arcs orbiting in 3D.
//  Same public API as the old reactor, so the HUD and the phone app just swap it in.
//  Edit while running: saving this file refreshes the HUD.
// =============================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const THEMES = {
  gold:  { hot: 0xfff1c2, primary: 0xff9a2a, secondary: 0xff4d0a },
  green: { hot: 0xe2fff2, primary: 0x2cff9e, secondary: 0x08a35c },
  cyan:  { hot: 0xe6faff, primary: 0x3fd2ff, secondary: 0x1460ff },
  denied:{ hot: 0xffd0d4, primary: 0xff3346, secondary: 0x9a0012 },
};
const STATE_ENERGY = { boot: .15, idle: .22, listening: .7, verifying: .7, thinking: 1, speaking: .8,
  denied: .6, enrolling: .55, sleeping: .08 };
const ORB_R = 2.45;   // radius of the particle shell
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

// 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT)
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const PARTICLE_VS = `
uniform float uTime, uLevel, uEnergy, uPixelRatio, uSize;
attribute vec4 aRand;
varying float vMix, vAlpha;
${NOISE}
vec3 rotY(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z); }
vec3 rotX(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(p.x, c*p.y-s*p.z, s*p.y+c*p.z); }
void main(){
  vec3 dir = normalize(position);
  float r = length(position);
  float t = uTime;
  // two octaves of flowing noise: the plasma "boils", harder when you speak
  float n1 = snoise(dir * 1.7 + vec3(0.0, t * 0.22, t * 0.11));
  float n2 = snoise(dir * 4.3 - vec3(t * 0.37, 0.0, t * 0.29));
  float boil = 0.14 + uEnergy * 0.07 + uLevel * 0.3;
  float rr = r * (1.0 + n1 * boil + n2 * boil * 0.45 + uLevel * 0.25 * aRand.x);
  // each particle drifts around the sphere at its own speed: the swirl
  vec3 p = rotY(dir, t * (0.06 + 0.22 * aRand.y) * (1.0 + uEnergy) + n1 * 0.35);
  p = rotX(p, sin(t * 0.13 + aRand.w * 6.28) * 0.18);
  p *= rr;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.55 + 0.45 * sin(t * (2.0 + aRand.z * 5.0) + aRand.w * 40.0);
  gl_PointSize = uSize * (0.45 + aRand.z * 0.9) * uPixelRatio * (11.0 / -mv.z) * (1.0 + uLevel * 0.35);
  vMix = clamp((rr - 0.4) / 2.9, 0.0, 1.0);
  vAlpha = twinkle * (0.75 + uEnergy * 0.2 + uLevel * 0.2) * (1.0 - smoothstep(3.2, 4.6, rr));
}`;
const PARTICLE_FS = `
uniform vec3 uHot, uPrimary, uSecondary;
varying float vMix, vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  vec3 c = vMix < 0.5 ? mix(uHot, uPrimary, vMix * 2.0) : mix(uPrimary, uSecondary, (vMix - 0.5) * 2.0);
  gl_FragColor = vec4(c * (0.55 + 0.6 * a), a * vAlpha * 0.9);
}`;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.2, 'rgba(255,255,255,.8)');
  grd.addColorStop(.5, 'rgba(255,255,255,.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Reactor {
  constructor(canvas) {
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
    this.renderer.setClearColor(0x000000, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 0, 11);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .75, .32, .22);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.themeName = 'gold';
    this.colors = {}; this.target = { ...THEMES.gold };
    for (const k of ['hot', 'primary', 'secondary']) this.colors[k] = new THREE.Color(THEMES.gold[k]);
    this.mats = [];   // {mat, role, base}
    this.state = 'boot'; this.energy = .15; this.level = 0; this.levelTarget = 0; this.speech = 0;
    this.denied = 0; this.voice = 0; this.spec = new Float32Array(24); this.specAt = 0;
    this.mouse = new THREE.Vector2(); this.mouseSmooth = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.glow = glowTexture();
    this.orb = new THREE.Group();
    this.scene.add(this.orb);

    this.buildParticles(coarse ? 9000 : 15000);
    this.buildWireframe();
    this.buildCore();
    this.buildBeams();
    this.buildArcs();
    this.buildSparks();
    this.waves = [];

    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', e => this.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  mat(role, opacity, kind = 'basic', extra = {}) {
    const common = { color: this.colors[role].clone(), transparent: true, opacity, depthWrite: false,
      blending: THREE.AdditiveBlending, ...extra };
    const m = kind === 'line' ? new THREE.LineBasicMaterial(common)
      : kind === 'sprite' ? new THREE.SpriteMaterial(common)
      : kind === 'points' ? new THREE.PointsMaterial(common)
      : new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, ...common });
    this.mats.push({ mat: m, role, base: opacity });
    return m;
  }

  // ---------- builders ----------
  buildParticles(n) {
    const pos = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const band = Math.random();
      // 62% dense shell, 23% inner volume, 15% outer haze
      const r = band < .62 ? ORB_R * rand(.9, 1.06) : band < .85 ? ORB_R * Math.cbrt(Math.random()) * .85 : ORB_R * rand(1.08, 1.5);
      pos.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r], i * 3);
      rnd.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
    this.pUniforms = {
      uTime: { value: 0 }, uLevel: { value: 0 }, uEnergy: { value: .2 }, uSize: { value: 2.6 },
      uPixelRatio: { value: this.renderer.getPixelRatio() },
      uHot: { value: this.colors.hot }, uPrimary: { value: this.colors.primary }, uSecondary: { value: this.colors.secondary },
    };
    const m = new THREE.ShaderMaterial({ uniforms: this.pUniforms, vertexShader: PARTICLE_VS, fragmentShader: PARTICLE_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.particles = new THREE.Points(g, m);
    this.particles.frustumCulled = false;
    this.orb.add(this.particles);
  }

  buildWireframe() {
    // triangulated geodesic skeleton + a fainter counter-rotating inner sphere
    this.geo1 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(ORB_R * .78, 2)), this.mat('primary', .5, 'line'));
    this.geo2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(ORB_R * .52, 1)), this.mat('primary', .3, 'line'));
    this.orb.add(this.geo1, this.geo2);
  }

  buildCore() {
    this.core = new THREE.Sprite(this.mat('hot', 1, 'sprite', { map: this.glow }));
    this.core.scale.setScalar(.8);
    this.coreHalo = new THREE.Sprite(this.mat('primary', .3, 'sprite', { map: this.glow }));
    this.coreHalo.scale.setScalar(2.2);
    this.orb.add(this.coreHalo, this.core);
  }

  buildBeams() {
    // long thin light rays through the centre: bright in the middle, fading at both ends
    this.beams = [];
    const group = new THREE.Group();
    for (let i = 0; i < 22; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(9), 3));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending }));
      line.frustumCulled = false;
      group.add(line);
      const b = { line, dir: new THREE.Vector3().randomDirection(), len: rand(3.2, 5.6), phase: rand(0, 10), speed: rand(.6, 2.2),
        life: rand(0, 1), off: rand(-.25, .25) };
      this.beams.push(b);
    }
    this.beamGroup = group;
    this.orb.add(group);
  }

  buildArcs() {
    // fiery ribbons orbiting the sphere on tilted planes
    this.arcs = [];
    for (let i = 0; i < 5; i++) {
      const r = ORB_R * rand(.98, 1.22), tube = rand(.006, .02), arc = rand(1.1, 2.6);
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 160, arc), this.mat(i % 2 ? 'primary' : 'secondary', rand(.35, .6)));
      const holder = new THREE.Group();
      holder.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      holder.add(m);
      this.orb.add(holder);
      this.arcs.push({ holder, mesh: m, speed: rand(.25, .7) * (Math.random() < .5 ? -1 : 1), wob: rand(.05, .2) });
    }
  }

  buildSparks() {
    this.sparkN = 500;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.sparkN * 3).fill(999), 3));
    this.sparkVel = new Float32Array(this.sparkN * 3); this.sparkLife = new Float32Array(this.sparkN); this.sparkI = 0;
    this.sparks = new THREE.Points(g, this.mat('hot', .9, 'points', { size: .07, map: this.glow }));
    this.sparks.frustumCulled = false;
    this.orb.add(this.sparks);
  }

  emitSparks(count, speed = 1) {
    const pos = this.sparks.geometry.attributes.position.array;
    for (let k = 0; k < count; k++) {
      const i = this.sparkI = (this.sparkI + 1) % this.sparkN;
      const d = new THREE.Vector3().randomDirection(), r = ORB_R * rand(.85, 1.05), v = rand(.8, 2.6) * speed;
      pos.set([d.x * r, d.y * r, d.z * r], i * 3);
      this.sparkVel.set([d.x * v, d.y * v, d.z * v], i * 3);
      this.sparkLife[i] = rand(.5, 1.6);
    }
  }

  // ---------- public API (same as the old reactor) ----------
  setTheme(name) { this.themeName = THEMES[name] ? name : 'gold'; this.target = { ...THEMES[this.themeName] }; }
  setState(s) {
    const prev = this.state; this.state = s;
    if (s === 'denied') this.denied = 1;
    if (s === 'listening' && prev !== 'listening') this.pulse(.7);
    if (s === 'speaking' && prev !== 'speaking') this.pulse(.5);
  }
  setLevel(v) { this.levelTarget = v; }
  setSpeech(v) { this.speech = v; }
  setSpectrum(bands) { this.spec.set(bands.slice(0, 24)); this.specAt = performance.now(); }
  pulse(strength = 1) { this.emitSparks(Math.round(120 * strength), 1.2 + strength); this.kick = Math.max(this.kick || 0, strength); }
  setQuality(q) {
    if (q !== 'low') return;
    this.renderer.setPixelRatio(1);
    this.pUniforms.uPixelRatio.value = 1;
    const g = this.particles.geometry; g.setDrawRange(0, Math.floor(g.attributes.position.count * .55));
    this.resize();
    this.bloom.resolution.set(innerWidth / 4, innerHeight / 4);
  }
  pxRadius() {
    const visible = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * (this.baseDist || 11);
    return ORB_R * 1.35 * (innerHeight / visible);
  }
  resize() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.baseDist = 11 * Math.max(1, 1.2 / aspect) * (aspect < 1 ? .78 : 1);
  }

  // ---------- animation ----------
  tick() {
    const dt = Math.min(this.clock.getDelta(), .05), t = this.clock.elapsedTime;
    const target = STATE_ENERGY[this.state] ?? .25;
    this.energy = lerp(this.energy, target, 1 - Math.exp(-dt * 3));
    this.level = lerp(this.level, this.levelTarget, 1 - Math.exp(-dt * 14));
    this.kick = Math.max(0, (this.kick || 0) - dt * 1.6);
    const live = performance.now() - this.specAt < 250 ? this.spec.reduce((a, b) => a + b, 0) / 12 : 0;
    const voice = Math.min(1, Math.max(this.level * (this.state === 'listening' || this.state === 'enrolling' ? 1 : .3), this.speech, live) + this.kick * .4);
    this.voice = lerp(this.voice, voice, 1 - Math.exp(-dt * 10));
    const v = this.voice, e = this.energy;

    // colours: smooth theme changes, red flash when a voice is rejected
    this.denied = Math.max(0, this.denied - dt * .8);
    const k = 1 - Math.exp(-dt * 4), tmp = new THREE.Color();
    for (const role of ['hot', 'primary', 'secondary']) {
      tmp.set(this.target[role]);
      if (this.denied > 0) tmp.lerp(new THREE.Color(THEMES.denied[role]), Math.min(1, this.denied * 1.5));
      this.colors[role].lerp(tmp, k);
    }
    const flick = 1 + Math.sin(t * 21) * .03 + Math.sin(t * 7.7) * .04;
    for (const m of this.mats) { m.mat.color.copy(this.colors[m.role]); m.mat.opacity = m.base * (.75 + e * .25 + v * .15) * flick; }

    // particle plasma
    const u = this.pUniforms;
    u.uTime.value = t; u.uLevel.value = v; u.uEnergy.value = e;

    // skeleton + core
    this.geo1.rotation.y += dt * (.12 + e * .5 + v * .8); this.geo1.rotation.x += dt * .05;
    this.geo2.rotation.y -= dt * (.2 + e * .6); this.geo2.rotation.z += dt * .07;
    const breathe = 1 + Math.sin(t * 1.6) * .03 + v * .12;
    this.geo1.scale.setScalar(breathe); this.geo2.scale.setScalar(breathe * (1 + v * .1));
    this.core.scale.setScalar(.7 + e * .2 + v * .55 + Math.sin(t * 9) * .03);
    this.coreHalo.scale.setScalar(2 + e * .4 + v * 1.1);

    // beams: flicker, slowly turn, grow with energy and voice
    const cols = this.colors, hot = cols.hot, pri = cols.primary;
    for (const b of this.beams) {
      b.life -= dt * b.speed * (.35 + e);
      if (b.life <= 0) { b.dir.randomDirection(); b.len = rand(3.2, 5.8); b.life = 1; b.off = rand(-.25, .25); }
      const L = b.len * (.75 + e * .3 + v * .3), d = b.dir;
      const p = b.line.geometry.attributes.position.array;
      p.set([-d.x * L + b.off, -d.y * L, -d.z * L, b.off * .3, 0, 0, d.x * L, d.y * L + b.off, d.z * L]);
      const inten = Math.sin(Math.PI * Math.min(1, b.life)) * (.45 + .55 * Math.abs(Math.sin(t * 13 + b.phase))) * (.45 + e * .4 + v * .45);
      const c = b.line.geometry.attributes.color.array;
      const cr = (pri.r * .8 + hot.r * .35) * inten, cg = (pri.g * .8 + hot.g * .35) * inten, cb = (pri.b * .8 + hot.b * .35) * inten;
      c.set([0, 0, 0, cr * 1.3, cg * 1.3, cb * 1.3, 0, 0, 0]);
      c[0] = c[6] = pri.r * inten * .05; c[1] = c[7] = pri.g * inten * .05; c[2] = c[8] = pri.b * inten * .05;
      b.line.geometry.attributes.position.needsUpdate = b.line.geometry.attributes.color.needsUpdate = true;
    }
    this.beamGroup.rotation.y += dt * (.05 + e * .2);

    // orbiting arcs
    for (const a of this.arcs) {
      a.mesh.rotation.z += dt * a.speed * (1 + e * 1.8 + v * 2);
      a.holder.rotation.x += dt * a.wob * .3; a.holder.rotation.y += dt * a.wob * .2;
      a.mesh.scale.setScalar(1 + v * .1);
    }

    // sparks thrown off the shell
    this.emitSparks(Math.floor((this.state === 'speaking' ? 40 : this.state === 'thinking' ? 30 : 5) * (.4 + v * 1.5) * dt + Math.random()));
    const sp = this.sparks.geometry.attributes.position.array;
    for (let i = 0; i < this.sparkN; i++) {
      if (this.sparkLife[i] <= 0) { sp[i * 3 + 2] = 999; continue; }
      this.sparkLife[i] -= dt;
      sp[i * 3] += this.sparkVel[i * 3] * dt; sp[i * 3 + 1] += this.sparkVel[i * 3 + 1] * dt; sp[i * 3 + 2] += this.sparkVel[i * 3 + 2] * dt;
      this.sparkVel[i * 3] *= .97; this.sparkVel[i * 3 + 1] *= .97; this.sparkVel[i * 3 + 2] *= .97;
    }
    this.sparks.geometry.attributes.position.needsUpdate = true;

    // the whole orb turns slowly; the camera drifts and leans in while you talk
    this.orb.rotation.y += dt * (.04 + e * .1);
    this.mouseSmooth.lerp(this.mouse, 1 - Math.exp(-dt * 2));
    const yaw = this.mouseSmooth.x * .25 + Math.sin(t * .15) * .1, pitch = this.mouseSmooth.y * .15 + Math.sin(t * .21) * .05;
    const dist = (this.baseDist || 11) - v * 1.4 - e * .3;
    this.camera.position.set(Math.sin(yaw) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * dist);
    this.camera.lookAt(0, 0, 0);
    this.view = { yaw: 0, pitch: .1 };   // the DOM overlay stays flat in orb mode

    this.bloom.strength = .65 + e * .2 + v * .3;
    this.composer.render(dt);
  }
}
