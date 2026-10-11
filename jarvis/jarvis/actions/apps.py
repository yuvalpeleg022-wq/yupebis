"""Find and launch installed apps (Start Menu + Store apps), close running ones."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from ..brain.text import key, ratio, wratio

IS_WIN = sys.platform == "win32"
NO_WINDOW = 0x08000000 if IS_WIN else 0

# Always available on Windows, no Start Menu entry needed
BUILTINS = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "task manager": "taskmgr.exe",
    "paint": "mspaint.exe",
    "cmd": "cmd.exe",
    "command prompt": "cmd.exe",
    "powershell": "powershell.exe",
    "terminal": "wt.exe",
    "control panel": "control.exe",
    "settings": "ms-settings:",
    "microsoft store": "ms-windows-store:",
    "camera": "microsoft.windows.camera:",
    "photos": "ms-photos:",
    "clock": "ms-clock:",
    "calendar": "outlookcal:",
    "snipping tool": "ms-screenclip:",
    "registry editor": "regedit.exe",
    "device manager": "devmgmt.msc",
}
SKIP = ("uninstall", "readme", "help", "website", "release notes", "documentation", "license", "הסר")
# app name → process name, where they differ
PROCESS_NAMES = {
    "word": "winword", "excel": "excel", "powerpoint": "powerpnt", "outlook": "outlook", "onenote": "onenote",
    "visual studio code": "code", "vs code": "code", "edge": "msedge", "microsoft edge": "msedge",
    "teams": "ms-teams", "calculator": "calculatorapp", "photos": "photos", "paint": "mspaint",
    "task manager": "taskmgr", "obs studio": "obs64", "epic games launcher": "epicgameslauncher",
    "google chrome": "chrome", "firefox": "firefox", "telegram": "telegram", "zoom": "zoom",
}
PROTECTED = {"explorer.exe", "csrss.exe", "winlogon.exe", "svchost.exe", "system", "lsass.exe",
             "services.exe", "smss.exe", "dwm.exe", "wininit.exe", "python.exe", "pythonw.exe", "jarvis.exe"}


@dataclass
class App:
    name: str
    target: str     # path to .lnk/.exe, a URI, or "shell:AppsFolder\\<AUMID>"
    kind: str       # lnk | uwp | builtin


class AppIndex:
    def __init__(self, apps: list[App] | None = None):
        self.apps: list[App] = apps or []
        self.updated = 0.0
        self._lock = threading.Lock()

    @classmethod
    def from_existing(cls, old) -> "AppIndex":
        idx = cls([App(a.name, a.target, a.kind) for a in getattr(old, "apps", [])])
        idx.updated = getattr(old, "updated", 0.0)
        return idx

    # -- indexing ---------------------------------------------------------
    def refresh(self) -> int:
        apps: dict[str, App] = {}
        for name, target in BUILTINS.items():
            apps[name] = App(name, target, "builtin")
        if IS_WIN:
            for root in (Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData")),
                         Path(os.environ.get("APPDATA", ""))):
                start = root / "Microsoft" / "Windows" / "Start Menu" / "Programs"
                if not start.exists():
                    continue
                for lnk in start.rglob("*.lnk"):
                    n = lnk.stem.strip()
                    if any(s in n.lower() for s in SKIP):
                        continue
                    apps.setdefault(n.lower(), App(n, str(lnk), "lnk"))
            for n, aumid in _start_apps():
                if any(s in n.lower() for s in SKIP):
                    continue
                apps.setdefault(n.lower(), App(n, f"shell:AppsFolder\\{aumid}", "uwp"))
        with self._lock:
            self.apps = list(apps.values())
            self.updated = time.time()
        return len(self.apps)

    def ensure_fresh(self, max_age: float = 300) -> None:
        if time.time() - self.updated > max_age:
            self.refresh()

    # -- lookup -------------------------------------------------------------
    def find(self, query: str, min_score: float = 72) -> tuple[App | None, float]:
        q = key(query)
        if not q:
            return None, 0
        best, best_score = None, 0.0
        with self._lock:
            apps = list(self.apps)
        for app in apps:
            n = key(app.name)
            if n == q:
                score = 100 + (5 if app.kind != "builtin" else 0)
            else:
                score = wratio(q, n)
                # prefer names that start with the query ("word" → "Word" over "WordPad")
                if n.startswith(q + " ") or n.endswith(" " + q):
                    score += 4
                if len(q) <= 3 and n != q:
                    score -= 15
                # avoid "google" → "google chrome" style partial hits beating whole words
                score -= abs(len(n) - len(q)) * 0.15
            if score > best_score:
                best, best_score = app, score
        return (best, best_score) if best_score >= min_score else (None, best_score)

    def names(self) -> list[str]:
        with self._lock:
            return [a.name for a in self.apps]


def _start_apps() -> list[tuple[str, str]]:
    try:
        out = subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-StartApps | ConvertTo-Json -Compress"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=20,
            creationflags=NO_WINDOW)
        data = json.loads(out.stdout or "[]")
        if isinstance(data, dict):
            data = [data]
        return [(d["Name"], d["AppID"]) for d in data if d.get("Name") and d.get("AppID")]
    except Exception:
        return []


def launch(app: App) -> None:
    t = app.target
    if not IS_WIN:
        subprocess.Popen(["xdg-open", t]) if os.path.exists(t) else subprocess.Popen([t])
        return
    if t.startswith("shell:"):
        subprocess.Popen(["explorer.exe", t], creationflags=NO_WINDOW)
    elif t.endswith(".msc"):
        subprocess.Popen(["mmc.exe", t], creationflags=NO_WINDOW)
    else:
        os.startfile(t)  # .lnk, .exe on PATH, ms-settings: style URIs


def open_path(path: str) -> None:
    path = os.path.expandvars(os.path.expanduser(path))
    if IS_WIN:
        os.startfile(path)
    else:
        subprocess.Popen(["xdg-open", path])


KNOWN_FOLDERS = {
    "downloads": "~/Downloads", "documents": "~/Documents", "pictures": "~/Pictures",
    "desktop": "~/Desktop", "music": "~/Music", "videos": "~/Videos",
    "recycle": "shell:RecycleBinFolder", "thispc": "shell:MyComputerFolder",
}


def open_folder(name: str) -> None:
    p = KNOWN_FOLDERS[name]
    if p.startswith("shell:"):
        subprocess.Popen(["explorer.exe", p], creationflags=NO_WINDOW) if IS_WIN else None
        return
    p = os.path.expanduser(p)
    if IS_WIN and not os.path.isdir(p):
        # OneDrive-redirected folders
        od = os.path.join(os.environ.get("OneDrive", ""), os.path.basename(p))
        if os.path.isdir(od):
            p = od
    open_path(p)


def close_app(query: str, app_index: AppIndex | None = None) -> list[str]:
    """Terminate processes whose name best matches query. Returns closed process names."""
    import psutil
    exe_hint = PROCESS_NAMES.get(key(query), "")
    q = key(query).replace(" ", "")
    if app_index:
        app, _ = app_index.find(query, 80)
        if app and app.target.lower().endswith(".exe") and not exe_hint:
            exe_hint = Path(app.target).stem.lower()
    scored: dict[str, float] = {}
    procs = list(psutil.process_iter(["name", "pid"]))
    for p in procs:
        n = (p.info.get("name") or "").lower()
        if not n or n in PROTECTED:
            continue
        stem = n.rsplit(".", 1)[0]
        s = 100 if stem == exe_hint else ratio(q, stem.replace(" ", ""))
        if q and (stem.startswith(q) or q.startswith(stem)) and len(stem) >= 3:
            s = max(s, 92)
        elif len(q) >= 4 and q in stem:
            s = max(s, 86)
        scored[n] = max(scored.get(n, 0), s)
    if not scored:
        return []
    target, score = max(scored.items(), key=lambda kv: kv[1])
    if score < 80:
        return []
    for p in procs:
        if (p.info.get("name") or "").lower() == target:
            try:
                p.terminate()
            except Exception:
                pass
    return [target]
