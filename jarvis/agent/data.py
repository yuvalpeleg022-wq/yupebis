"""THE ONLY FILE THAT TOUCHES REAL DATA.

JARVIS_DEMO is read here and nowhere else. Default is demo: real life is opt-in.

    JARVIS_DEMO=1  (default) invented fixtures from data/generate_demo.py
    JARVIS_DEMO=0  the folders listed in JARVIS_FOLDERS (read-only, always)
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # jarvis/
DEMO_DIR = ROOT / "data" / "demo"
MEMORY_DIR = ROOT / "memory"


def load_env(path=ROOT / ".env"):
    """Tiny .env reader (KEY=value, # comments). Real env vars win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        if value:                                         # blank lines in .env mean "not set"
            os.environ.setdefault(key.strip(), value)


load_env()

DEMO = os.environ.get("JARVIS_DEMO", "1").strip() != "0"


def mode():
    return "demo" if DEMO else "live"


def _default_folders():
    home = Path.home()
    return [home / "Documents", home / "Desktop"]


def _ensure_demo():
    if not (DEMO_DIR / "vault").exists():
        script = ROOT / "data" / "generate_demo.py"
        subprocess.run([sys.executable, str(script)], check=True)


def source_folders():
    """Folders the vault indexes. Read-only — nothing in agent/ ever writes here."""
    if DEMO:
        _ensure_demo()
        return [DEMO_DIR / "vault"]
    raw = os.environ.get("JARVIS_FOLDERS", "").strip()
    # Separated by ';' — safe on Windows, where ':' is part of C:\...
    folders = [Path(os.path.expandvars(os.path.expanduser(p.strip())))
               for p in raw.split(";") if p.strip()]
    return folders or _default_folders()


def memory_dir():
    """memory/ in live mode; memory/demo/ in demo, so invented facts never mix with real ones."""
    return MEMORY_DIR / "demo" if DEMO else MEMORY_DIR


def today():
    from datetime import date
    if DEMO:
        _ensure_demo()
        return date.fromisoformat((DEMO_DIR / "fixtures" / "today.txt").read_text().strip())
    return date.today()


# ------------------------------------------------------------------ inbox (read-only)

def inbox(limit=15):
    """[{from, subject, date, unread, body}] newest first. Raises RuntimeError with a human reason."""
    if DEMO:
        _ensure_demo()
        return json.loads((DEMO_DIR / "fixtures" / "inbox.json").read_text(encoding="utf-8"))
    user, pw = os.environ.get("GMAIL_ADDRESS"), os.environ.get("GMAIL_APP_PASSWORD")
    if not (user and pw):
        raise RuntimeError("Gmail isn't connected — add GMAIL_ADDRESS and GMAIL_APP_PASSWORD to .env")
    import email
    import imaplib
    from email.header import decode_header, make_header
    from email.utils import parsedate_to_datetime

    def hdr(v):
        return str(make_header(decode_header(v or "")))

    out = []
    with imaplib.IMAP4_SSL("imap.gmail.com") as box:
        box.login(user, pw)
        box.select("INBOX", readonly=True)            # EXAMINE: nothing is marked read
        _, ids = box.search(None, "ALL")
        ids = ids[0].split()[-limit:]
        _, unseen = box.search(None, "UNSEEN")
        unseen = set(unseen[0].split())
        for mid in reversed(ids):
            _, parts = box.fetch(mid, "(BODY.PEEK[HEADER] BODY.PEEK[TEXT]<0.4000>)")
            raw_head = parts[0][1]
            raw_body = parts[1][1] if len(parts) > 1 and isinstance(parts[1], tuple) else b""
            msg = email.message_from_bytes(raw_head + b"\r\n" + raw_body)
            body = ""
            for part in (msg.walk() if msg.is_multipart() else [msg]):
                if part.get_content_type() == "text/plain":
                    body = (part.get_payload(decode=True) or b"").decode(part.get_content_charset() or "utf-8", "replace")
                    break
            if not body:
                body = raw_body.decode("utf-8", "replace")
            try:
                when = parsedate_to_datetime(msg["Date"]).strftime("%Y-%m-%dT%H:%M")
            except (TypeError, ValueError):
                when = ""
            out.append({"from": hdr(msg["From"]), "subject": hdr(msg["Subject"]), "date": when,
                        "unread": mid in unseen, "body": body.strip()[:1500]})
    return out


# ------------------------------------------------------------------ calendar (read-only)

def calendar():
    """[{title, start, end}] (ISO local times). Live mode reads the Google Calendar secret iCal URL."""
    if DEMO:
        _ensure_demo()
        return json.loads((DEMO_DIR / "fixtures" / "calendar.json").read_text(encoding="utf-8"))
    url = os.environ.get("GCAL_ICS_URL")
    if not url:
        raise RuntimeError("Google Calendar isn't connected — add GCAL_ICS_URL to .env")
    import urllib.request
    with urllib.request.urlopen(url, timeout=15) as r:
        ics = r.read().decode("utf-8", "replace")
    return _parse_ics(ics)


def _parse_ics(ics):
    from datetime import datetime, timezone
    ics = re.sub(r"\r?\n[ \t]", "", ics)               # unfold continuation lines
    events = []
    for block in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", ics, re.S):
        ev = {}
        for line in block.strip().splitlines():
            key, _, value = line.partition(":")
            name = key.split(";")[0]
            if name in ("SUMMARY", "DTSTART", "DTEND"):
                ev[name] = value.strip()

        def iso(v):
            if not v:
                return ""
            if len(v) == 8:                              # all-day
                return f"{v[:4]}-{v[4:6]}-{v[6:]}T00:00"
            dt = datetime.strptime(v.rstrip("Z")[:15], "%Y%m%dT%H%M%S")
            if v.endswith("Z"):
                dt = dt.replace(tzinfo=timezone.utc).astimezone().replace(tzinfo=None)
            return dt.strftime("%Y-%m-%dT%H:%M")
        events.append({"title": ev.get("SUMMARY", "(no title)").replace("\\,", ","),
                       "start": iso(ev.get("DTSTART")), "end": iso(ev.get("DTEND"))})
    return sorted(events, key=lambda e: e["start"])
