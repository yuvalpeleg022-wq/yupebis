// =============================================================================
//  J.A.R.V.I.S — HUD controller. Talks to the Python core over SSE + POST.
//  Edit while running: saving this file refreshes the HUD.
// =============================================================================
const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const TOKEN = params.get('t') || '';
const api = (path, body = {}) => fetch(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jarvis-Token': TOKEN }, body: JSON.stringify(body),
}).then(r => r.json()).catch(() => ({}));

let reactor = null;
const STATE_LABEL = {
  boot: 'INITIALIZING', idle: 'STANDBY', listening: 'LISTENING', verifying: 'VOICE CHECK', thinking: 'PROCESSING',
  speaking: 'RESPONDING', denied: 'ACCESS DENIED', enrolling: 'VOICE ENROLLMENT', sleeping: 'SLEEP',
};

// ---------------------------------------------------------------- 3D scene
async function initScene() {
  try {
    const { Reactor } = await import('./scene.js');
    reactor = new Reactor($('#scene'));
    window.reactor = reactor;
  } catch (e) {
    console.error(e);
    log({ t: now(), level: 'error', msg: '3D disabled: ' + e.message });
  }
}

// ---------------------------------------------------------------- boot sequence
const BOOT_LINES = [
  'BIOS CHECK ............................ OK', 'LOADING NEURAL INTERFACE .............. OK',
  'CALIBRATING HOLOGRAPHIC DISPLAY ....... OK', 'ARC REACTOR OUTPUT .................... 100%',
  'VOICE RECOGNITION MODULE .............. ONLINE', 'SECURITY PROTOCOLS .................... ARMED',
  'ESTABLISHING UPLINK ................... OK', 'ALL SYSTEMS NOMINAL',
];
function boot() {
  const skip = sessionStorage.getItem('jarvis-booted');
  const el = $('#boot');
  if (skip) { el.classList.add('gone'); document.body.classList.add('ready'); return; }
  $('.boot-logo').innerHTML = [...'J.A.R.V.I.S'].map((c, i) => `<span style="animation-delay:${i * 70}ms">${c}</span>`).join('');
  const lines = $('.boot-lines'), bar = $('.boot-bar i');
  BOOT_LINES.forEach((l, i) => setTimeout(() => {
    const d = document.createElement('div'); d.textContent = '> ' + l; lines.appendChild(d);
    bar.style.width = `${((i + 1) / BOOT_LINES.length) * 100}%`;
  }, 500 + i * 230));
  setTimeout(() => {
    el.classList.add('gone'); document.body.classList.add('ready'); sessionStorage.setItem('jarvis-booted', '1');
  }, 500 + BOOT_LINES.length * 230 + 350);
}

// ---------------------------------------------------------------- clock
const now = () => new Date().toTimeString().slice(0, 8);
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function clock() {
  const d = new Date();
  $('#t-time').textContent = now();
  $('#core-time').textContent = d.toTimeString().slice(0, 5);
  const ds = `${DAYS[d.getDay()]} · ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  $('#t-date').textContent = ds; $('#core-date').textContent = ds;
  $('#track-pct').textContent = (55 + Math.sin(d / 3000) * 4 + Math.random()).toFixed(2) + '%';
  $('#sync-pct').textContent = (98 + Math.random() * 1.9).toFixed(1) + '%';
}

// ---------------------------------------------------------------- theme / state
function setTheme(t) {
  document.documentElement.dataset.theme = t === 'cyan' ? 'cyan' : 'gold';
  reactor?.setTheme(t);
  drawSparks();
}
let deniedTimer;
function setState(s) {
  document.body.dataset.state = s;
  $('#core-state').textContent = STATE_LABEL[s] || s.toUpperCase();
  reactor?.setState(s);
  if (s === 'denied') { clearTimeout(deniedTimer); deniedTimer = setTimeout(() => setState('idle'), 1600); }
}

// ---------------------------------------------------------------- docks + quick actions
function renderDock(dock) {
  for (const side of ['left', 'right']) {
    const el = $(`#dock-${side}`);
    el.innerHTML = '';
    for (const item of (dock?.[side] || []).slice(0, 9)) {
      const tile = document.createElement('div');
      tile.className = 'tile panel chamfer';
      tile.title = item.open;
      tile.innerHTML = `<div class="code"></div><div class="name"></div>`;
      tile.querySelector('.code').textContent = item.code || (item.name || '?').slice(0, 2);
      tile.querySelector('.name').textContent = item.name || item.open;
      tile.addEventListener('click', () => {
        tile.classList.remove('fire'); void tile.offsetWidth; tile.classList.add('fire');
        reactor?.pulse(.6);
        api('/api/open', { target: item.open });
      });
      el.appendChild(tile);
    }
  }
}

const QUICK = {
  left: [
    ['INTERNET', 'open', 'google'], ['DOCUMENTS', 'open', 'documents'], ['DOWNLOADS', 'open', 'downloads'],
    ['PICTURES', 'open', 'pictures'], ['THIS PC', 'open', 'this pc'], ['CONTROL', 'open', 'control panel'],
    ['RECYCLE', 'open', 'recycle bin'],
  ],
  right: [
    ['E-MAIL', 'open', 'gmail'], ['YOUTUBE', 'open', 'youtube'], ['SCREEN SHOT', 'action', 'screenshot'],
    ['LOCK', 'action', 'lock'], ['THEME', 'theme', 'toggle'], ['COMMANDS', 'action', 'edit_commands'],
    ['CONFIG', 'action', 'edit_config'],
  ],
};
function renderQuick() {
  const nav = $('#qa'); nav.innerHTML = '';
  for (const side of ['left', 'right']) {
    for (const [label, kind, value] of QUICK[side]) {
      const a = document.createElement('div');
      a.className = `qa ${side}`;
      a.innerHTML = `<span class="dot"></span><span class="line"></span><span class="lbl"></span>`;
      a.querySelector('.lbl').textContent = label;
      a.addEventListener('click', () => {
        reactor?.pulse(.5);
        if (kind === 'open') api('/api/open', { target: value });
        else if (kind === 'theme') api('/api/theme', { theme: value });
        else api('/api/action', { name: value });
      });
      nav.appendChild(a);
    }
  }
  layoutQuick();
}
function layoutQuick() {
  const r = (reactor?.pxRadius() || Math.min(innerWidth, innerHeight) * .3) + 34;
  const cx = innerWidth / 2, cy = innerHeight / 2;
  for (const side of ['left', 'right']) {
    const items = [...document.querySelectorAll(`.qa.${side}`)];
    const n = items.length, span = 0.95; // radians spread
    items.forEach((el, i) => {
      const a = (i / (n - 1) - .5) * span * 2;
      const x = cx + (side === 'left' ? -1 : 1) * Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      el.style.left = `${x}px`; el.style.top = `${y}px`;
    });
  }
}

// ---------------------------------------------------------------- telemetry
const fmtBytes = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (b >= 1024 && i < 4) { b /= 1024; i++; } return `${b.toFixed(b < 10 && i ? 1 : 0)} ${u[i]}`; };
const fmtUp = s => { const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : `${h}h ${m}m`; };
function gauge(id, pct) {
  const el = $(id); if (!el) return;
  el.querySelector('.val').style.strokeDashoffset = 169.6 * (1 - Math.min(100, pct) / 100);
  el.querySelector('b').textContent = Math.round(pct);
  el.classList.toggle('hot', pct > 90);
}
const hist = { down: Array(60).fill(0), up: Array(60).fill(0) };
function drawSpark(id, data) {
  const c = $(id); if (!c) return;
  const w = c.clientWidth * devicePixelRatio, h = c.clientHeight * devicePixelRatio;
  if (c.width !== w) c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const col = getComputedStyle(document.documentElement).getPropertyValue('--c').trim() || '#ffb547';
  const max = Math.max(...data, 1024);
  g.clearRect(0, 0, w, h);
  g.beginPath();
  data.forEach((v, i) => { const x = (i / (data.length - 1)) * w, y = h - (v / max) * (h - 3) - 1; i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.strokeStyle = col; g.lineWidth = 1.5 * devicePixelRatio; g.shadowColor = col; g.shadowBlur = 6; g.stroke();
  g.lineTo(w, h); g.lineTo(0, h); g.closePath();
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, col + '55'); grd.addColorStop(1, col + '00');
  g.fillStyle = grd; g.shadowBlur = 0; g.fill();
}
function drawSparks() { drawSpark('#spark-down', hist.down); drawSpark('#spark-up', hist.up); }
function stats(s) {
  if (!s) return;
  gauge('#g-cpu', s.cpu); gauge('#g-ram', s.ram); gauge('#g-disk', s.disk?.pct ?? 0);
  const cores = $('#cores');
  if (cores.children.length !== s.cores.length) cores.innerHTML = s.cores.map(() => '<i></i>').join('');
  s.cores.forEach((v, i) => cores.children[i].style.setProperty('--v', `${v}%`));
  $('#v-swap').textContent = `${Math.round(s.swap)}%`;
  $('#v-procs').textContent = s.procs;
  $('#v-uptime').textContent = fmtUp(s.uptime);
  $('#v-mem').textContent = `${fmtBytes(s.ram_used)}`;
  $('#v-down').textContent = fmtBytes(s.down) + '/s';
  $('#v-up').textContent = fmtBytes(s.up) + '/s';
  hist.down.push(s.down); hist.down.shift(); hist.up.push(s.up); hist.up.shift();
  drawSparks();
  const bat = $('#chip-bat');
  if (s.battery) { bat.hidden = false; bat.textContent = `BAT ${Math.round(s.battery.pct)}%${s.battery.plugged ? ' ⚡' : ''}`; bat.classList.add('on'); }
}

// ---------------------------------------------------------------- console / transcript / reply
function log(e) {
  const el = $('#log');
  const d = document.createElement('div');
  d.className = e.level || 'info';
  d.innerHTML = '<i></i><span></span>';
  d.querySelector('i').textContent = e.t;
  d.querySelector('span').textContent = e.msg;
  el.appendChild(d);
  while (el.children.length > 70) el.firstChild.remove();
}
let typeTimer;
function reply(text) {
  const el = $('#reply');
  clearInterval(typeTimer);
  el.textContent = ''; el.classList.add('typing');
  let i = 0;
  typeTimer = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) { clearInterval(typeTimer); el.classList.remove('typing'); }
  }, 22);
}
function transcript(d) {
  const el = $('#transcript');
  el.textContent = d.text;
  el.classList.toggle('ignored', !!d.ignored);
}

// ---------------------------------------------------------------- speech playback (+ visualizer)
let audioCtx, analyser, currentAudio, speechRaf;
function playTTS({ url }) {
  stopTTS(false);
  const a = new Audio(`${url}?t=${encodeURIComponent(TOKEN)}`);
  currentAudio = a;
  a.crossOrigin = 'anonymous';
  try {
    audioCtx = audioCtx || new AudioContext();
    const src = audioCtx.createMediaElementSource(a);
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 512;
    src.connect(analyser); analyser.connect(audioCtx.destination);
    audioCtx.resume?.();
  } catch { analyser = null; }
  const buf = new Uint8Array(256);
  const loop = () => {
    if (analyser && currentAudio === a) {
      analyser.getByteTimeDomainData(buf);
      let sum = 0; for (const v of buf) { const x = (v - 128) / 128; sum += x * x; }
      reactor?.setSpeech(Math.min(1, Math.sqrt(sum / buf.length) * 4));
      speechRaf = requestAnimationFrame(loop);
    }
  };
  a.addEventListener('playing', loop);
  a.addEventListener('ended', () => stopTTS(true));
  a.addEventListener('error', () => stopTTS(true));
  a.play().catch(() => stopTTS(true));
}
function stopTTS(notify) {
  cancelAnimationFrame(speechRaf);
  reactor?.setSpeech(0);
  if (currentAudio) { const a = currentAudio; currentAudio = null; a.pause(); if (notify) api('/api/tts_done'); }
}

// ---------------------------------------------------------------- overlays
function confirmBox(d) {
  const box = $('#confirm');
  if (!d) { box.hidden = true; return; }
  box.querySelector('.q').textContent = d.question;
  box.querySelector('.detail').textContent = d.detail || '';
  box.hidden = false;
}
function enroll(d) {
  const box = $('#enroll');
  if (!d || d.done) { box.hidden = true; return; }
  box.hidden = false;
  $('#enroll-step').textContent = `${d.step}/${d.total}`;
  box.querySelector('.phrase').textContent = d.phrase;
  box.querySelector('.dots').innerHTML = Array.from({ length: d.total }, (_, i) =>
    `<i class="${i < d.step - 1 ? 'done' : i === d.step - 1 ? 'now' : ''}"></i>`).join('');
}
function progress(d) {
  const p = $('#progress');
  if (!d) { p.hidden = true; return; }
  p.hidden = false;
  p.querySelector('.label').textContent = d.label;
  p.classList.toggle('indet', d.pct == null || d.pct === 0);
  p.style.setProperty('--p', `${d.pct || 0}%`);
  if (d.line) p.querySelector('.line').textContent = d.line;
}
function toast(d) {
  const t = document.createElement('div');
  t.className = `toast ${d.level || ''}`; t.dir = 'auto'; t.textContent = d.text;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 3200);
}
function voiceInfo(v) {
  if (!v) return;
  $('#chip-mic').className = 'chip ' + (v.ready ? 'on' : 'bad');
  $('#chip-mic').textContent = v.ready ? 'MIC ONLINE' : 'MIC OFFLINE';
  $('#chip-lock').className = 'chip ' + (v.locked ? 'on' : '');
  $('#chip-lock').textContent = v.locked ? 'VOICE LOCKED' : 'VOICE ID OFF';
}
function link(ok) {
  $('#chip-link').className = 'chip ' + (ok ? 'on' : 'bad');
  $('#chip-link').textContent = ok ? 'LINK' : 'LINK LOST';
}

// ---------------------------------------------------------------- event stream
const handlers = {
  theme: setTheme, status: setState, dock: renderDock, stats, log, reply, transcript,
  tts: playTTS, tts_stop: () => stopTTS(false), confirm: confirmBox, enroll, progress, toast, voice: voiceInfo,
  level: v => { reactor?.setLevel(v); const m = $('#enroll .meter i'); if (m) m.style.width = `${Math.min(100, v * 140)}%`; },
  verify: d => { if (d.ok) reactor?.pulse(.4); },
  reload_hud: () => { sessionStorage.setItem('jarvis-booted', '1'); location.reload(); },
  user: () => {},
};
function connect() {
  const es = new EventSource(`/api/events?t=${encodeURIComponent(TOKEN)}`);
  es.onopen = () => link(true);
  es.onerror = () => link(false);
  es.onmessage = ev => {
    try { const { type, data } = JSON.parse(ev.data); handlers[type]?.(data); }
    catch (e) { console.error(e); }
  };
}
async function loadState() {
  try {
    const r = await fetch(`/api/state?t=${encodeURIComponent(TOKEN)}`);
    const { snapshot, logs } = await r.json();
    for (const k of ['theme', 'dock', 'voice', 'stats', 'status']) if (snapshot[k] != null) handlers[k](snapshot[k]);
    (logs || []).forEach(log);
  } catch { link(false); }
}

// ---------------------------------------------------------------- input
function wireInput() {
  const input = $('#cmd-input');
  $('#cmd').addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim(); if (!text) return;
    input.value = '';
    transcript({ text });
    reactor?.pulse(.5);
    api('/api/command', { text });
  });
  addEventListener('keydown', e => {
    const typing = document.activeElement === input;
    if (e.key === 'Escape') { if (typing && input.value) { input.value = ''; return; } input.blur(); api('/api/ui', { cmd: 'hide' }); }
    else if ((e.key === '/' || e.key === 'Enter') && !typing) { e.preventDefault(); input.focus(); }
    else if (e.key === 'F5') { e.preventDefault(); handlers.reload_hud(); }
    else if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')) { e.preventDefault(); api('/api/ui', { cmd: 'devtools' }); }
  });
  document.querySelectorAll('#confirm button').forEach(b => b.addEventListener('click', () => {
    api('/api/confirm', { yes: b.dataset.yes === '1' }); $('#confirm').hidden = true;
  }));
  $('#enroll-cancel').addEventListener('click', () => api('/api/enroll', { cancel: true }));
  addEventListener('resize', () => { layoutQuick(); drawSparks(); });
}

// ---------------------------------------------------------------- go
boot();
clock(); setInterval(clock, 1000);
wireInput();
await initScene();
renderQuick();
setTimeout(layoutQuick, 3000);
await loadState();
connect();
