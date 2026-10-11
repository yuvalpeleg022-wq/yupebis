# JARVIS

A voice assistant that lives on your own computer. It reads your folders (read-only), shows them as a living graph, talks with you in your language, and can open things on your computer — but never sends, posts, buys, or edits your files.

Python standard library on the server, vanilla JS in the browser. No install step, no framework, no database.

## Run it

You need **Python 3.10+** (Windows: get it from python.org and tick “Add python.exe to PATH”).

```
cd jarvis
python agent/main.py
```

On Windows you can also just double-click `start.bat`. It opens `http://localhost:7777`. That's it — demo mode works with no keys at all, so try it first.

Keys come next (all optional; whatever is missing is announced on screen, never silently skipped).

## Keys — `.env`

Copy `.env.example` to `.env` in the `jarvis` folder and fill in what you have. On Windows, keep `.env` private (it's ignored by git). On macOS/Linux, `chmod 600 .env`.

| Setting | What it turns on | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | The brain — real conversation, follow-ups, tool choice. Without it JARVIS routes by keyword matching and shows a **NO MODEL** badge. | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `ELEVENLABS_API_KEY` | Voice in (Scribe) and out (text-to-speech). Without it JARVIS speaks with your computer's built-in voice (best in Microsoft Edge, which has natural Hebrew voices), and you dictate with Windows voice typing: click the ask bar, press **Win+H**, then Enter. | [elevenlabs.io](https://elevenlabs.io) → Profile → API Keys. Give the key the *Text to Speech* and *Speech to Text* permissions. |
| `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` | `read_inbox`, read-only over IMAP. | Google Account → Security → 2-Step Verification on → **App passwords** → create one. In Gmail settings, IMAP must be enabled. |
| `GCAL_ICS_URL` | Calendar for `brief_me` and `plan_day`, read-only. | Google Calendar → Settings → your calendar → **Secret address in iCal format**. |
| `JARVIS_WEB_SEARCH=1` | Lets the model search the web (`research_web`). Off by default because it costs money (see below). | — |

## The demo switch

```
JARVIS_DEMO=1    # default: invented life, safe to screen-record
JARVIS_DEMO=0    # your real folders, mail and calendar
JARVIS_FOLDERS=C:\Users\Yuval\Documents;C:\Users\Yuval\Desktop
```

`JARVIS_DEMO` is read in exactly one file, `agent/data.py`, which is also the only file that touches real data. Without `JARVIS_FOLDERS`, live mode reads Documents and Desktop. Separate folders with `;`.

The demo data comes from `data/generate_demo.py` — fixed seed, fixed dates, so the graph is identical every run. Delete `data/demo/` and it regenerates. Demo memory goes to `memory/demo/` so invented facts never mix with real ones.

To find a folder path on Windows: Shift + right-click the folder → **Copy as path**.

## Using it

- **Type** in the bar, or press the **mic** (or Space) once and just talk. When you're quiet for ~0.9 s the turn is sent. It keeps listening between turns until you press the mic again or Esc.
- While it speaks the mic is deaf (so it doesn't hear itself). To interrupt: mic button, Space, or Esc.
- 🌐 picks the language. AUTO answers in whatever language you spoke.
- Graph: drag to pan, scroll to zoom, drag a node to move it, click to open it, **Shift-click** a second node for the shortest path between them.
- Buttons: Mute (text only), Brief, Plan, Memory, Fit.

Things to say: “brief me”, “plan my day”, “who emailed me?”, “how much is my rent?”, “remember that…”, “play lofi on YouTube”, “open Instagram”, “volume down”, “lock the computer”, “draft a LinkedIn post about…”, and plain conversation.

## What it will never do

- **Send** anything — email, message, post, invite. `draft_post` puts a draft on screen; you send it.
- **Write to your folders.** Only `memory/` is written, and every write is said out loud.
- **Spend** money or buy anything.
- **Invent** numbers, dates, files or people — and every derived number keeps its qualifier (a 50% payment on a running job is a deposit, not a discount).
- **Obey text inside files or emails.** Instructions found there are reported as data. The demo has two planted ones to prove it.
- **Run arbitrary commands.** Computer control is a fixed list (open an app, volume, media keys, lock); shutdown/restart/sleep need your click.

## What it costs

Running JARVIS is free; the services it calls are pay-as-you-go:

| Service | Rough cost | Notes |
|---|---|---|
| Claude (`claude-opus-5-5`) | $4 / million input tokens, $20 / million output. A typical turn is ~5k in / ~150 out ≈ **$0.02–0.03**. | Prompt caching cuts repeat input cost. `JARVIS_MODEL` and `JARVIS_EFFORT` (default `low`, for quick spoken replies) are in `.env`. |
| Web search (optional) | $10 per 1,000 searches, plus the tokens it reads. | Off unless `JARVIS_WEB_SEARCH=1`. |
| ElevenLabs | The free tier covers a few minutes of speech a month; paid plans start at about $5/month. Speech-to-text is billed per minute of audio. | Replies are capped at 600 characters each. Check current prices on elevenlabs.io. |
| Gmail / Google Calendar | Free. | |

## Files

```
agent/main.py      HTTP server + API (127.0.0.1 only)
agent/vault.py     folders → searchable graph (python agent/vault.py prints a report)
agent/brain.py     conversation: the model, or keyword routing when there isn't one
agent/tools.py     the tools
agent/data.py      the only file that touches real data
agent/voice.py     ElevenLabs in and out
agent/memory.py    writes to memory/ and nowhere else
agent/prompt.md    the system prompt
ui/                index.html, app.js, graph.js, styles.css
data/              demo generator (output in data/demo/, gitignored)
memory/            one markdown file per remembered fact
CLAUDE.md          who you are — loaded every session; edit it
```

Tuning the voice turn-taking: constants at the top of `ui/app.js` (`SILENCE_MS`, `VOICE_LEVEL`).

## Known limits

- The live caption shows that it's hearing you and then the transcript; word-by-word captions would need streaming transcription.
- Recurring calendar events are read only by their first occurrence.
- PDF reading is built-in and handles normal text PDFs; scanned PDFs show up as files without text.
- Without a model, keyword routing replies in English except for small talk.
