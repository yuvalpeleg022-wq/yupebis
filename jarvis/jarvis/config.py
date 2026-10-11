"""Paths and config loading. User files live in %APPDATA%\\JARVIS (or ~/.jarvis)."""
from __future__ import annotations

import copy
import os
import shutil
import sys
from pathlib import Path

import yaml

PKG_DIR = Path(__file__).resolve().parent
HUD_DIR = PKG_DIR / "hud"
DEFAULT_CONFIG = PKG_DIR / "default_config.yaml"
DEFAULT_COMMANDS = PKG_DIR / "default_commands.yaml"
IS_WINDOWS = sys.platform == "win32"
FROZEN = getattr(sys, "frozen", False)


def data_dir() -> Path:
    if os.environ.get("JARVIS_HOME"):
        d = Path(os.environ["JARVIS_HOME"])
    elif IS_WINDOWS:
        d = Path(os.environ.get("APPDATA", Path.home())) / "JARVIS"
    else:
        d = Path.home() / ".jarvis"
    d.mkdir(parents=True, exist_ok=True)
    return d


DATA = data_dir()
CONFIG_FILE = DATA / "config.yaml"
COMMANDS_FILE = DATA / "commands.yaml"
PLUGINS_DIR = DATA / "plugins"
VOICEPRINT_FILE = DATA / "voiceprint.npz"
MODELS_DIR = DATA / "models"
TTS_DIR = DATA / "tts_cache"
LOG_FILE = DATA / "jarvis.log"

EXAMPLE_PLUGIN = '''"""תוסף לדוגמה. כל קובץ .py בתיקייה הזאת נטען אוטומטית, גם בזמן שג'רוויס פועל.

@command("משפט", "עוד משפט") – הפונקציה רצה כשאומרים אחד מהמשפטים.
ctx נותן גישה לפעולות: ctx.open("chrome"), ctx.open_url(url), ctx.say("טקסט"),
ctx.youtube("שיר"), ctx.search("שאלה"), ctx.run("פקודה"), ctx.config
מה שהפונקציה מחזירה – ג'רוויס אומר בקול.
"""
from jarvis.plugin import command


@command("מה מזג האוויר", "weather")
def weather(ctx, text):
    ctx.search("מזג האוויר היום")
    return "הנה תחזית מזג האוויר."


@command("זרוק מטבע", "flip a coin")
def coin(ctx, text):
    import random
    return random.choice(["עץ", "פלי"])
'''


def ensure_user_files() -> None:
    if not CONFIG_FILE.exists():
        shutil.copyfile(DEFAULT_CONFIG, CONFIG_FILE)
    if not COMMANDS_FILE.exists():
        shutil.copyfile(DEFAULT_COMMANDS, COMMANDS_FILE)
    if not PLUGINS_DIR.exists():
        PLUGINS_DIR.mkdir(parents=True)
        (PLUGINS_DIR / "example.py").write_text(EXAMPLE_PLUGIN, encoding="utf-8")
    for d in (MODELS_DIR, TTS_DIR):
        d.mkdir(parents=True, exist_ok=True)


CONFIG_VERSION = 5


def migrate_user_config() -> list[str]:
    """Bring an older config.yaml up to date in place (keeps the user's comments and edits)."""
    if not CONFIG_FILE.exists():
        return []
    import re
    text = CONFIG_FILE.read_text(encoding="utf-8")
    m = re.search(r"^config_version:\s*(\d+)", text, re.M)
    version = int(m.group(1)) if m else 1
    done = []
    if version < 2:
        # v2: fast online speech recognition with offline fallback, snappier end-of-speech
        text, n = re.subn(r"^(\s*stt_engine:\s*)whisper\b.*$",
                          r"\1auto           # auto (מהיר) | google | whisper (בלי אינטרנט)", text, flags=re.M)
        if n:
            done.append("stt_engine → auto")
        text, n = re.subn(r"^(\s*silence_ms:\s*)700\b", r"\g<1>550", text, flags=re.M)
        if n:
            done.append("silence_ms → 550")
        text = "config_version: 2            # לא לשנות – משמש לעדכונים אוטומטיים\n" + text
    if version < 3 and not re.search(r"^ai:", text, re.M):
        # v3: AI brain settings
        block = DEFAULT_CONFIG.read_text(encoding="utf-8")
        start = block.index("# ── המוח")
        end = block.index("\nwindow:", start)
        text = text.rstrip("\n") + "\n\n" + block[start:end].rstrip("\n") + "\n"
        done.append("added AI brain settings (ai:)")
    if version < 4:
        # v4: green is the new default look
        text, n = re.subn(r"^theme:\s*gold\b.*$", "theme: green                 # green (ירוק) | cyan (כחול) | gold (זהב)",
                          text, flags=re.M)
        if n:
            done.append("theme → green")
    if version < 5:
        # v5: the plasma-orb look from the reference video is orange
        text, n = re.subn(r"^theme:\s*green\b.*$", "theme: gold                  # gold (כתום-זהב, כמו בסרטון) | green (ירוק) | cyan (כחול)",
                          text, flags=re.M)
        if n:
            done.append("theme → gold (plasma orb)")
    text = re.sub(r"^config_version:\s*\d+", f"config_version: {CONFIG_VERSION}", text, count=1, flags=re.M)
    if done or version < CONFIG_VERSION:
        CONFIG_FILE.write_text(text, encoding="utf-8")
    return done


def _merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def _read_yaml(path: Path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_config() -> dict:
    """Defaults merged with the user's file. Raises on a broken user file so the
    caller can keep the previous config and report the error."""
    defaults = _read_yaml(DEFAULT_CONFIG) or {}
    user = _read_yaml(CONFIG_FILE) if CONFIG_FILE.exists() else {}
    if user is not None and not isinstance(user, dict):
        raise ValueError("config.yaml must be a mapping")
    return _merge(defaults, user or {})


def load_commands() -> list:
    data = _read_yaml(COMMANDS_FILE) if COMMANDS_FILE.exists() else []
    if data is None:
        return []
    if not isinstance(data, list):
        raise ValueError("commands.yaml must be a list")
    return data
