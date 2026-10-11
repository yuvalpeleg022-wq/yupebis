"""Text normalization and fuzzy helpers shared by the parser and actions."""
from __future__ import annotations

import re
from difflib import SequenceMatcher

try:
    from rapidfuzz import fuzz as _fuzz
except ImportError:  # rapidfuzz is optional
    _fuzz = None

_GERESH = str.maketrans({"׳": "'", "’": "'", "`": "'", "´": "'", "״": '"', "‘": "'"})
_PUNCT = re.compile(r"[\"!?,;:()\[\]{}«»…–—]+")
_HEB_FINALS = str.maketrans({"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"})


def clean(text: str) -> str:
    """Lowercase, unify apostrophes, drop punctuation, collapse spaces."""
    t = (text or "").translate(_GERESH).lower()
    t = _PUNCT.sub(" ", t)
    t = re.sub(r"(?<![\w])\.|\.(?![\w])", " ", t)  # keep dots inside words (ynet.co.il)
    return re.sub(r"\s+", " ", t).strip()


def key(text: str) -> str:
    """Matching key: like clean() but without apostrophes/hyphens and with Hebrew finals unified."""
    return re.sub(r"[\s'\-]+", " ", clean(text)).translate(_HEB_FINALS).strip()


def ratio(a: str, b: str) -> float:
    if _fuzz:
        return _fuzz.ratio(a, b)
    return SequenceMatcher(None, a, b).ratio() * 100


def wratio(a: str, b: str) -> float:
    if _fuzz:
        return _fuzz.WRatio(a, b)
    return SequenceMatcher(None, a, b).ratio() * 100


def strip_wake(text: str, wake_words: list[str]) -> tuple[str, bool]:
    """Remove wake-word tokens (fuzzy) from text. Returns (rest, found)."""
    wakes = [key(w) for w in wake_words]
    words = clean(text).split()
    out, found = [], False
    for w in words:
        k = key(w)
        # "היי ג'רוויס" / "ג'רוויס," – also tolerate a ה/ו prefix
        cands = {k, k[1:] if len(k) > 3 and k[0] in "הו" else k}
        if any(ratio(c, wk) >= 80 for c in cands for wk in wakes if len(c) >= 3):
            found = True
            continue
        out.append(w)
    # drop greeting fillers left in front of the wake word
    while out and key(out[0]) in {"היי", "הי", "הלו", "hey", "hi", "ok", "okay", "יו", "אהלן"} and found:
        out.pop(0)
    return " ".join(out), found
