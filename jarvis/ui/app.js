// JARVIS front end. Vanilla JS, no build step.
import { Graph, colorFor } from "./graph.js";

// ---- Turn-taking tuning -------------------------------------------------
const SILENCE_MS = 900;        // quiet this long after speech = end of turn
const VOICE_LEVEL = 0.035;     // RMS above this counts as speech (0..1)
const LEVEL_TICK_MS = 50;      // setInterval, not requestAnimationFrame: RAF stops in background tabs
const MAX_TURN_MS = 30000;     // hard cap on one spoken turn
const NO_SPEECH_RESET_MS = 12000; // nothing said for this long: drop the buffer and keep listening
// --------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const EXAMPLES = [
  "What did I pay for the kitchen so far?",
  "מה יש לי היום?",
  "Play some lo-fi on YouTube",
  "Brief me",
  "¿Qué tengo pendiente con el viaje a Tokio?",
  "Remember that Itai's birthday is on March 3",
  "תפתח את יוטיוב",
  "Turn the volume down",
  "Who emailed me, and do I know them?",
  "Plan my day",
];
const LANGS = [
  ["auto", "AUTO"], ["he", "עברית"], ["en", "ENGLISH"], ["es", "ESPAÑOL"], ["ar", "العربية"],
  ["ru", "РУССКИЙ"], ["fr", "FRANÇAIS"], ["de", "DEUTSCH"], ["it", "ITALIANO"], ["pt", "PORTUGUÊS"],
  ["ja", "日本語"], ["zh", "中文"],
];

const state = {
  graph: null, status: null, muted: false, lang: "auto",
  phase: "idle", micOn: false, level: 0, outLevel: 0,
};

// ======================================================================= boot
async function boot() {
  bindUi();
  rotatePlaceholder();
  drawReactorLoop();
  try {
    state.status = await (await fetch("/api/status")).json();
  } catch {
    banner("SERVER", "Can't reach the JARVIS server. Is `python agent/main.py` running?");
    return;
  }
  applyStatus(state.status);
  const data = await (await fetch("/api/graph")).json();
  state.graph = new Graph($("graph"), data, {
    onFocus: (n) => openNote(n),
    onPath: (path) => showPath(path),
    onHover: (n, x, y) => tooltip(n, x, y),
  });
  renderFilters(data);
  renderHubs(data);
}

function applyStatus(s) {
  $("mode-badge").textContent = s.mode === "demo" ? "DEMO" : "LIVE";
  $("mode-badge").classList.toggle("warn", s.mode !== "demo");
  if (s.model.ok) {
    $("model-text").textContent = s.model.label;
  } else {
    $("model-text").textContent = "NO MODEL";
    $("model-pill").classList.add("warn");
    banner("NO MODEL", `${s.model.reason} Routing by keyword matching against your files until then — it is not the model talking.`, "info");
  }
  if (!s.voice.tts) {
    banner("VOICE OUT", window.speechSynthesis
      ? "No ElevenLabs key — speaking with your computer's built-in voice instead."
      : s.voice.reason + " This browser has no built-in voice, so replies are text only.", "info");
  }
  if (!s.voice.stt) banner("VOICE IN", "No ElevenLabs key, so the mic can't transcribe. On Windows: click the ask bar and press Win+H to dictate, then Enter.", "info");
  for (const w of s.warnings || []) banner("SETUP", w, "info");
}

// ======================================================================= panels
function renderFilters(data) {
  const counts = {};
  for (const n of data.nodes) counts[n.type] = (counts[n.type] || 0) + 1;
  const hidden = new Set();
  const ul = $("filters");
  ul.innerHTML = "";
  for (const [type, c] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="dot" style="background:${colorFor(type)}"></span><span class="name">${esc(type)}</span><span class="c">${c}</span>`;
    li.onclick = () => {
      hidden.has(type) ? hidden.delete(type) : hidden.add(type);
      li.classList.toggle("off", hidden.has(type));
      state.graph.setHidden([...hidden]);
    };
    ul.appendChild(li);
  }
}

function renderHubs(data) {
  const ol = $("hubs");
  ol.innerHTML = "";
  for (const n of [...data.nodes].sort((a, b) => b.degree - a.degree).slice(0, 8)) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="dot" style="background:${colorFor(n.type)}"></span><span dir="auto">${esc(n.title)}</span><span class="n">${n.degree}</span>`;
    li.onclick = () => state.graph.focusOn(n.id);
    ol.appendChild(li);
  }
}

async function openNote(n) {
  $("insp-empty").hidden = !!n;
  $("insp-body").hidden = !n;
  if (!n) return;
  $("insp-dot").style.background = colorFor(n.type);
  $("insp-title").textContent = n.title;
  $("insp-meta").innerHTML = `<span class="pill tiny">${esc(n.type)}</span><span class="pill tiny">${n.degree} links</span>`;
  $("insp-text").textContent = "…";
  const note = await (await fetch("/api/note?id=" + encodeURIComponent(n.id))).json();
  $("insp-path").textContent = note.path || "unresolved link — no file";
  $("insp-text").textContent = note.text || "";
  const links = $("insp-links");
  links.innerHTML = "";
  for (const l of note.links) {
    const b = document.createElement("button");
    b.className = "chip-link";
    b.innerHTML = `<span class="dot" style="background:${colorFor(l.type)}"></span><span dir="auto">${esc(l.title)}</span>`;
    b.onclick = () => state.graph.focusOn(l.id);
    links.appendChild(b);
  }
}

function showPath(path) {
  if (!path.length) return say("No path between those two.", null, { tool: "graph" }, false);
  const hops = path.map((n) => n.title).join(" → ");
  showReply(`${path.length - 1} hops: ${hops}`, null, { tool: "path" });
}

function tooltip(n, x, y) {
  const t = $("tooltip");
  if (!n) return (t.hidden = true);
  t.hidden = false;
  t.innerHTML = `<span dir="auto">${esc(n.title)}</span><small>${esc(n.type)} · ${n.degree} links — click to focus</small>`;
  t.style.left = x + 14 + "px";
  t.style.top = y + 14 + "px";
}

// ======================================================================= banners
const shownBanners = new Set();
function banner(tag, text, kind = "error") {
  const key = tag + text;
  if (shownBanners.has(key)) return;
  shownBanners.add(key);
  const el = document.createElement("div");
  el.className = "banner" + (kind === "info" ? " info" : "");
  el.innerHTML = `<b>${esc(tag)}</b><span>${esc(text)}</span><button title="Dismiss">×</button>`;
  el.querySelector("button").onclick = () => { el.remove(); shownBanners.delete(key); };
  $("banners").appendChild(el);
}

// ======================================================================= ask
async function ask(text) {
  text = text.trim();
  if (!text) return;
  setPhase("thinking");
  $("live").hidden = false;
  $("live").textContent = "› " + text;
  let res;
  try {
    const r = await fetch("/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: state.lang }),
    });
    res = await r.json();
    if (!r.ok) throw new Error(res.error || r.statusText);
  } catch (e) {
    banner("ASK FAILED", String(e.message || e));
    setPhase("idle");
    return resumeListening();
  }
  if (res.warning) banner("MODEL", res.warning, "info");
  showReply(res.say, res.card, res);
  if (res.card?.focus?.length) {
    state.graph.setHighlight(res.card.focus);
    state.graph.focusOn(res.card.focus[0]);
  }
  await speak(res.say);
  resumeListening();
}

function showReply(text, card, meta = {}) {
  $("reply").hidden = false;
  document.body.classList.add("reply-open");
  $("caption").textContent = text;
  $("reply-tool").textContent = meta.tool || "conversation";
  const route = $("reply-route");
  route.hidden = meta.routed_by !== "keywords";
  route.textContent = "keyword routing · no model";
  renderCard(card);
}

function renderCard(card) {
  const root = $("card");
  root.innerHTML = "";
  if (!card) return;
  if (card.title) root.insertAdjacentHTML("beforeend", `<h3>${esc(card.title)}</h3>`);
  for (const row of card.rows || []) {
    const el = document.createElement("div");
    el.className = "row" + (row.id ? " click" : "");
    const badges = (row.badges || []).map((b) => `<span class="badge ${b.kind || "ok"}">${esc(b.text)}</span>`).join("");
    el.innerHTML = `${row.k ? `<span class="k">${esc(row.k)}</span>` : ""}<div><div class="row-title" dir="auto">${esc(row.title)}${badges}</div>${row.sub ? `<div class="row-sub" dir="auto">${esc(row.sub)}</div>` : ""}</div>`;
    if (row.id) el.onclick = () => state.graph.focusOn(row.id);
    root.appendChild(el);
  }
  if (card.body) root.insertAdjacentHTML("beforeend", `<div class="card-body" dir="auto">${esc(card.body)}</div>`);
  if (card.sources?.length) root.insertAdjacentHTML("beforeend", `<div class="sources">${card.sources.map(esc).join("<br>")}</div>`);
  if (card.actions?.length) {
    const box = document.createElement("div");
    box.className = "card-actions";
    for (const a of card.actions) {
      const b = document.createElement("button");
      b.className = "btn " + (a.style || "");
      b.textContent = a.label;
      b.onclick = () => runAction(a, b);
      box.appendChild(b);
    }
    root.appendChild(box);
  }
}

async function runAction(a, btn) {
  if (a.type === "url") return window.open(a.url, "_blank", "noopener");
  if (a.type === "copy") {
    await navigator.clipboard.writeText(a.text);
    btn.textContent = "Copied";
    return;
  }
  if (a.type === "confirm" || a.type === "cancel") {
    const r = await fetch("/api/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, approve: a.type === "confirm" }),
    });
    const res = await r.json();
    showReply(res.say, res.card, res);
    speak(res.say);
  }
}

// ======================================================================= voice out
let currentAudio = null;
async function speak(text) {
  if (state.muted || !text) { setPhase("idle"); return; }
  if (!state.status?.voice.tts) return systemSpeak(text);
  setPhase("speaking");                       // mic is deaf from here until playback ends
  try {
    const r = await fetch("/api/speak", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: state.lang }),
    });
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    const url = URL.createObjectURL(await r.blob());
    const audio = new Audio(url);
    currentAudio = audio;
    trackOutput(audio);
    await audio.play();
    await new Promise((done) => { audio.onended = done; audio.onpause = done; });
    URL.revokeObjectURL(url);
  } catch (e) {
    banner("VOICE OUT", "Speech failed: " + (e.message || e));
  } finally {
    currentAudio = null;
    if (state.phase === "speaking") setPhase("idle");
  }
}

// ---- Fallback voice: the computer's own (Windows/Edge voices). Free, no key, output only.
const SCRIPT_LANG = [[/[\u0590-\u05FF]/, "he"], [/[\u0600-\u06FF]/, "ar"], [/[\u0400-\u04FF]/, "ru"],
                     [/[\u3040-\u30FF]/, "ja"], [/[\u4E00-\u9FFF]/, "zh"]];
function pickVoice(text) {
  const voices = speechSynthesis.getVoices();
  let lang = state.lang !== "auto" ? state.lang : (SCRIPT_LANG.find(([re]) => re.test(text)) || [, "en"])[1];
  if (lang === "en" && /[¿¡ñ]|\b(qué|está|hola|gracias)\b/i.test(text)) lang = "es";
  const mine = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  // Edge's "Online (Natural)" voices sound far better than the classic desktop ones.
  return { lang, voice: mine.find((v) => /natural|online/i.test(v.name)) || mine[0] || null };
}

function systemSpeak(text) {
  if (!window.speechSynthesis) { setPhase("idle"); return Promise.resolve(); }
  return new Promise((done) => {
    const u = new SpeechSynthesisUtterance(text);
    const { lang, voice } = pickVoice(text);
    if (voice) u.voice = voice;
    else banner("VOICE OUT", `Your computer has no ${lang} voice installed. Windows: Settings → Time & language → Speech → Add voices. Or use Microsoft Edge, which has online voices.`, "info");
    u.lang = voice?.lang || lang;
    let over = false;
    const finish = () => { if (over) return; over = true; clearInterval(fake); state.outLevel = 0; if (state.phase === "speaking") setPhase("idle"); done(); };
    u.onend = finish;
    u.onerror = finish;
    setTimeout(finish, 4000 + text.length * 110);   // some engines never fire onend
    setPhase("speaking");                     // mic is deaf until it finishes
    // No audio stream to measure here, so the reactor gets a gentle synthetic level.
    const fake = setInterval(() => { state.outLevel = 0.06 + Math.random() * 0.08; }, 90);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

let outCtx, outAnalyser;
function trackOutput(audio) {
  try {
    outCtx = outCtx || new AudioContext();
    // A suspended context would swallow the audio; play it directly this once instead.
    if (outCtx.state !== "running") { outCtx.resume(); outAnalyser = null; return; }
    const src = outCtx.createMediaElementSource(audio);
    outAnalyser = outCtx.createAnalyser();
    outAnalyser.fftSize = 512;
    src.connect(outAnalyser);
    outAnalyser.connect(outCtx.destination);
  } catch { outAnalyser = null; }
}

function bargeIn() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (window.speechSynthesis?.speaking) speechSynthesis.cancel();
  setPhase("idle");
  if (state.micOn) startListening();
}

// ======================================================================= voice in
const mic = { stream: null, ctx: null, analyser: null, buf: null, timer: null, rec: null, chunks: [],
              heard: false, lastVoice: 0, started: 0 };

async function micToggle() {
  if (state.phase === "speaking") return bargeIn();
  if (state.micOn) return micOff();
  if (!state.status?.voice.stt) {
    // No transcriber: hand over to Windows voice typing in the ask bar.
    $("ask").focus();
    live("Press Win+H to dictate, then Enter");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    banner("MIC", "This browser can't record audio here. Open JARVIS at http://localhost (not a file:// page) in a current browser.");
    return;
  }
  try {
    mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    const why = e.name === "NotAllowedError"
      ? "Microphone is blocked. Click the lock icon in the address bar → Microphone → Allow, then press the mic again."
      : e.name === "NotFoundError" ? "No microphone found. Plug one in or check Windows sound settings."
      : "Microphone failed: " + e.message;
    banner("MIC BLOCKED", why);
    return;
  }
  mic.ctx = new AudioContext();
  const src = mic.ctx.createMediaStreamSource(mic.stream);
  mic.analyser = mic.ctx.createAnalyser();
  mic.analyser.fftSize = 1024;
  mic.buf = new Float32Array(mic.analyser.fftSize);
  src.connect(mic.analyser);
  mic.timer = setInterval(levelTick, LEVEL_TICK_MS);
  state.micOn = true;
  $("mic").classList.add("on");
  startListening();
  // A live track that never produces samples = silently dead mic. Say so.
  setTimeout(() => {
    if (state.micOn && mic.peak === 0) banner("MIC SILENT", "The microphone is on but sending pure silence. Check it isn't muted in Windows (Settings → Sound → Input).");
  }, 4000);
  mic.peak = 0;
}

function micOff() {
  state.micOn = false;
  $("mic").classList.remove("on");
  clearInterval(mic.timer);
  if (mic.rec?.state === "recording") { mic.rec.onstop = null; mic.rec.stop(); }
  mic.stream?.getTracks().forEach((t) => t.stop());
  mic.ctx?.close();
  Object.assign(mic, { stream: null, ctx: null, analyser: null, rec: null });
  $("live").hidden = true;
  if (state.phase === "listening") setPhase("idle");
}

function startListening() {
  if (!state.micOn || !mic.stream) return;
  mic.chunks = [];
  mic.heard = false;
  mic.started = mic.lastVoice = performance.now();
  mic.rec = new MediaRecorder(mic.stream);
  mic.rec.ondataavailable = (e) => e.data.size && mic.chunks.push(e.data);
  mic.rec.onstop = () => sendTurn();
  mic.rec.start(250);
  setPhase("listening");
  live("Listening…");
}

function resumeListening() {
  if (state.micOn && state.phase === "idle") startListening();
}

function levelTick() {
  if (!mic.analyser) return;
  mic.analyser.getFloatTimeDomainData(mic.buf);
  let sum = 0;
  for (const v of mic.buf) sum += v * v;
  const rms = Math.sqrt(sum / mic.buf.length);
  mic.peak = Math.max(mic.peak || 0, rms);
  state.level = rms;
  if (state.phase !== "listening" || mic.rec?.state !== "recording") return;   // deaf unless listening
  const now = performance.now();
  if (rms > VOICE_LEVEL) {
    mic.lastVoice = now;
    if (!mic.heard) mic.heard = true;
    live(`● Hearing you… ${((now - mic.started) / 1000).toFixed(1)}s`);
  }
  if (mic.heard && (now - mic.lastVoice > SILENCE_MS || now - mic.started > MAX_TURN_MS)) {
    setPhase("thinking");
    mic.rec.stop();                                       // -> sendTurn
  } else if (!mic.heard && now - mic.started > NO_SPEECH_RESET_MS) {
    mic.rec.onstop = null;
    mic.rec.stop();
    startListening();
  }
}

async function sendTurn() {
  const type = mic.rec?.mimeType || "audio/webm";
  const blob = new Blob(mic.chunks, { type });
  live("Transcribing…");
  try {
    const r = await fetch("/api/listen?lang=" + state.lang, { method: "POST", headers: { "Content-Type": type }, body: blob });
    const res = await r.json();
    if (!r.ok) throw new Error(res.error || r.statusText);
    if (!res.text.trim()) { setPhase("idle"); return resumeListening(); }
    live("› " + res.text);
    await ask(res.text);
  } catch (e) {
    banner("TRANSCRIBER", "Couldn't transcribe: " + (e.message || e));
    setPhase("idle");
    resumeListening();
  }
}

function live(text) {
  $("live").hidden = false;
  $("live").textContent = text;
}

// ======================================================================= state + reactor
function setPhase(p) {
  state.phase = p;
  const pill = $("state-pill");
  pill.className = "pill state " + p;
  $("state-text").textContent = p.toUpperCase();
  if (state.graph) state.graph.activity = p === "thinking" ? 1 : 0;
}

const bars = [];
for (let i = 0; i < 16; i++) bars.push($("bars").appendChild(document.createElement("span")));

function drawReactorLoop() {
  const c = $("reactor"), ctx = c.getContext("2d");
  const W = c.width, H = c.height, cx = W / 2, cy = H / 2;
  let spin = 0, smooth = 0;
  const outBuf = new Uint8Array(256);
  function frame(t) {
    if (outAnalyser && state.phase === "speaking") {
      outAnalyser.getByteTimeDomainData(outBuf);
      let s = 0;
      for (const v of outBuf) s += ((v - 128) / 128) ** 2;
      state.outLevel = Math.sqrt(s / outBuf.length);
    } else state.outLevel = 0;
    const lvl = state.phase === "speaking" ? state.outLevel * 3 : state.phase === "listening" ? state.level * 6 : 0;
    smooth += (Math.min(1, lvl) - smooth) * 0.25;
    const speed = { idle: 0.004, listening: 0.012, thinking: 0.05, speaking: 0.02 }[state.phase];
    spin += speed;
    ctx.clearRect(0, 0, W, H);
    const teal = "46,230,200";
    // ticks
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2 + spin * 0.4, long = i % 6 === 0;
      const r0 = 98 - (long ? 7 : 3), r1 = 98;
      ctx.strokeStyle = `rgba(${teal},${long ? 0.7 : 0.3})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    // segmented outer ring
    ctx.lineWidth = 5; ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const a0 = spin + i * Math.PI / 2;
      ctx.strokeStyle = `rgba(${teal},${0.55 + smooth * 0.45})`;
      ctx.beginPath(); ctx.arc(cx, cy, 84, a0, a0 + Math.PI / 2 - 0.35); ctx.stroke();
    }
    // orange arc — the one accent that isn't teal
    ctx.lineWidth = 3;
    ctx.strokeStyle = state.phase === "thinking" ? "rgba(255,154,60,0.95)" : "rgba(255,154,60,0.7)";
    const oa = -spin * 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, 72, oa, oa + (state.phase === "thinking" ? 2.2 : 1.1)); ctx.stroke();
    // dotted inner ring
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 - spin;
      ctx.fillStyle = `rgba(${teal},0.35)`;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, 1, 0, Math.PI * 2); ctx.fill();
    }
    // core
    const coreR = 40 + smooth * 10 + (state.phase === "idle" ? Math.sin(t / 900) * 1.5 : 0);
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, coreR + 14);
    g.addColorStop(0, `rgba(${teal},${0.22 + smooth * 0.4})`);
    g.addColorStop(0.7, `rgba(${teal},0.08)`);
    g.addColorStop(1, `rgba(${teal},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, coreR + 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${teal},0.6)`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#e8fffb";
    ctx.font = "600 12px Consolas, 'Cascadia Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("J.A.R.V.I.S.", cx, cy);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Bars follow the real mic level; driven by setInterval so they keep moving in the background.
  setInterval(() => {
    const lvl = state.phase === "speaking" ? state.outLevel * 4 : state.micOn ? state.level * 14 : 0;
    bars.forEach((b, i) => {
      const wobble = 0.55 + 0.45 * Math.sin(performance.now() / 120 + i * 1.7);
      b.style.height = Math.max(3, Math.min(28, lvl * 28 * wobble)) + "px";
    });
  }, LEVEL_TICK_MS);
}

// ======================================================================= ui wiring
function bindUi() {
  $("ask-form").onsubmit = (e) => {
    e.preventDefault();
    const v = $("ask").value;
    $("ask").value = "";
    if (currentAudio || window.speechSynthesis?.speaking) bargeIn();
    ask(v);
  };
  $("mic").onclick = () => micToggle();
  $("btn-mute").onclick = () => {
    state.muted = !state.muted;
    $("btn-mute").classList.toggle("on", state.muted);
    $("btn-mute").textContent = state.muted ? "Muted" : "Mute";
    if (state.muted && currentAudio) bargeIn();
  };
  $("btn-brief").onclick = () => ask("Brief me");
  $("btn-plan").onclick = () => ask("Plan my day");
  $("btn-memory").onclick = showMemory;
  $("btn-fit").onclick = () => state.graph?.fit();
  $("reply-close").onclick = () => {
    $("reply").hidden = true;
    document.body.classList.remove("reply-open");
    state.graph?.setHighlight([]);
  };
  $("lang-btn").onclick = () => ($("lang-menu").hidden = !$("lang-menu").hidden);
  for (const [code, name] of LANGS) {
    const b = document.createElement("button");
    b.textContent = name;
    b.className = code === state.lang ? "on" : "";
    b.onclick = () => {
      state.lang = code;
      $("lang-text").textContent = name;
      [...$("lang-menu").children].forEach((x) => x.classList.toggle("on", x === b));
      $("lang-menu").hidden = true;
    };
    $("lang-menu").appendChild(b);
  }
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (e.code === "Space") { e.preventDefault(); micToggle(); }
    if (e.key === "Escape") { state.phase === "speaking" ? bargeIn() : micOff(); }
    if (e.key === "/") { e.preventDefault(); $("ask").focus(); }
  });
}

async function showMemory() {
  const res = await (await fetch("/api/memory")).json();
  showReply(res.say, res.card, { tool: "memory" });
}

function rotatePlaceholder() {
  let i = 0;
  const input = $("ask");
  setInterval(() => {
    if (document.activeElement === input) return;
    i = (i + 1) % EXAMPLES.length;
    input.placeholder = "Ask JARVIS…  e.g. “" + EXAMPLES[i] + "”";
  }, 4000);
  input.placeholder = "Ask JARVIS…  e.g. “" + EXAMPLES[0] + "”";
}

function say(text, card, meta, voice = true) {
  showReply(text, card, meta);
  if (voice) speak(text);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

window.jarvis = state;   // handy in devtools
boot();
