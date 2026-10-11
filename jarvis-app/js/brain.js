// =============================================================================
//  J.A.R.V.I.S phone brain: instant local commands + Claude for free-form speech
// =============================================================================
import Anthropic from '../vendor/anthropic-sdk.min.js';

// ---------------------------------------------------------------- text helpers
const GERESH = /[׳’`´‘]/g;
export const clean = t => (t || '').replace(GERESH, "'").toLowerCase().replace(/["!?,;:()\[\]{}«»…–—]+/g, ' ')
  .replace(/(?<![\w])\.|\.(?![\w])/g, ' ').replace(/\s+/g, ' ').trim();
const key = t => clean(t).replace(/['\-]+/g, '').replace(/[ךםןףץ]/g, c => ({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' })[c]).trim();

function lev(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const ratio = (a, b) => 100 * (1 - lev(a, b) / Math.max(a.length, b.length, 1));

const WAKE = ["גרוויס", "גארביס", "גרביס", "גארוויס", "jarvis", "jervis", "גרוויז"];
export function stripWake(text) {
  const out = []; let found = false;
  for (const w of clean(text).split(' ')) {
    const k = key(w);
    if (k.length >= 3 && WAKE.some(x => ratio(k, x) >= 78 || ratio(k.slice(1), x) >= 85)) { found = true; continue; }
    out.push(w);
  }
  while (found && out.length && ['היי', 'הי', 'הלו', 'hey', 'hi', 'ok', 'יו'].includes(out[0])) out.shift();
  return { rest: out.join(' '), found };
}

const has = (t, ...ps) => ps.some(p => new RegExp(`(?<![\\p{L}\\d])[הבלומשכ]?${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\d])`, 'u').test(t));
const after = (words, verbs) => { for (let i = 0; i < Math.min(5, words.length); i++) if (verbs.has(words[i])) return words.slice(i + 1); return null; };
const FILL = new Set(['לי', 'את', 'בבקשה', 'please', 'the', 'a', 'me', 'עכשיו', 'now', 'של', 'האפליקציה', 'אפליקציית', 'אפליקציה', 'האתר', 'אתר', 'app']);
const target = ws => { ws = [...ws]; while (ws.length && FILL.has(ws[0])) ws.shift(); while (ws.length && FILL.has(ws.at(-1))) ws.pop(); return ws.join(' '); };

const OPEN = new Set(['פתח', 'תפתח', 'תפתחי', 'פתחי', 'לפתוח', 'open', 'launch', 'start', 'הפעל', 'תפעיל', 'כנס', 'תכנס', 'היכנס', 'תיכנס', 'עבור', 'תעבור']);
const PLAY = new Set(['נגן', 'תנגן', 'תנגני', 'לנגן', 'שים', 'תשים', 'תשימי', 'play', 'תכניס', 'הכנס']);
const SEARCH = new Set(['חפש', 'תחפש', 'תחפשי', 'לחפש', 'search', 'תגגל', 'גגל']);
const NAV = new Set(['נווט', 'תנווט', 'תנווטי', 'navigate', 'קח', 'תיקח', 'תקח', 'סע', 'דרך']);
const CALL = new Set(['התקשר', 'תתקשר', 'תתקשרי', 'חייג', 'תחייג', 'call', 'dial']);
const YT = new Set(['יוטיוב', 'ביוטיוב', 'מיוטיוב', 'ליוטיוב', 'youtube']);
const YT_NOISE = new Set(['סרטון', 'הסרטון', 'וידאו', 'את', 'של', 'השיר', 'שיר', 'קליפ', 'הקליפ', 'video', 'song', 'on', 'in', 'the', 'לי', 'ב']);

// apps & sites → links that open the app when it's installed
export const LINKS = {
  'youtube': 'https://m.youtube.com', 'יוטיוב': 'https://m.youtube.com', 'google': 'https://www.google.com', 'גוגל': 'https://www.google.com',
  'gmail': 'https://mail.google.com', 'גימייל': 'https://mail.google.com', 'מייל': 'https://mail.google.com',
  'whatsapp': 'https://wa.me/', 'וואטסאפ': 'https://wa.me/', 'ווטסאפ': 'https://wa.me/',
  'instagram': 'https://www.instagram.com', 'אינסטגרם': 'https://www.instagram.com', 'tiktok': 'https://www.tiktok.com', 'טיקטוק': 'https://www.tiktok.com',
  'facebook': 'https://www.facebook.com', 'פייסבוק': 'https://www.facebook.com', 'spotify': 'https://open.spotify.com', 'ספוטיפיי': 'https://open.spotify.com',
  'netflix': 'https://www.netflix.com', 'נטפליקס': 'https://www.netflix.com', 'waze': 'https://waze.com/ul', 'וייז': 'https://waze.com/ul', 'ווייז': 'https://waze.com/ul',
  'maps': 'https://maps.google.com', 'מפות': 'https://maps.google.com', 'גוגל מפות': 'https://maps.google.com', 'telegram': 'https://t.me', 'טלגרם': 'https://t.me',
  'twitter': 'https://x.com', 'טוויטר': 'https://x.com', 'chatgpt': 'https://chatgpt.com', 'צאט גיפיטי': 'https://chatgpt.com', 'claude': 'https://claude.ai', 'קלוד': 'https://claude.ai',
  'calendar': 'https://calendar.google.com', 'יומן': 'https://calendar.google.com', 'drive': 'https://drive.google.com', 'דרייב': 'https://drive.google.com',
  'photos': 'https://photos.google.com', 'תמונות': 'https://photos.google.com', 'translate': 'https://translate.google.com', 'תרגום': 'https://translate.google.com',
  'ynet': 'https://www.ynet.co.il', 'וויינט': 'https://www.ynet.co.il', 'חייגן': 'tel:', 'טלפון': 'tel:', 'אמזון': 'https://www.amazon.com', 'עליאקספרס': 'https://www.aliexpress.com',
};
const linkFor = name => { const k = key(name); for (const [n, u] of Object.entries(LINKS)) if (key(n) === k || key('ה' + n) === k) return [n, u]; return null; };

export const urls = {
  google: q => 'https://www.google.com/search?q=' + encodeURIComponent(q),
  youtube: q => 'https://m.youtube.com/results?search_query=' + encodeURIComponent(q),
  firstResult: q => 'https://duckduckgo.com/?q=' + encodeURIComponent('\\' + q),
  navigate: (dest, app) => app === 'google' ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest)
    : 'https://waze.com/ul?navigate=yes&q=' + encodeURIComponent(dest),
  whatsapp: (text, phone = '') => `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(text)}`,
};

// ---------------------------------------------------------------- local parser
export function parse(text) {
  const t = clean(text), w = t.split(' ').filter(Boolean);
  if (!w.length) return { name: 'empty' };
  if (has(t, 'מה השעה', 'כמה השעה', 'what time')) return { name: 'time' };
  if (has(t, 'מה התאריך', 'איזה יום היום', 'what day')) return { name: 'date' };
  if (has(t, 'סוללה', 'battery', 'בטריה')) return { name: 'battery' };
  if (has(t, 'שקט', 'תשתוק', 'די', 'stop') && w.length <= 2) return { name: 'stop' };
  const colorWord = has(t, 'צבע', 'color', 'מצב', 'theme', 'תחליף', 'שנה');
  if (colorWord && has(t, 'ירוק', 'green')) return { name: 'theme', theme: 'green' };
  if (colorWord && has(t, 'כחול', 'blue', 'cyan')) return { name: 'theme', theme: 'cyan' };
  if (colorWord && has(t, 'זהב', 'gold', 'כתום')) return { name: 'theme', theme: 'gold' };
  if (has(t, 'מה אתה יודע', 'עזרה', 'help', 'מה אתה יכול')) return { name: 'help' };
  let m = t.match(/(?:טיימר|תזכיר לי|תזכורת|timer)\D*(\d+|חצי|רבע)?\s*(שניות|שניה|דקות|דקה|שעות|שעה|seconds?|minutes?|hours?)/);
  if (m) {
    const n = m[1] === 'חצי' ? .5 : m[1] === 'רבע' ? .25 : +(m[1] || 1);
    const unit = /שני|sec/.test(m[2]) ? 1 : /שע|hour/.test(m[2]) ? 3600 : 60;
    return { name: 'timer', seconds: Math.round(n * unit), label: t };
  }
  let r = after(w, CALL);
  if (r) { const num = r.join('').replace(/[^\d+]/g, ''); if (num.length >= 3) return { name: 'call', number: num }; }
  r = after(w, NAV);
  if (r) { const dest = target(r.filter(x => !['אותי', 'ל', 'אל', 'to', 'me'].includes(x))).replace(/^ל/, ''); if (dest) return { name: 'navigate', dest }; }
  const yt = w.some(x => YT.has(x));
  const play = after(w, PLAY);
  if (yt || play) {
    let q = w.filter(x => !YT.has(x) && !OPEN.has(x) && !PLAY.has(x) && !SEARCH.has(x));
    while (q.length && YT_NOISE.has(q[0])) q.shift();
    while (q.length && YT_NOISE.has(q.at(-1))) q.pop();
    if (!q.length && yt) return { name: 'open', target: 'youtube' };
    if (q.length) return { name: 'youtube', query: q.join(' ') };
  }
  r = after(w, SEARCH);
  if (r) { const q = target(r.filter(x => !['בגוגל', 'גוגל', 'google', 'באינטרנט'].includes(x))); if (q) return { name: 'search', query: q }; }
  r = after(w, OPEN);
  if (r && target(r)) return { name: 'open', target: target(r) };
  if (w.length <= 2 && linkFor(t)) return { name: 'open', target: t };
  return { name: 'unknown' };
}

const LOCAL = new Set(['time', 'date', 'battery', 'stop', 'theme', 'help', 'timer', 'call', 'navigate', 'youtube', 'search', 'open', 'empty']);
// YouTube goes to the AI on the phone: it can find the exact video, the local parser only a results page
export const wantsAI = (intent, text) => intent.name === 'youtube' || !LOCAL.has(intent.name) || text.split(' ').length > 9 || /(?:^|\s)(?:ואז|וגם|אחר כך)(?:\s|$)|\sו[תפשסה]\p{L}+/u.test(' ' + text);

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// ctx: { open(url, card), say, card(kind,title,sub), setTheme, timer(sec,msg), settings }
export async function runLocal(it, ctx) {
  const d = new Date();
  switch (it.name) {
    case 'time': return `השעה ${d.toTimeString().slice(0, 5)}`;
    case 'date': return `היום יום ${DAYS[d.getDay()]}, ${d.getDate()} ב${MONTHS[d.getMonth()]}`;
    case 'battery': {
      try { const b = await navigator.getBattery(); return `הסוללה על ${Math.round(b.level * 100)} אחוז${b.charging ? ', ובטעינה' : ''}.`; }
      catch { return 'הטלפון לא מאפשר לי לבדוק את הסוללה.'; }
    }
    case 'stop': speechSynthesis.cancel(); return null;
    case 'theme': ctx.setTheme(it.theme); return { green: 'ירוק.', cyan: 'כחול.', gold: 'זהב.' }[it.theme];
    case 'help': return 'אני יכול לנגן סרטונים ביוטיוב, לחפש, לנווט, לפתוח אפליקציות, להתקשר, לשלוח וואטסאפ ולהגדיר טיימרים. עם מפתח AI אני מבין גם משפטים חופשיים.';
    case 'timer': ctx.timer(it.seconds, 'הטיימר הסתיים'); return `טיימר ל${fmtDur(it.seconds)}.`;
    case 'call': ctx.open('tel:' + it.number, ['call', it.number, 'שיחה']); return 'מחייג.';
    case 'navigate': ctx.open(urls.navigate(it.dest, ctx.settings.nav), ['navigate', it.dest, ctx.settings.nav === 'google' ? 'Google Maps' : 'Waze']); return `מנווט ל${it.dest}.`;
    case 'youtube': ctx.open(urls.youtube(it.query), ['youtube', it.query, 'YouTube']); return `הנה ${it.query} ביוטיוב.`;
    case 'search': ctx.open(urls.google(it.query), ['search', it.query, 'Google']); return `מחפש ${it.query}.`;
    case 'open': {
      const hit = linkFor(it.target);
      if (hit) { ctx.open(hit[1], ['open', hit[0], '']); return `פותח את ${it.target}.`; }
      if (/^[\w-]+(\.[\w-]+)+/.test(it.target)) { ctx.open('https://' + it.target, ['open', it.target, '']); return 'פותח.'; }
      ctx.open(urls.firstResult(it.target), ['open', it.target, 'web']); return `פותח את ${it.target}.`;
    }
    default: return null;
  }
}
const fmtDur = s => s >= 3600 ? `${+(s / 3600).toFixed(1)} שעות` : s >= 60 ? `${+(s / 60).toFixed(1)} דקות` : `${s} שניות`;

// ---------------------------------------------------------------- Claude agent
const SYSTEM = `You are J.A.R.V.I.S., the user's personal AI assistant, running on their phone, modelled on Tony Stark's JARVIS: calm, precise, quietly witty, loyal.

Everything you write is spoken aloud and shown as one line on a holographic HUD:
- Reply in the language the user spoke (usually Hebrew), in one or two short sentences.
- No markdown, lists, emojis, URLs or code. Act first, then confirm briefly.

Use your tools whenever the user wants something done; chain several when a request has several parts.
- A specific YouTube video/song/clip: use web_search to find its exact youtube.com/watch (or youtu.be) link, then open_link it. If you can't find an exact link, use youtube_results.
- Facts, news, weather, scores, prices: answer from web_search in a sentence.
- Navigation → navigate. Calls → call (needs a number; ask if missing). Messages → whatsapp.
- remember stores lasting facts about the user when they ask or clearly would want it.
- Ask one short question only when ambiguity matters.`;

const tool = (name, description, props = {}) => ({ name, description, strict: true,
  input_schema: { type: 'object', properties: props, required: Object.keys(props), additionalProperties: false } });
const S = { type: 'string' };
const TOOLS = [
  tool('open_link', 'Open a URL on the phone (opens the matching app when installed, e.g. YouTube, Spotify, Instagram links). label: short Hebrew name for the HUD.', { url: S, label: S }),
  tool('open_app', 'Open a common app or site by name (youtube, whatsapp, instagram, spotify, waze, maps, gmail, netflix, tiktok, calendar…).', { name: S }),
  tool('youtube_results', 'Open YouTube search results.', { query: S }),
  tool('google', 'Open a Google search page.', { query: S }),
  tool('navigate', 'Start navigation to a destination with the user\'s navigation app.', { destination: S }),
  tool('call', 'Open the dialer with a phone number.', { number: S }),
  tool('whatsapp', 'Open WhatsApp with a prepared message; phone may be "" to choose the contact in WhatsApp.', { text: S, phone: S }),
  tool('set_timer', 'Timer/reminder; JARVIS speaks the message when it fires (only while the app is open).', { seconds: { type: 'integer' }, message: S }),
  tool('remember', 'Store a lasting fact about the user.', { fact: S }),
  tool('forget', 'Delete remembered facts containing this text.', { text: S }),
  tool('set_theme', 'Change HUD colour.', { theme: { type: 'string', enum: ['green', 'cyan', 'gold'] } }),
  { type: 'web_search_20260209', name: 'web_search', max_uses: 3 },
];

const memory = {
  get: () => { try { return JSON.parse(localStorage.getItem('jarvis-memory') || '[]'); } catch { return []; } },
  set: v => { try { localStorage.setItem('jarvis-memory', JSON.stringify(v.slice(-80))); } catch {} },
};

function execTool(name, a, ctx) {
  switch (name) {
    case 'open_link': ctx.open(a.url, [/youtu/.test(a.url) ? 'youtube' : 'open', a.label || a.url, '']); return 'Opened.';
    case 'open_app': { const hit = linkFor(a.name); if (!hit) return `Unknown app ${a.name}; use open_link with its website.`; ctx.open(hit[1], ['open', hit[0], '']); return 'Opened.'; }
    case 'youtube_results': ctx.open(urls.youtube(a.query), ['youtube', a.query, 'YouTube']); return 'Opened results.';
    case 'google': ctx.open(urls.google(a.query), ['search', a.query, 'Google']); return 'Opened.';
    case 'navigate': ctx.open(urls.navigate(a.destination, ctx.settings.nav), ['navigate', a.destination, '']); return 'Navigation started.';
    case 'call': ctx.open('tel:' + a.number.replace(/[^\d+]/g, ''), ['call', a.number, '']); return 'Dialer opened.';
    case 'whatsapp': ctx.open(urls.whatsapp(a.text, a.phone), ['open', 'WhatsApp', a.text]); return 'WhatsApp opened.';
    case 'set_timer': ctx.timer(Math.max(1, a.seconds), a.message); return `Timer set (${a.seconds}s).`;
    case 'remember': memory.set([...memory.get(), a.fact]); return 'Remembered.';
    case 'forget': { const all = memory.get(), keep = all.filter(m => !m.includes(a.text)); memory.set(keep); return `Forgot ${all.length - keep.length}.`; }
    case 'set_theme': ctx.setTheme(a.theme); return 'Done.';
    default: return `Unknown tool ${name}`;
  }
}

export class Agent {
  constructor(apiKey, settings) {
    this.settings = settings;
    this.client = apiKey ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) : null;
    this.messages = []; this.last = 0;
  }
  get ready() { return !!this.client; }

  context() {
    const d = new Date(), mem = memory.get();
    return `[${d.toLocaleString('he-IL')}, יום ${DAYS[d.getDay()]}. User: ${this.settings.name || ''}.${mem.length ? ' Remembered: ' + mem.join(' | ') : ''}]`;
  }

  // returns reply text, or null when the AI can't be used right now
  async run(text, ctx) {
    if (!this.client) return null;
    if (Date.now() - this.last > 15 * 60e3 || this.messages.length > 60) this.messages = [];   // fresh start, never trimmed
    this.last = Date.now();
    this.messages.push({ role: 'user', content: `${this.context()}\n${text}` });
    let resp = null;
    try {
      for (let step = 0; step < 10; step++) {
        resp = await this.client.beta.messages.create({
          model: 'claude-opus-5-5', max_tokens: 16000,
          system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
          tools: TOOLS, messages: this.messages,
          output_config: { effort: 'low' },
          betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
        });
        if (resp.stop_reason === 'refusal') { this.messages = []; return 'את זה אני לא יכול לעשות.'; }
        this.messages.push({ role: 'assistant', content: resp.content });
        if (resp.stop_reason === 'pause_turn') continue;
        const uses = resp.content.filter(b => b.type === 'tool_use');
        if (!uses.length) break;
        const results = uses.map(b => {
          let out, err = false;
          try { out = execTool(b.name, b.input, ctx); } catch (e) { out = 'Error: ' + e.message; err = true; }
          return { type: 'tool_result', tool_use_id: b.id, content: String(out), ...(err ? { is_error: true } : {}) };
        });
        this.messages.push({ role: 'user', content: results });
        if (step === 9) { this.messages = []; return 'זה לקח יותר מדי צעדים.'; }
      }
    } catch (e) {
      this.messages = [];
      if (e instanceof Anthropic.AuthenticationError) { ctx.toast('מפתח ה-AI לא תקין – בדוק בהגדרות', 'error'); this.client = null; return null; }
      if (e instanceof Anthropic.RateLimitError) { ctx.toast('יותר מדי בקשות, נסה שוב עוד רגע', 'error'); return null; }
      if (e instanceof Anthropic.APIConnectionError) { ctx.toast('אין חיבור ל-AI', 'error'); return null; }
      if (e instanceof Anthropic.APIError) { ctx.toast(`שגיאת AI ${e.status}`, 'error'); return null; }
      throw e;
    }
    return resp ? resp.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim() || null : null;
  }
}
