"""Turns a spoken/typed sentence (Hebrew or English) into an Intent.

This module hot-reloads: edit it while JARVIS runs and the next command uses the new rules.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .text import clean, key

OPEN = {"פתח", "תפתח", "תפתחי", "פתחי", "לפתוח", "open", "launch", "start", "run", "הפעל", "תפעיל",
        "תפעילי", "להפעיל", "תריץ", "הרץ", "להריץ", "כנס", "תכנס", "היכנס", "תיכנס", "go", "עבור", "תעבור"}
CLOSE = {"סגור", "תסגור", "תסגרי", "לסגור", "close", "kill", "quit", "exit", "צא", "תצא"}
SEARCH = {"חפש", "תחפש", "תחפשי", "לחפש", "search", "תגגל", "גגל", "google"}
PLAY = {"נגן", "תנגן", "תנגני", "לנגן", "שים", "תשים", "תשימי", "play", "הקרן", "תקרין"}
INSTALL = {"התקן", "תתקין", "תתקיני", "להתקין", "הורד", "תוריד", "תורידי", "להוריד", "install",
           "download", "get"}
UNINSTALL = {"הסר", "תסיר", "תסירי", "להסיר", "uninstall", "remove", "מחק", "תמחק"}

FILLERS = {"לי", "את", "בבקשה", "please", "the", "a", "an", "me", "for", "בשבילי", "עכשיו", "now",
           "רגע", "מהר", "האפליקציה", "האפליקציית", "אפליקציית", "אפליקציה", "התוכנה", "תוכנת", "תוכנה",
           "האתר", "אתר", "app", "application", "website", "site", "program", "של", "up"}
POLITE = {"תוכל", "תוכלי", "אתה", "את", "יכול", "יכולה", "אפשר", "בבקשה", "please", "can", "could",
          "you", "would", "תעשה", "תעשי", "לי", "טובה", "בוא", "בואי", "נו", "יאללה", "רק"}
YT_WORDS = {"יוטיוב", "ביוטיוב", "מיוטיוב", "ליוטיוב", "youtube", "בyoutube", "יו-טיוב", "ביו-טיוב"}
YT_NOISE = {"סרטון", "הסרטון", "וידאו", "וידיאו", "את", "של", "השיר", "שיר", "קליפ", "הקליפ", "video",
            "song", "on", "in", "the", "clip", "לי", "ב", "מ", "בערוץ", "ערוץ"}
GOOGLE_WORDS = {"בגוגל", "גוגל", "google", "in google", "on google", "באינטרנט", "ברשת", "online"}

FOLDERS = {
    "הורדות": "downloads", "ההורדות": "downloads", "downloads": "downloads",
    "מסמכים": "documents", "המסמכים": "documents", "documents": "documents",
    "תמונות": "pictures", "התמונות": "pictures", "pictures": "pictures",
    "שולחן העבודה": "desktop", "שולחן עבודה": "desktop", "desktop": "desktop",
    "מוזיקה": "music", "המוזיקה": "music", "music": "music",
    "סרטונים": "videos", "הסרטונים": "videos", "וידאו": "videos", "videos": "videos",
    "סל המחזור": "recycle", "סל מחזור": "recycle", "פח": "recycle", "recycle bin": "recycle",
    "המחשב": "thispc", "המחשב שלי": "thispc", "this pc": "thispc", "my computer": "thispc",
}

YES = {"כן", "בטח", "בטוח", "אישור", "מאשר", "מאשרת", "בצע", "תבצע", "יאללה", "סבבה", "אוקיי", "אוקי",
       "yes", "yeah", "yep", "sure", "ok", "okay", "confirm", "do it", "go ahead", "כמובן", "נכון", "קדימה"}
NO = {"לא", "בטל", "תבטל", "עזוב", "עזבי", "אל", "no", "nope", "cancel", "stop", "never mind", "לא צריך",
      "שכח מזה", "תשכח מזה"}


@dataclass
class Intent:
    name: str
    args: dict = field(default_factory=dict)
    text: str = ""


def _has(t: str, *phrases: str) -> bool:
    """Whole-word match; Hebrew words may carry a one-letter prefix (ה/ב/ל/ו/מ/ש/כ: "הווליום", "לכחול")."""
    for p in phrases:
        prefix = "[הבלומשכ]?" if re.match(r"[\u0590-\u05ff]", p) else ""
        if re.search(rf"(?<!\w){prefix}{re.escape(p)}(?!\w)", t):
            return True
    return False


def _strip_leading(words: list[str], drop: set) -> list[str]:
    while words and key(words[0]) in {key(d) for d in drop}:
        words = words[1:]
    return words


def _rest_after_verb(words: list[str], verbs: set) -> list[str] | None:
    """Words after the first verb found within the first 4 words (skipping polite words)."""
    for i, w in enumerate(words[:5]):
        if w in verbs:
            return words[i + 1:]
    return None


def _target(words: list[str]) -> str:
    words = _strip_leading(words, FILLERS)
    # trailing fillers too ("פתח את כרום בבקשה")
    while words and key(words[-1]) in {"בבקשה", "please", "עכשיו", "now", "לי"}:
        words = words[:-1]
    return " ".join(words).strip()


def answer_yes_no(text: str) -> bool | None:
    t = clean(text)
    k = key(t)
    words = k.split()
    if not words:
        return None
    if any(k == key(n) or k.startswith(key(n) + " ") for n in NO):
        return False
    if any(k == key(y) or k.startswith(key(y) + " ") for y in YES):
        return True
    return None


def parse(text: str) -> Intent:
    t = clean(text)
    words = t.split()
    if not words:
        return Intent("empty", text=text)

    # ---- assistant / meta -------------------------------------------------
    if _has(t, "קובץ ההגדרות", "קובץ הגדרות", "ההגדרות שלך", "הגדרות של גרוויס", "jarvis settings",
            "your settings", "config file", "הקונפיג"):
        return Intent("edit_config", text=text)
    if _has(t, "קובץ הפקודות", "פקודות מותאמות", "הפקודות שלך", "custom commands", "commands file"):
        return Intent("edit_commands", text=text)
    if _has(t, "תיקיית התוספים", "התוספים", "plugins", "plugin folder"):
        return Intent("open_plugins", text=text)
    if _has(t, "תיקיית הקוד", "קוד המקור", "source code", "הקוד שלך"):
        return Intent("open_source", text=text)
    if _has(t, "טען מחדש", "תטען מחדש", "רענן", "תרענן", "reload", "refresh"):
        return Intent("reload", text=text)
    if _has(t, "הפעל את עצמך מחדש", "תפעיל את עצמך מחדש", "restart yourself", "אתחל את עצמך"):
        return Intent("restart_self", text=text)
    if _has(t, "למד את הקול שלי", "תלמד את הקול שלי", "הקלט את הקול שלי", "learn my voice", "enroll"):
        return Intent("enroll", text=text)
    if _has(t, "לך לישון", "תפסיק להקשיב", "מצב שינה", "go to sleep", "stop listening"):
        return Intent("sleep", text=text)
    if _has(t, "צבע כחול", "כחול", "blue", "cyan", "ציאן"):
        if _has(t, "צבע", "color", "theme", "מצב", "mode", "תחליף", "שנה", "תשנה"):
            return Intent("theme", {"theme": "cyan"}, text)
    if _has(t, "צבע זהב", "זהב", "gold", "כתום", "orange"):
        if _has(t, "צבע", "color", "theme", "מצב", "mode", "תחליף", "שנה", "תשנה"):
            return Intent("theme", {"theme": "gold"}, text)
    if _has(t, "צבע ירוק", "ירוק", "green", "מטריקס", "matrix"):
        if _has(t, "צבע", "color", "theme", "מצב", "mode", "תחליף", "שנה", "תשנה"):
            return Intent("theme", {"theme": "green"}, text)
    if _has(t, "שנה צבע", "תשנה צבע", "תחליף צבע", "change color", "switch theme", "החלף צבע"):
        return Intent("theme", {"theme": "toggle"}, text)
    if _has(t, "הסתר", "תסתיר", "תתחבא", "מזער", "תמזער", "hide", "minimize") and len(words) <= 4:
        return Intent("hide", text=text)
    if _has(t, "תראה את עצמך", "תופיע", "show yourself", "הצג את עצמך") or t in {"show", "הופע", "הצג"}:
        return Intent("show", text=text)
    if _has(t, "מה אתה יודע לעשות", "מה אתה יכול לעשות", "עזרה", "help", "what can you do"):
        return Intent("help", text=text)
    if t in {"שקט", "תשתוק", "די", "stop", "silence", "shut up", "עצור"}:
        return Intent("stop_speaking", text=text)

    # ---- system ----------------------------------------------------------
    vol_word = _has(t, "ווליום", "וולים", "עוצמה", "עוצמת", "הקול", "קול", "סאונד", "volume", "sound", "שמע")
    if _has(t, "השתק", "תשתיק", "השתיק", "mute") and not _has(t, "בטל"):
        return Intent("mute", text=text)
    if _has(t, "בטל השתקה", "unmute", "תחזיר את הקול"):
        return Intent("mute", text=text)
    if vol_word or _has(t, "louder", "quieter"):
        if _has(t, "הגבר", "תגביר", "תעלה", "העלה", "להגביר", "up", "louder", "חזק", "יותר חזק"):
            return Intent("volume", {"dir": "up", "steps": 5 if not _has(t, "הרבה", "a lot", "מאוד") else 12}, text)
        if _has(t, "הנמך", "תנמיך", "תוריד", "הורד", "להנמיך", "down", "quieter", "חלש", "יותר חלש"):
            return Intent("volume", {"dir": "down", "steps": 5 if not _has(t, "הרבה", "a lot", "מאוד") else 12}, text)
    if _has(t, "השיר הבא", "שיר הבא", "הבא בתור", "next song", "next track", "skip"):
        return Intent("media", {"key": "next"}, text)
    if _has(t, "השיר הקודם", "שיר קודם", "previous song", "previous track"):
        return Intent("media", {"key": "prev"}, text)
    if t in {"pause", "play", "עצור את המוזיקה", "תעצור את המוזיקה", "תעצור את השיר", "עצור את השיר", "המשך",
             "תמשיך", "resume", "השהה", "תשהה"} or _has(t, "עצור את המוזיקה", "תעצור את המוזיקה",
                                                        "תעצור את השיר", "pause music", "resume music"):
        return Intent("media", {"key": "playpause"}, text)
    if _has(t, "מה השעה", "כמה השעה", "what time", "השעה עכשיו"):
        return Intent("time", text=text)
    if _has(t, "מה התאריך", "איזה יום היום", "what day", "what's the date", "what is the date", "התאריך היום"):
        return Intent("date", text=text)
    if _has(t, "נעל את המחשב", "תנעל את המחשב", "נעל מחשב", "נעל את המסך", "תנעל את המסך", "lock the computer",
            "lock computer", "lock screen", "lock the screen"):
        return Intent("lock", text=text)
    if _has(t, "צילום מסך", "צלם מסך", "תצלם מסך", "תצלם את המסך", "screenshot", "screen shot"):
        return Intent("screenshot", text=text)
    if _has(t, "הפעל מחדש את המחשב", "תפעיל מחדש את המחשב", "אתחל את המחשב", "תאתחל את המחשב",
            "restart the computer", "restart computer", "reboot"):
        return Intent("restart_pc", text=text)
    if _has(t, "כבה את המחשב", "תכבה את המחשב", "לכבות את המחשב", "shut down", "shutdown",
            "turn off the computer"):
        return Intent("shutdown", text=text)
    if _has(t, "מצב מצגת", "שולחן העבודה", "show desktop") and _has(t, "הראה", "תראה", "show", "עבור", "תעבור"):
        return Intent("show_desktop", text=text)
    if _has(t, "כמה זיכרון", "מצב המערכת", "system status", "מצב המחשב", "כמה מעבד", "cpu"):
        return Intent("status", text=text)

    # ---- install / uninstall --------------------------------------------
    rest = _rest_after_verb(words, UNINSTALL)
    if rest is not None and _target(rest):
        return Intent("uninstall", {"name": _target(rest)}, text)
    rest = _rest_after_verb(words, INSTALL)
    if rest is not None and _target(rest):
        return Intent("install", {"name": _target(rest)}, text)

    # ---- youtube -----------------------------------------------------------
    yt = any(w in YT_WORDS for w in words) or _has(t, "יו טיוב", "you tube")
    play_rest = _rest_after_verb(words, PLAY)
    if yt or play_rest is not None:
        q_words = [w for w in words if w not in YT_WORDS and w not in OPEN and w not in PLAY
                   and w not in SEARCH and w not in POLITE]
        q_words = _strip_leading(q_words, YT_NOISE)
        while q_words and q_words[-1] in YT_NOISE:
            q_words = q_words[:-1]
        q = re.sub(r"(?:יו טיוב|you tube)", "", " ".join(q_words)).strip()
        if not q:
            if yt:
                return Intent("open", {"target": "youtube"}, text)
        else:
            if _rest_after_verb(words, SEARCH) is not None:
                return Intent("youtube_search", {"query": q}, text)
            return Intent("youtube", {"query": q}, text)

    # ---- search -------------------------------------------------------------
    rest = _rest_after_verb(words, SEARCH)
    if rest is not None:
        q = " ".join(w for w in rest if w not in GOOGLE_WORDS)
        q = _target(q.split()) if q else ""
        if q:
            return Intent("search", {"query": q}, text)
    for prefix in ("מה זה ", "מי זה ", "מי היה ", "מי הייתה ", "what is ", "who is ", "how to ", "איך "):
        if t.startswith(prefix) and len(words) >= 3:
            return Intent("search", {"query": t}, text)

    # ---- close / open -----------------------------------------------------
    rest = _rest_after_verb(words, CLOSE)
    if rest is not None and _target(rest):
        return Intent("close", {"name": _target(rest)}, text)
    rest = _rest_after_verb(words, OPEN)
    if rest is not None and _target(rest):
        tgt = _target(rest)
        folder = FOLDERS.get(tgt) or FOLDERS.get(re.sub(r"^ה", "", tgt))
        if folder and not tgt.startswith("תיקי"):
            return Intent("folder", {"folder": folder}, text)
        m = re.match(r"^(?:תיקיית|תיקייה|התיקייה|folder)\s+(.+)$", tgt)
        if m and (FOLDERS.get(m.group(1)) or FOLDERS.get("ה" + m.group(1))):
            return Intent("folder", {"folder": FOLDERS.get(m.group(1)) or FOLDERS["ה" + m.group(1)]}, text)
        return Intent("open", {"target": tgt}, text)

    # ---- small talk --------------------------------------------------------
    if _has(t, "תודה", "thanks", "thank you", "תודה רבה"):
        return Intent("thanks", text=text)
    if _has(t, "מה שלומך", "מה נשמע", "מה קורה", "how are you", "מה המצב"):
        return Intent("how_are_you", text=text)
    if _has(t, "שלום", "היי", "hello", "hi", "בוקר טוב", "ערב טוב", "good morning", "good evening") and len(words) <= 3:
        return Intent("greet", text=text)
    if _has(t, "מי אתה", "who are you", "מה אתה"):
        return Intent("who", text=text)

    # bare app/site name ("כרום", "youtube") counts as open
    if len(words) <= 3:
        return Intent("maybe_open", {"target": _target(words)}, text)
    return Intent("unknown", text=text)
