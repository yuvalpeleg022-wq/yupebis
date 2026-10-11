"""What JARVIS does for each intent. Hot-reloads on save — edit freely while it runs.

Every handler gets (intent, ctx) where ctx is the running Assistant, and returns the
sentence JARVIS should say (or None).
"""
from __future__ import annotations

import os
import re
import time

from ..actions import apps, installer, system, web
from ..config import COMMANDS_FILE, CONFIG_FILE, PKG_DIR, PLUGINS_DIR
from .intents import FOLDERS, Intent
from .text import clean, key, ratio

FOLDER_NAMES = {"downloads": "ההורדות", "documents": "המסמכים", "pictures": "התמונות", "desktop": "שולחן העבודה",
                "music": "המוזיקה", "videos": "הסרטונים", "recycle": "סל המחזור", "thispc": "המחשב"}

HELP = ("אני יכול לפתוח אפליקציות ואתרים, לנגן סרטונים ביוטיוב, לחפש בגוגל, להתקין ולהסיר תוכנות, "
        "לשלוט בווליום ובמוזיקה, לצלם מסך, לנעול את המחשב ועוד. פשוט תגיד לי מה לעשות.")


# ---------------------------------------------------------------- open anything
def resolve_alias(name: str, cfg: dict) -> str:
    aliases = {key(k): v for k, v in (cfg.get("app_aliases") or {}).items()}
    k = key(name)
    for cand in (k, k[1:] if k[:1] in "הבל" and len(k) > 3 else None):
        if cand and cand in aliases:
            return aliases[cand]
    return name


def find_site(name: str, cfg: dict) -> str | None:
    sites = {key(k): v for k, v in (cfg.get("sites") or {}).items()}
    k = key(name)
    for cand in (k, k[1:] if k[:1] in "הבל" and len(k) > 3 else None, k.replace(" ", "")):
        if cand and cand in sites:
            return sites[cand]
    return None


def open_target(name: str, ctx, strict: bool = False) -> str:
    """Open an app, site, folder or anything on the web, in that order of preference."""
    cfg = ctx.cfg
    name = name.strip()
    if not name:
        return "מה לפתוח?"
    folder = FOLDERS.get(clean(name))
    if folder:
        apps.open_folder(folder)
        return f"פותח את {FOLDER_NAMES[folder]}."
    if os.path.exists(os.path.expandvars(os.path.expanduser(name))):
        apps.open_path(name)
        return "פותח."
    if web.looks_like_domain(name):
        web.open_url(name)
        return f"פותח את {name}."
    site = find_site(name, cfg)
    english = resolve_alias(name, cfg)
    if site and key(english) == key(name):  # a site name that isn't also an app alias
        web.open_url(site)
        return f"פותח את {name}."
    ctx.app_index.ensure_fresh()
    app, score = ctx.app_index.find(english, 80 if english != name else 84)
    if app:
        apps.launch(app)
        ctx.log(f"launch {app.name} ({app.kind}, {score:.0f})")
        return f"פותח את {app.name}."
    if site:
        web.open_url(site)
        return f"פותח את {name}."
    fallback = {key(k): v for k, v in (cfg.get("web_fallback") or {}).items()}.get(key(english))
    if fallback:
        web.open_url(fallback)
        return f"{english} לא מותקן, אז פתחתי את גרסת האתר."
    if strict:
        return f"לא מצאתי את {name}."
    if (cfg.get("web") or {}).get("unknown_open") == "google":
        web.google(name)
    else:
        web.first_result(name)
    return f"מצאתי את {name} ברשת."


# ---------------------------------------------------------------- install
def do_install(name: str, ctx) -> str:
    if not installer.available():
        return "winget לא זמין במחשב. אפשר להתקין אותו מ'App Installer' בחנות של מיקרוסופט."
    english = resolve_alias(name, ctx.cfg)
    ctx.status("thinking")
    ctx.log(f"winget: searching '{english}'")
    pkg = installer.resolve(english, ctx.cfg.get("winget_ids") or {})
    if not pkg:
        return f"לא מצאתי תוכנה בשם {name}."

    def run():
        ctx.progress(f"INSTALLING {pkg.name}", 0)
        pct = [0]

        def on_line(line):
            m = re.search(r"(\d{1,3})\s*%", line)
            if m:
                pct[0] = int(m.group(1))
            ctx.progress(f"INSTALLING {pkg.name}", pct[0], line)
        ok = installer.install(pkg, bool((ctx.cfg.get("install") or {}).get("silent", True)), on_line)
        ctx.progress(None)
        ctx.app_index.ensure_fresh(0)  # pick up the new app in the background
        ctx.say(f"{pkg.name} הותקן בהצלחה." if ok else f"ההתקנה של {pkg.name} נכשלה. בדוק את היומן.")

    if (ctx.cfg.get("install") or {}).get("confirm", True):
        ctx.confirm(f"מצאתי את {pkg.name}. להתקין?", lambda: (ctx.background(run), "מתחיל בהתקנה.")[1],
                    detail=f"{pkg.id}  ·  {pkg.source or 'winget'}")
        return None
    ctx.background(run)
    return f"מתקין את {pkg.name}."


def do_uninstall(name: str, ctx) -> str | None:
    if not installer.available():
        return "winget לא זמין במחשב."
    english = resolve_alias(name, ctx.cfg)

    def run():
        ctx.progress(f"REMOVING {english}", None)
        ok = installer.uninstall(english, lambda line: ctx.progress(f"REMOVING {english}", None, line))
        ctx.progress(None)
        ctx.app_index.ensure_fresh(0)  # pick up the new app in the background
        ctx.say(f"{name} הוסר." if ok else f"לא הצלחתי להסיר את {name}.")
    ctx.confirm(f"להסיר את {name} מהמחשב?", lambda: (ctx.background(run), "מסיר.")[1])
    return None


# ---------------------------------------------------------------- handlers
def handle(intent: Intent, ctx) -> str | None:
    n, a = intent.name, intent.args
    if n == "open":
        return open_target(a["target"], ctx)
    if n == "maybe_open":
        reply = open_target(a["target"], ctx, strict=True)
        return reply if not reply.startswith("לא מצאתי") else "לא הבנתי. תגיד למשל: פתח כרום."
    if n == "folder":
        apps.open_folder(a["folder"])
        return f"פותח את {FOLDER_NAMES[a['folder']]}."
    if n == "close":
        english = resolve_alias(a["name"], ctx.cfg)
        closed = apps.close_app(english, ctx.app_index)
        return f"סגרתי את {a['name']}." if closed else f"{a['name']} לא פתוח."
    if n == "search":
        web.google(a["query"])
        return f"מחפש {a['query']}."
    if n == "youtube":
        ctx.status("thinking")
        title = web.play_youtube(a["query"])
        return f"מנגן: {title}" if title else f"הנה התוצאות ל{a['query']} ביוטיוב."
    if n == "youtube_search":
        web.youtube_search_page(a["query"])
        return f"הנה התוצאות ביוטיוב."
    if n == "install":
        return do_install(a["name"], ctx)
    if n == "uninstall":
        return do_uninstall(a["name"], ctx)
    if n == "volume":
        system.volume(a["dir"], a.get("steps", 5))
        return None
    if n == "mute":
        system.press("mute")
        return None
    if n == "media":
        system.press(a["key"])
        return None
    if n == "time":
        return system.time_text()
    if n == "date":
        return system.date_text()
    if n == "lock":
        ctx.background(lambda: (time.sleep(1.2), system.lock()))
        return "נועל."
    if n == "show_desktop":
        system.show_desktop()
        return None
    if n == "screenshot":
        ctx.ui("hide")
        time.sleep(0.5)
        path = system.screenshot()
        ctx.ui("show")
        ctx.log(f"screenshot → {path}")
        return "צילמתי את המסך ושמרתי בתמונות."
    if n == "shutdown":
        ctx.confirm("לכבות את המחשב?", lambda: (system.shutdown(False), "המחשב יכבה בעוד עשר שניות.")[1])
        return None
    if n == "restart_pc":
        ctx.confirm("להפעיל מחדש את המחשב?", lambda: (system.shutdown(True), "מפעיל מחדש בעוד עשר שניות.")[1])
        return None
    if n == "status":
        s = ctx.last_stats or {}
        return f"המעבד על {s.get('cpu', 0):.0f} אחוז, הזיכרון על {s.get('ram', 0):.0f} אחוז."
    if n == "theme":
        ctx.set_theme(a["theme"])
        return "כחול." if ctx.theme == "cyan" else "זהב."
    if n == "hide":
        ctx.ui("hide")
        return None
    if n == "show":
        ctx.ui("show")
        return "אני כאן."
    if n == "reload":
        ctx.reload_all()
        return "טענתי הכל מחדש."
    if n == "restart_self":
        ctx.ui("restart")
        return "מפעיל את עצמי מחדש."
    if n == "edit_config":
        apps.open_path(str(CONFIG_FILE))
        return "פתחתי את קובץ ההגדרות. כל שמירה תיטען מיד."
    if n == "edit_commands":
        apps.open_path(str(COMMANDS_FILE))
        return "פתחתי את קובץ הפקודות. כל שמירה תיטען מיד."
    if n == "open_plugins":
        apps.open_path(str(PLUGINS_DIR))
        return "פתחתי את תיקיית התוספים."
    if n == "open_source":
        apps.open_path(str(PKG_DIR))
        return "פתחתי את הקוד שלי. שינויים נטענים בזמן אמת."
    if n == "enroll":
        ctx.start_enroll()
        return None
    if n == "sleep":
        ctx.go_sleep()
        return "אני כאן אם תצטרך. תגיד ג'רוויס."
    if n == "stop_speaking":
        ctx.stop_speaking()
        return None
    if n == "help":
        return HELP
    if n == "greet":
        hour = time.localtime().tm_hour
        part = "בוקר טוב" if 5 <= hour < 12 else "צהריים טובים" if hour < 17 else "ערב טוב" if hour < 22 else "לילה טוב"
        return f"{part}, {ctx.cfg.get('user_name', '')}. במה אוכל לעזור?"
    if n == "how_are_you":
        return "כל המערכות פועלות בצורה מושלמת. תודה ששאלת."
    if n == "thanks":
        return "תמיד לשירותך."
    if n == "who":
        return "אני ג'רוויס. העוזר האישי שלך."
    if n == "empty":
        return None
    return "לא בטוח שהבנתי. תנסה לנסח אחרת."


# ---------------------------------------------------------------- custom commands (commands.yaml)
def match_custom(text: str, commands: list) -> dict | None:
    t = key(text)
    best, best_score = None, 0
    for cmd in commands or []:
        for phrase in cmd.get("say") or []:
            p = key(str(phrase))
            if not p:
                continue
            score = 100 if p == t else 95 if re.search(rf"(?<!\w){re.escape(p)}(?!\w)", t) else ratio(p, t)
            if score > best_score:
                best, best_score = cmd, score
    return best if best_score >= 88 else None


def run_custom(cmd: dict, ctx) -> str | None:
    said = None
    for step in cmd.get("do") or []:
        if not isinstance(step, dict):
            continue
        for action, value in step.items():
            v = str(value)
            if action == "open":
                open_target(v, ctx)
            elif action == "open_url":
                web.open_url(v)
            elif action == "open_path":
                apps.open_path(v)
            elif action == "youtube":
                web.play_youtube(v)
            elif action == "search":
                web.google(v)
            elif action == "run":
                system.run_shell(v)
            elif action == "speak":
                if said is None:
                    said = v
                else:
                    ctx.say(v)
            elif action == "wait":
                time.sleep(float(value))
            else:
                ctx.log(f"commands.yaml: unknown action '{action}'", "warn")
    return said


class PluginCtx:
    """The small, stable API plugins get."""

    def __init__(self, core):
        self._core = core
        self.config = core.cfg

    def open(self, name): return open_target(name, self._core)
    def open_url(self, url): web.open_url(url)
    def open_path(self, path): apps.open_path(path)
    def youtube(self, query): return web.play_youtube(query)
    def search(self, query): web.google(query)
    def run(self, command): system.run_shell(command)
    def say(self, text): self._core.say(text)
    def log(self, text): self._core.log(text)
    def confirm(self, question, on_yes): self._core.confirm(question, on_yes)
