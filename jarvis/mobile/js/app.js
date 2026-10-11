// =============================================================================
//  J.A.R.V.I.S phone edition – controller
// =============================================================================
import { Agent, clean, parse, runLocal, stripWake, wantsAI } from './brain.js';

const $ = s => document.querySelector(s);
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const STATE_LABEL = { boot: 'INITIALIZING', idle: 'TAP TO TALK', listening: 'LISTENING', thinking: 'PROCESSING',
  ai: 'NEURAL PROCESSING', speaking: 'RESPONDING', wake: 'SAY "JARVIS"' };

// ---------------------------------------------------------------- settings
const DEFAULTS = { key: '', name: 'אדוני', theme: 'green', nav: 'waze', wake: false, voice: true };
const settings = (() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('jarvis-settings') || '{}') }; } catch { return { ...DEFAULTS }; } })();
const saveSettings = () => { try { localStorage.setItem('jarvis-settings', JSON.stringify(settings)); } catch {} };

let reactor = null, agent = new Agent(settings.key, settings), state = 'boot';

// ---------------------------------------------------------------- 3D
async function initScene() {
  try {
    const { Reactor } = await import('./scene.js');
    reactor = new Reactor($('#scene'));
    reactor.setTheme(settings.theme);
    window.reactor = reactor;
  } catch (e) { console.error(e); }
}
let fpsN = 0, fpsT = performance.now(), low = 0;
function frame(now) {
  document.documentElement.style.setProperty('--voice', (reactor?.voice || 0).toFixed(3));
  if (++fpsN && now - fpsT > 2000) {
    const fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now;
    if (reactor && fps < 30 && ++low === 2) reactor.setQuality('low');
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- ui helpers
function setTheme(t) {
  settings.theme = t; saveSettings();
  document.documentElement.dataset.theme = t;
  reactor?.setTheme(t);
  document.querySelector('meta[name=theme-color]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#010805';
}
function setState(s) {
  state = s;
  document.body.dataset.state = s === 'ai' ? 'thinking' : s;
  $('#core-state').textContent = s === 'idle' && settings.wake ? STATE_LABEL.wake : STATE_LABEL[s] || s.toUpperCase();
  reactor?.setState(s === 'ai' ? 'thinking' : s);
}
let typeTimer;
function reply(text) {
  const el = $('#reply'); clearInterval(typeTimer); el.textContent = ''; let i = 0;
  typeTimer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typeTimer); }, 20);
}
function toast(text, level = '') {
  const t = document.createElement('div'); t.className = 'toast ' + level; t.textContent = text; $('#toasts').append(t);
  setTimeout(() => t.remove(), 3500);
}
const ICONS = {
  youtube: '<path d="M4 7.5c0-1.4 1-2.5 2.4-2.6C8.2 4.8 10 4.7 12 4.7s3.8.1 5.6.2C19 5 20 6.1 20 7.5v9c0 1.4-1 2.5-2.4 2.6-1.8.1-3.6.2-5.6.2s-3.8-.1-5.6-.2C5 19 4 17.9 4 16.5z"/><path d="M10 9l5 3-5 3z" class="fill"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2M9 3h6"/>',
  navigate: '<path d="M3 11l18-8-8 18-2-8z"/>',
  call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
};
function card(kind, title, sub = '') {
  const el = document.createElement('div');
  el.className = 'card panel';
  el.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[kind] || ICONS.open}</svg><div><div class="kind"></div><div class="title" dir="auto"></div><div class="sub" dir="auto"></div></div>`;
  el.querySelector('.kind').textContent = kind.toUpperCase();
  el.querySelector('.title').textContent = title; el.querySelector('.sub').textContent = sub;
  $('#cards').prepend(el);
  while ($('#cards').children.length > 2) $('#cards').lastElementChild.remove();
  reactor?.pulse(.6);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, 6000);
}
// links: a new tab/app when the browser allows it, otherwise navigate (in the installed app this opens the target app)
function open(url, c) {
  if (c) card(...c);
  setTimeout(() => {
    if (url.startsWith('tel:')) { location.href = url; return; }
    const w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }, 650);
}
const timers = [];
function timer(sec, msg) {
  card('timer', msg, sec >= 60 ? `בעוד ${Math.round(sec / 60)} דק׳` : `בעוד ${sec} שנ׳`);
  timers.push(setTimeout(() => {
    navigator.vibrate?.([300, 150, 300, 150, 600]);
    card('timer', msg, 'עכשיו'); say(msg);
    if (window.Notification?.permission === 'granted') navigator.serviceWorker?.ready.then(r => r.showNotification('J.A.R.V.I.S', { body: msg, icon: 'icons/icon-192.png' }));
  }, sec * 1000));
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}
const ctx = { open, card, toast, setTheme, timer, settings };

// ---------------------------------------------------------------- speech out
let heVoice = null, speakRaf = 0, speakEnv = 0;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  heVoice = vs.find(v => /he[-_]IL/i.test(v.lang) && /male|avri|asaf/i.test(v.name)) || vs.find(v => /^he/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text) {
  if (!text) return Promise.resolve();
  reply(text);
  if (!settings.voice || !('speechSynthesis' in window)) { setState('idle'); return Promise.resolve(); }
  return new Promise(res => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL'; if (heVoice) u.voice = heVoice; u.rate = 1.05; u.pitch = .95;
    const loop = t => {   // the reactor "speaks": envelope bumped on every word boundary
      speakEnv = Math.max(.22, speakEnv * .9);
      reactor?.setSpeech(Math.min(1, speakEnv * (.75 + .25 * Math.sin(t / 45))));
      speakRaf = requestAnimationFrame(loop);
    };
    u.onstart = () => { setState('speaking'); speakEnv = .7; speakRaf = requestAnimationFrame(loop); };
    u.onboundary = () => { speakEnv = .65 + Math.random() * .35; };
    const done = () => { cancelAnimationFrame(speakRaf); reactor?.setSpeech(0); setState('idle'); res(); if (settings.wake) listen(); };
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
  });
}

// ---------------------------------------------------------------- speech in
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, awakeUntil = 0;
let meter = null;   // optional real microphone spectrum (Android); iOS can't share the mic with recognition

async function startMeter() {
  if (meter || isIOS || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const ac = new AudioContext(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
    an.fftSize = 1024; src.connect(an);
    const buf = new Uint8Array(an.frequencyBinCount), hz = ac.sampleRate / an.fftSize;
    const edges = Array.from({ length: 25 }, (_, i) => 90 * Math.pow(7500 / 90, i / 24));
    meter = { stream, ac };
    const tick = () => {
      if (!meter) return;
      an.getByteFrequencyData(buf);
      const bands = edges.slice(0, 24).map((lo, i) => {
        const a = Math.floor(lo / hz), b = Math.max(a + 1, Math.floor(edges[i + 1] / hz));
        let s = 0; for (let k = a; k < b; k++) s += buf[k]; return Math.min(1, s / (b - a) / 200);
      });
      const level = bands.reduce((x, y) => x + y, 0) / 24;
      if (state === 'listening') { reactor?.setSpectrum(bands); reactor?.setLevel(Math.min(1, level * 2.2)); }
      setTimeout(tick, 50);
    };
    tick();
  } catch { meter = false; }
}

function listen() {
  if (!SR) { toast('הדפדפן הזה לא תומך בזיהוי דיבור – נסה Chrome או Safari, או הקלד', 'error'); $('#cmd').hidden = false; return; }
  if (listening) { rec?.stop(); return; }
  speechSynthesis.cancel();
  rec = new SR();
  rec.lang = 'he-IL'; rec.interimResults = true; rec.maxAlternatives = 1;
  rec.continuous = false;
  let finalText = '', fake = 0;
  rec.onstart = () => {
    listening = true; setState('listening'); navigator.vibrate?.(20);
    if (!meter) fake = setInterval(() => reactor?.setLevel(.25 + Math.random() * .35), 90);   // no analyser: lively idle
  };
  rec.onresult = e => {
    let interim = '';
    for (const r of e.results) { if (r.isFinal) finalText = r[0].transcript; else interim += r[0].transcript; }
    $('#transcript').textContent = finalText || interim;
    if (!meter) reactor?.setLevel(.8);
  };
  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('צריך לאשר גישה למיקרופון', 'error');
    else if (e.error === 'audio-capture' && meter) { meter.stream.getTracks().forEach(t => t.stop()); meter.ac.close(); meter = false; }
  };
  rec.onend = () => {
    listening = false; clearInterval(fake); reactor?.setLevel(0);
    if (finalText) handle(finalText, 'voice');
    else { setState('idle'); if (settings.wake) setTimeout(listen, 400); }
  };
  try { rec.start(); } catch { listening = false; }
}

// ---------------------------------------------------------------- command pipeline
async function handle(text, source) {
  let { rest, found } = stripWake(text);
  const awake = Date.now() < awakeUntil;
  if (source === 'voice' && settings.wake && !found && !awake) { setState('idle'); setTimeout(listen, 300); return; }
  $('#transcript').textContent = text;
  awakeUntil = Date.now() + 10_000;
  if (found && !rest) return say(`כן, ${settings.name}?`);
  rest = rest || clean(text);
  const it = parse(rest);
  setState('thinking');
  try {
    if (agent.ready && wantsAI(it, rest)) {
      setState('ai');
      const r = await agent.run(rest, ctx);
      if (r !== null) return say(r);
    }
    const r = await runLocal(it, ctx);
    if (r) return say(r);
    if (it.name === 'unknown') return say(agent.ready ? 'לא הבנתי, נסה שוב.' : 'בשביל משפטים חופשיים צריך להגדיר מפתח AI בהגדרות. בינתיים תגיד למשל: תנגן ביוטיוב, נווט הביתה, פתח וואטסאפ.');
    setState('idle');
  } catch (e) {
    console.error(e); say('משהו השתבש.');
  }
}

// ---------------------------------------------------------------- quick actions + settings
const QUICK = [['▶', 'YOUTUBE', 'פתח יוטיוב'], ['◎', 'WAZE', 'פתח ווייז'], ['✆', 'WHATSAPP', 'פתח וואטסאפ'], ['♫', 'SPOTIFY', 'פתח ספוטיפיי'],
  ['G', 'GOOGLE', 'פתח גוגל'], ['✉', 'GMAIL', 'פתח מייל'], ['◷', 'TIMER 5', 'טיימר 5 דקות'], ['⌁', 'BATTERY', 'מה הסוללה']];
function renderQuick() {
  $('#quick').innerHTML = '';
  for (const [icon, label, cmd] of QUICK) {
    const b = document.createElement('button'); b.className = 'q'; b.innerHTML = `<b></b><span></span>`;
    b.querySelector('b').textContent = icon; b.querySelector('span').textContent = label;
    b.onclick = () => { reactor?.pulse(.4); handle(cmd, 'typed'); };
    $('#quick').append(b);
  }
}
function openSettings() {
  $('#set-key').value = settings.key; $('#set-name').value = settings.name; $('#set-theme').value = settings.theme;
  $('#set-nav').value = settings.nav; $('#set-wake').checked = settings.wake; $('#set-voice').checked = settings.voice;
  $('#install-hint').textContent = matchMedia('(display-mode: standalone)').matches ? 'האפליקציה מותקנת ✓'
    : isIOS ? 'להתקנה כאפליקציה: ב-Safari לחץ שיתוף ⬆ ← "הוסף למסך הבית".'
    : 'להתקנה כאפליקציה: בכרום לחץ ⋮ ← "הוסף למסך הבית" / "התקן אפליקציה".';
  $('#sheet').hidden = false;
}
function saveFromSheet() {
  Object.assign(settings, { key: $('#set-key').value.trim(), name: $('#set-name').value.trim() || 'אדוני', nav: $('#set-nav').value,
    wake: $('#set-wake').checked, voice: $('#set-voice').checked });
  setTheme($('#set-theme').value);
  saveSettings();
  agent = new Agent(settings.key, settings);
  brainChip();
  $('#sheet').hidden = true;
  toast('נשמר ✓');
  if (settings.wake && !listening) listen();
}
function brainChip() { $('#chip-ai').className = 'chip ' + (agent.ready ? 'on' : ''); $('#chip-ai').textContent = agent.ready ? 'AI ONLINE' : 'AI OFF'; }

// ---------------------------------------------------------------- clock / battery
function clock() {
  const d = new Date();
  $('#t-time').textContent = d.toTimeString().slice(0, 5); $('#core-time').textContent = d.toTimeString().slice(0, 5);
  $('#core-date').textContent = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();
}
navigator.getBattery?.().then(b => {
  const upd = () => { const c = $('#chip-bat'); c.hidden = false; c.textContent = `BAT ${Math.round(b.level * 100)}%${b.charging ? ' ⚡' : ''}`; c.classList.add('on'); };
  upd(); b.onlevelchange = upd; b.onchargingchange = upd;
}).catch(() => {});

// ---------------------------------------------------------------- wire up
const tap = () => { reactor?.pulse(.5); startMeter().finally(listen); };
$('#mic').onclick = tap;
$('#core').onclick = tap;
$('#btn-kbd').onclick = () => { $('#cmd').hidden = !$('#cmd').hidden; if (!$('#cmd').hidden) $('#cmd-input').focus(); };
$('#cmd').onsubmit = e => { e.preventDefault(); const t = $('#cmd-input').value.trim(); if (!t) return; $('#cmd-input').value = ''; $('#cmd').hidden = true; handle(t, 'typed'); };
$('#btn-settings').onclick = openSettings;
$('#set-save').onclick = saveFromSheet;
$('#set-close').onclick = () => { $('#sheet').hidden = true; };
document.addEventListener('visibilitychange', () => { if (document.hidden) rec?.abort(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
setTheme(settings.theme);
clock(); setInterval(clock, 1000);
renderQuick(); brainChip();
await initScene();
requestAnimationFrame(frame);
setTimeout(() => { $('#boot').classList.add('gone'); setState('idle'); }, 1500);
window.jarvis = { handle, say, card, settings };   // handy from the browser console
