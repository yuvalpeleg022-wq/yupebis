"""JARVIS tools. Each returns {"say": one or two spoken sentences, "card": on-screen detail, "data": for the model}.

`say` and the card never carry the same text: the line is the headline, the card is the detail.
Nothing here sends, posts, buys or writes outside memory/.
"""
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
import uuid
import webbrowser
from datetime import date, datetime, timedelta

import data
import memory

INJECTION = re.compile(
    r"(ignore|disregard|forget)\b.{0,40}\b(instructions|rules|prompt)|you are now|system prompt|"
    r"forward (all|the|every)|AI assistant reading this|(email|send).{0,30}every contact",
    re.I | re.S)


def flagged(text):
    return bool(INJECTION.search(text or ""))


def _fname(path):
    return os.path.basename(path) if path else "unresolved link"


# ===================================================================== search_brain

def search_brain(vault, query, limit=5):
    hits = [h for h in vault.search(query, limit) if h["type"] != "ghost"]
    if not hits or hits[0]["score"] < 1.5:
        return {"say": "That isn't in your files.",
                "card": {"title": f"Searched your files: “{query}”", "rows": [], "body": "No matching file."},
                "data": {"query": query, "results": []}}
    rows, payload, warned = [], [], False
    for h in hits:
        note = vault.notes[h["id"]]
        bad = flagged(note["text"])
        warned |= bad
        badges = [{"text": "contains instructions — treated as data", "kind": "bad"}] if bad else []
        rows.append({"title": h["title"], "sub": h["snippet"], "k": h["type"], "id": h["id"], "badges": badges})
        payload.append({"file": _fname(h["path"]), "path": h["path"], "type": h["type"], "score": h["score"],
                        "text": note["text"][:1800], "contains_instructions": bad})
    top = hits[0]
    say = f"Best match is {top['title']}, from {_fname(top['path'])}."
    if warned:
        say += " One of those files contains instructions aimed at me — I'm reporting it, not following it."
    return {"say": say,
            "card": {"title": f"From your files: “{query}”", "rows": rows,
                     "sources": [h["path"] for h in hits if h["path"]], "focus": [h["id"] for h in hits]},
            "data": {"query": query, "results": payload}}


# ===================================================================== read_inbox

def _known(vault, sender):
    name = re.sub(r"\s*<.*?>", "", sender).strip().strip('"')
    nid = vault.by_name.get(name.lower())
    if nid and vault.notes[nid]["type"] != "ghost":
        return nid
    hits = vault.search(name, 1)
    if hits and hits[0]["title"].lower() == name.lower():
        return hits[0]["id"]
    return None


def read_inbox(vault, only_unread=False):
    try:
        mails = data.inbox()
    except Exception as e:                                       # loud, never silent
        return {"say": "I can't read your inbox right now.", "card": {"title": "Inbox", "body": str(e)},
                "data": {"error": str(e)}}
    if only_unread:
        mails = [m for m in mails if m["unread"]]
    rows, payload = [], []
    for m in mails[:12]:
        nid = _known(vault, m["from"])
        bad = flagged(m["subject"] + " " + m["body"])
        name = re.sub(r"\s*<.*?>", "", m["from"]).strip()
        badges = [{"text": "in your files", "kind": "ok"} if nid else {"text": "new sender", "kind": "warn"}]
        if bad:
            badges.append({"text": "contains instructions — ignored", "kind": "bad"})
        rows.append({"k": m["date"][5:10].replace("-", "/"), "title": f"{name} — {m['subject']}",
                     "sub": m["body"][:160], "id": nid, "badges": badges})
        payload.append({**m, "body": m["body"][:800], "known_file": vault.notes[nid]["path"] if nid else None,
                        "contains_instructions": bad})
    unread = [p for p in payload if p["unread"]]
    known = [p for p in unread if p["known_file"]]
    say = f"{len(unread)} unread"
    if unread:
        first = unread[0]
        say += f"; latest is {re.sub(r'<.*?>', '', first['from']).strip()} about {first['subject'].lower()}"
    say += f". {len(known)} of them are people already in your files."
    if any(p["contains_instructions"] for p in payload):
        say += " One email is trying to give me orders — flagged, not followed."
    return {"say": say, "card": {"title": "Inbox — read-only", "rows": rows},
            "data": {"messages": payload}}


# ===================================================================== brief_me

def _events(days=2):
    today = data.today()
    try:
        events = data.calendar()
    except Exception as e:
        return [], str(e)
    end = today + timedelta(days=days)
    return [e for e in events if today.isoformat() <= e["start"][:10] < end.isoformat()], None


def _slipped(vault, today):
    out = []
    since = (today - timedelta(days=21)).isoformat()
    for n in vault.notes.values():
        if n["type"] == "daily" and since <= n["title"] <= today.isoformat():
            for line in n["text"].splitlines():
                if re.search(r"slipp|delay|postpon|missed|late|נדח|איחור|retras", line, re.I):
                    out.append({"title": re.sub(r"\[\[|\]\]", "", line).strip(), "k": n["title"][5:], "id": n["id"]})
        if n["type"] == "project" and n["meta"].get("status") == "paused":
            out.append({"title": f"{n['title']} is paused", "k": "proj", "id": n["id"]})
    return out[:5]


def brief_me(vault):
    today = data.today()
    events, cal_err = _events(2)
    try:
        unread = [m for m in data.inbox() if m["unread"]]
        mail_err = None
    except Exception as e:
        unread, mail_err = [], str(e)
    slipped = _slipped(vault, today)
    rows = [{"k": e["start"][11:16] if e["start"][:10] == today.isoformat() else e["start"][5:10].replace("-", "/"),
             "title": e["title"], "sub": "calendar"} for e in events]
    rows += [{"k": "mail", "title": re.sub(r"\s*<.*?>", "", m["from"]).strip() + " — " + m["subject"],
              "sub": "unread"} for m in unread[:4]]
    rows += [{**s, "sub": "slipped"} for s in slipped]
    todays = [e for e in events if e["start"][:10] == today.isoformat()]
    later = [e for e in events if e["start"][:10] > today.isoformat()]
    say = (f"Today: {todays[0]['title']} at {todays[0]['start'][11:16]}" if todays
           else f"Nothing on the calendar today; next is {later[0]['title']} tomorrow at {later[0]['start'][11:16]}" if later
           else "Nothing on the calendar today")
    say += f". {len(unread)} unread"
    say += f", and {len(slipped)} thing{'s' if len(slipped) != 1 else ''} slipped." if slipped else ", nothing slipped."
    notes = [x for x in (cal_err, mail_err) if x]
    return {"say": say,
            "card": {"title": f"Brief — {today.strftime('%a %d %b')}", "rows": rows,
                     "body": "\n".join(notes) if notes else None},
            "data": {"today": today.isoformat(), "events": events, "unread": unread[:8], "slipped": slipped,
                     "errors": notes}}


# ===================================================================== plan_day

MONEY = re.compile(r"[₪$£€]\s?[\d,]+|due|remaining|deposit|invoice|pay|receipt|not bought|יתרה|לשלם|חשבונית", re.I)


def plan_day(vault):
    """Max five items, ordered by what moves money first, then fixed times, then replies, then projects."""
    today = data.today()
    items = []
    for n in vault.notes.values():
        if n["type"] == "money":
            for line in n["text"].splitlines():
                if re.search(r"remaining|due|not bought|still need|deposit", line, re.I):
                    items.append((0, {"k": "₪", "title": line.strip()[:240], "sub": n["title"], "id": n["id"]}))
    try:
        for m in data.inbox():
            if m["unread"] or MONEY.search(m["body"]):
                w = 1 if MONEY.search(m["subject"] + m["body"]) else 3
                items.append((w, {"k": "reply", "title": re.sub(r"\s*<.*?>", "", m["from"]).strip() + " — " + m["subject"],
                                  "sub": m["body"][:100]}))
    except Exception:
        pass
    for e in _events(1)[0]:
        items.append((2, {"k": e["start"][11:16], "title": e["title"], "sub": "fixed time"}))
    for n in vault.notes.values():
        if n["type"] == "project" and n["meta"].get("status") == "active":
            step = re.search(r"Next step:\s*(.+)", n["text"])
            if step:
                items.append((4, {"k": "proj", "title": f"{n['title']}: {step.group(1).rstrip('.')}", "id": n["id"]}))
    items.sort(key=lambda x: x[0])
    plan = [it for _, it in items][:5]
    for i, it in enumerate(plan, 1):
        it["k"] = f"{i}. {it['k']}"
    # Speak the whole first item: a money line keeps its qualifier (deposit, balance due) attached.
    first = plan[0]["title"].rstrip(".") if plan else ""
    say = f"{len(plan)} things. First: {first}." if plan else "Nothing pressing today."
    return {"say": say, "card": {"title": f"Plan — {today.strftime('%a %d %b')}", "rows": plan},
            "data": {"plan": plan}}


# ===================================================================== remember

def remember(fact):
    path = memory.write(fact)
    return {"say": f"Saved to memory: “{fact.strip()}”.",
            "card": {"title": "Written to memory", "rows": [{"k": "file", "title": path}], "body": fact.strip()},
            "data": {"file": path, "fact": fact}}


def list_memory():
    items = memory.entries()
    return {"say": f"{len(items)} things in memory." if items else "Memory is empty.",
            "card": {"title": "Memory", "rows": [{"title": i["fact"], "sub": i["file"]} for i in items]}}


# ===================================================================== open_web

SITES = {
    "youtube": "https://www.youtube.com", "יוטיוב": "https://www.youtube.com",
    "instagram": "https://www.instagram.com", "אינסטגרם": "https://www.instagram.com",
    "facebook": "https://www.facebook.com", "פייסבוק": "https://www.facebook.com",
    "tiktok": "https://www.tiktok.com", "טיקטוק": "https://www.tiktok.com",
    "x": "https://x.com", "twitter": "https://x.com", "טוויטר": "https://x.com",
    "whatsapp": "https://web.whatsapp.com", "וואטסאפ": "https://web.whatsapp.com",
    "linkedin": "https://www.linkedin.com", "לינקדאין": "https://www.linkedin.com",
    "reddit": "https://www.reddit.com", "netflix": "https://www.netflix.com", "נטפליקס": "https://www.netflix.com",
    "gmail": "https://mail.google.com", "calendar": "https://calendar.google.com", "יומן": "https://calendar.google.com",
    "spotify": "https://open.spotify.com", "ספוטיפיי": "https://open.spotify.com",
    "google": "https://www.google.com", "גוגל": "https://www.google.com", "maps": "https://maps.google.com",
    "drive": "https://drive.google.com", "chatgpt": "https://chatgpt.com", "claude": "https://claude.ai",
}


def _first_youtube_video(query):
    url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(query)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en"})
        html = urllib.request.urlopen(req, timeout=8).read().decode("utf-8", "replace")
        m = re.search(r'"videoId":"([\w-]{11})"', html)
        if m:
            return f"https://www.youtube.com/watch?v={m.group(1)}&autoplay=1"
    except Exception:
        pass
    return None


def _open(url):
    try:
        return webbrowser.open(url, new=2)
    except Exception:
        return False


def open_web(site=None, query=None, play=False):
    site_key = (site or "").strip().lower()
    if site_key in ("youtube", "יוטיוב") and query:
        url = _first_youtube_video(query) if play else None
        label = "Playing on YouTube" if url else "YouTube search"
        url = url or "https://www.youtube.com/results?search_query=" + urllib.parse.quote(query)
    elif query and not site_key:
        url, label = "https://www.google.com/search?q=" + urllib.parse.quote(query), "Google search"
    else:
        url = SITES.get(site_key) or (site if site and site.startswith("http") else None)
        if not url and site:
            url = "https://www.google.com/search?q=" + urllib.parse.quote(site)
        label = site or "web"
    if not url:
        return {"say": "Open what? Name a site or what to search for.", "card": None, "data": {}}
    opened = _open(url)
    what = f"{label}: {query}" if query else label
    say = f"Opened {what}." if opened else f"I couldn't open a browser here — the link is on screen."
    return {"say": say,
            "card": {"title": "Opened in your browser" if opened else "Couldn't open a browser",
                     "rows": [{"title": what, "sub": url}],
                     "actions": [{"type": "url", "url": url, "label": "Open link"}]},
            "data": {"url": url, "opened": opened}}


# ===================================================================== draft_post

POST_URLS = {
    "x": "https://x.com/compose/post", "twitter": "https://x.com/compose/post",
    "linkedin": "https://www.linkedin.com/feed/", "facebook": "https://www.facebook.com",
    "instagram": "https://www.instagram.com", "whatsapp": "https://web.whatsapp.com",
    "email": "https://mail.google.com/mail/?view=cm", "gmail": "https://mail.google.com/mail/?view=cm",
}


def draft_post(platform, text):
    p = (platform or "post").lower()
    actions = [{"type": "copy", "text": text, "label": "Copy text"}]
    if p in POST_URLS:
        actions.append({"type": "url", "url": POST_URLS[p], "label": f"Open {platform}"})
    return {"say": f"Draft for {platform} is on screen. I haven't sent it — that's your click.",
            "card": {"title": f"Draft — {platform} (not sent)", "body": text, "actions": actions},
            "data": {"platform": platform, "draft": text, "sent": False}}


# ===================================================================== control_pc

IS_WIN = os.name == "nt"
IS_MAC = sys.platform == "darwin"

APPS = {  # spoken name -> Windows target (os.startfile) / macOS app name
    "notepad": ("notepad.exe", "TextEdit"), "פנקס": ("notepad.exe", "TextEdit"),
    "calculator": ("calc.exe", "Calculator"), "מחשבון": ("calc.exe", "Calculator"),
    "explorer": ("explorer.exe", "Finder"), "files": ("explorer.exe", "Finder"), "קבצים": ("explorer.exe", "Finder"),
    "chrome": ("chrome", "Google Chrome"), "כרום": ("chrome", "Google Chrome"),
    "edge": ("msedge", "Microsoft Edge"), "settings": ("ms-settings:", "System Settings"), "הגדרות": ("ms-settings:", "System Settings"),
    "spotify": ("spotify:", "Spotify"), "ספוטיפיי": ("spotify:", "Spotify"),
    "whatsapp": ("whatsapp:", "WhatsApp"), "וואטסאפ": ("whatsapp:", "WhatsApp"),
    "vscode": ("code", "Visual Studio Code"), "vs code": ("code", "Visual Studio Code"),
    "word": ("winword", "Microsoft Word"), "excel": ("excel", "Microsoft Excel"),
    "paint": ("mspaint", "Preview"), "task manager": ("taskmgr", "Activity Monitor"),
    "camera": ("microsoft.windows.camera:", "Photo Booth"), "obs": ("obs64", "OBS"),
}
# Windows virtual-key codes sent through WScript.Shell
KEYS = {"volume_up": 175, "volume_down": 174, "mute": 173, "play_pause": 179, "next_track": 176, "prev_track": 177}
NEEDS_CONFIRM = {"shutdown", "restart", "sleep"}
ACTIONS = sorted(["open_app", "open_folder", "lock", *KEYS, *NEEDS_CONFIRM])
PENDING = {}


def _run(args):
    subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def _execute(action, target):
    """Returns (done: bool, detail). Only whitelisted actions exist here — no free-form commands."""
    if not (IS_WIN or IS_MAC):
        return False, "simulated — this machine isn't Windows or macOS"
    if action == "open_app":
        app = APPS.get((target or "").lower())
        if not app:
            return False, f"'{target}' isn't on the app list"
        if IS_WIN:
            try:
                os.startfile(app[0])
            except OSError:
                _run(["cmd", "/c", "start", "", app[0]])
        else:
            _run(["open", "-a", app[1]])
        return True, target
    if action == "open_folder":
        folder = {f.name.lower(): f for f in data.source_folders()}.get((target or "").lower())
        if not folder:
            return False, f"'{target}' isn't one of your indexed folders"
        os.startfile(str(folder)) if IS_WIN else _run(["open", str(folder)])
        return True, str(folder)
    if action in KEYS:
        if IS_WIN:
            n = 5 if action.startswith("volume") else 1
            _run(["powershell", "-NoProfile", "-Command",
                  f"$w=New-Object -ComObject WScript.Shell; 1..{n} | % {{ $w.SendKeys([char]{KEYS[action]}) }}"])
        else:
            script = {"volume_up": "set volume output volume ((output volume of (get volume settings)) + 10)",
                      "volume_down": "set volume output volume ((output volume of (get volume settings)) - 10)",
                      "mute": "set volume output muted not (output muted of (get volume settings))"}.get(action)
            if not script:
                return False, "media keys are Windows-only for now"
            _run(["osascript", "-e", script])
        return True, action
    if action == "lock":
        _run(["rundll32.exe", "user32.dll,LockWorkStation"] if IS_WIN else ["pmset", "displaysleepnow"])
        return True, "locked"
    if action in NEEDS_CONFIRM and IS_WIN:
        cmd = {"shutdown": ["shutdown", "/s", "/t", "30"], "restart": ["shutdown", "/r", "/t", "30"],
               "sleep": ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"]}[action]
        _run(cmd)
        return True, f"{action} in 30s — run `shutdown /a` to cancel" if action != "sleep" else "sleeping"
    return False, f"unknown action {action}"


def control_pc(action, target=None):
    if action not in ACTIONS:
        return {"say": "That's not something I'm allowed to do on this computer.",
                "card": {"title": "Not on the allowed list", "body": "Allowed: " + ", ".join(ACTIONS)},
                "data": {"error": "not allowed", "allowed": ACTIONS}}
    if action in NEEDS_CONFIRM:
        pid = uuid.uuid4().hex[:10]
        PENDING[pid] = (action, target)
        return {"say": f"Confirm {action}? It's on screen — I won't do it without your click.",
                "card": {"title": f"Confirm: {action}", "body": "This can't be undone from here.",
                         "actions": [{"type": "confirm", "id": pid, "label": f"Yes, {action}", "style": "danger"},
                                     {"type": "cancel", "id": pid, "label": "Cancel"}]},
                "data": {"pending_confirmation": action}}
    done, detail = _execute(action, target)
    label = action.replace("_", " ") + (f" {target}" if target else "")
    say = f"Done — {label}." if done else f"Couldn't {label}: {detail}."
    return {"say": say, "card": {"title": "Computer", "rows": [{"title": label, "sub": detail,
            "badges": [{"text": "done" if done else "not done", "kind": "ok" if done else "warn"}]}]},
            "data": {"done": done, "detail": detail}}


def confirm(pid, approve):
    item = PENDING.pop(pid, None)
    if not item:
        return {"say": "That request expired.", "card": None}
    if not approve:
        return {"say": "Cancelled.", "card": None}
    done, detail = _execute(*item)
    return {"say": f"{item[0].capitalize()} — {detail}." if done else f"Couldn't: {detail}.",
            "card": {"title": "Computer", "rows": [{"title": item[0], "sub": detail}]}}


# ===================================================================== research_web (no-model fallback)

def research_web_offline(query):
    url = "https://www.google.com/search?q=" + urllib.parse.quote(query)
    return {"say": "Web research needs the model. I can open a Google search instead.",
            "card": {"title": f"Research: “{query}”", "body": "No model connected, so I can't read and summarise the web.",
                     "actions": [{"type": "url", "url": url, "label": "Open Google search"}]},
            "data": {}}
