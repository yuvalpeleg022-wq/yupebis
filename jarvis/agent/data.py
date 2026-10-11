"""THE ONLY FILE THAT TOUCHES REAL DATA.

JARVIS_DEMO is read here and nowhere else. Default is demo: real life is opt-in.

    JARVIS_DEMO=1  (default) invented fixtures from data/generate_demo.py
    JARVIS_DEMO=0  the folders listed in JARVIS_FOLDERS (read-only, always)
"""
import os
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
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


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
