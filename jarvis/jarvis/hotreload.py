"""Watches files and tells the assistant what changed, so you can fix things while JARVIS runs."""
from __future__ import annotations

import threading
from pathlib import Path
from typing import Callable

from .config import COMMANDS_FILE, CONFIG_FILE, HUD_DIR, PKG_DIR, PLUGINS_DIR


def _snapshot(paths: list[Path], pattern: str) -> dict[str, float]:
    out = {}
    for p in paths:
        if p.is_file():
            out[str(p)] = p.stat().st_mtime
        elif p.is_dir():
            for f in p.rglob(pattern):
                if "vendor" in f.parts or "__pycache__" in f.parts:
                    continue
                try:
                    out[str(f)] = f.stat().st_mtime
                except OSError:
                    pass
    return out


WATCH = {
    "hud": ([HUD_DIR], "*.*"),
    "config": ([CONFIG_FILE], "*"),
    "commands": ([COMMANDS_FILE], "*"),
    "plugins": ([PLUGINS_DIR], "*.py"),
    "code": ([PKG_DIR / "brain", PKG_DIR / "actions"], "*.py"),
}


def watch(on_change: Callable[[str, list[str]], None], stop: threading.Event, interval: float = 0.7):
    state = {k: _snapshot(paths, pat) for k, (paths, pat) in WATCH.items()}
    while not stop.wait(interval):
        for k, (paths, pat) in WATCH.items():
            snap = _snapshot(paths, pat)
            if snap != state[k]:
                changed = [p for p in set(snap) | set(state[k]) if snap.get(p) != state[k].get(p)]
                state[k] = snap
                stop.wait(0.25)  # let editors finish writing
                try:
                    on_change(k, changed)
                except Exception:
                    pass
