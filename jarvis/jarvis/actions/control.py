"""Deeper PC control: windows, keyboard, typing, files, clipboard, processes."""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

from ..brain.text import key, wratio

IS_WIN = sys.platform == "win32"
NO_WINDOW = 0x08000000 if IS_WIN else 0


# ------------------------------------------------------------------ keyboard
def press_keys(combo: str) -> None:
    """e.g. "ctrl+c", "alt+tab", "win+d", "enter"."""
    import keyboard
    keyboard.send(combo)


def type_text(text: str) -> None:
    """Types into the focused window (Unicode, so Hebrew works)."""
    import keyboard
    time.sleep(0.15)
    keyboard.write(text, delay=0.005)


# ------------------------------------------------------------------ windows
def _windows() -> list[tuple[int, str]]:
    if not IS_WIN:
        return []
    import ctypes
    from ctypes import wintypes
    user32 = ctypes.windll.user32
    out: list[tuple[int, str]] = []
    proto = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)

    def cb(hwnd, _):
        if user32.IsWindowVisible(hwnd):
            n = user32.GetWindowTextLengthW(hwnd)
            if n:
                buf = ctypes.create_unicode_buffer(n + 1)
                user32.GetWindowTextW(hwnd, buf, n + 1)
                if buf.value.strip() and buf.value not in ("Program Manager", "J.A.R.V.I.S"):
                    out.append((hwnd, buf.value))
        return True
    user32.EnumWindows(proto(cb), 0)
    return out


def list_windows() -> list[str]:
    return [t for _, t in _windows()]


def focus_window(query: str) -> str | None:
    """Bring the best-matching window to the front. Returns its title."""
    if not IS_WIN:
        return None
    import ctypes
    user32 = ctypes.windll.user32
    q = key(query)
    best, score = None, 0.0
    for hwnd, title in _windows():
        t = key(title)
        s = 100 if q and q in t else wratio(q, t)
        if s > score:
            best, score = (hwnd, title), s
    if not best or score < 70:
        return None
    hwnd, title = best
    user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    # Windows only lets the foreground app hand focus over; a dummy Alt press satisfies that rule
    user32.keybd_event(0x12, 0, 0, 0)
    user32.SetForegroundWindow(hwnd)
    user32.keybd_event(0x12, 0, 2, 0)
    return title


WINDOW_KEYS = {
    "minimize": "win+down", "maximize": "win+up", "close": "alt+f4", "switch": "alt+tab",
    "show_desktop": "win+d", "snap_left": "win+left", "snap_right": "win+right",
    "task_view": "win+tab", "new_desktop": "win+ctrl+d",
}


def window_action(action: str) -> None:
    press_keys(WINDOW_KEYS[action])


# ------------------------------------------------------------------ files
SEARCH_ROOTS = ["~/Desktop", "~/Documents", "~/Downloads", "~/Pictures", "~/Videos", "~/Music"]


def _roots() -> list[Path]:
    roots = []
    od = os.environ.get("OneDrive")
    for r in SEARCH_ROOTS:
        p = Path(os.path.expanduser(r))
        if p.is_dir():
            roots.append(p)
        if od and (Path(od) / p.name).is_dir():
            roots.append(Path(od) / p.name)
    return roots


def find_files(query: str, limit: int = 8, budget_s: float = 2.5) -> list[str]:
    """Fuzzy search by file name in the user's main folders (time-boxed)."""
    q = key(query)
    t0 = time.time()
    scored: list[tuple[float, str]] = []
    for root in _roots():
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d not in ("node_modules", "AppData")]
            for name in filenames + dirnames:
                k = key(Path(name).stem)
                s = 100 if q and q in k else wratio(q, k)
                if s >= 75:
                    scored.append((s, os.path.join(dirpath, name)))
            if time.time() - t0 > budget_s:
                break
    scored.sort(key=lambda x: (-x[0], len(x[1])))
    seen, out = set(), []
    for _, p in scored:
        if p not in seen:
            seen.add(p)
            out.append(p)
        if len(out) >= limit:
            break
    return out


# ------------------------------------------------------------------ clipboard / shell / processes
def get_clipboard() -> str:
    if not IS_WIN:
        return ""
    r = subprocess.run(["powershell", "-NoProfile", "-Command", "Get-Clipboard -Raw"], capture_output=True,
                       timeout=10, creationflags=NO_WINDOW)
    return r.stdout.decode("utf-8", "replace").strip()


def set_clipboard(text: str) -> None:
    if IS_WIN:
        subprocess.run(["powershell", "-NoProfile", "-Command", "$input | Set-Clipboard"], input=text.encode("utf-8"),
                       timeout=10, creationflags=NO_WINDOW)


def run_powershell(command: str, timeout: int = 30) -> str:
    r = subprocess.run(["powershell", "-NoProfile", "-Command",
                        "[Console]::OutputEncoding=[Text.Encoding]::UTF8; " + command],
                       capture_output=True, timeout=timeout, creationflags=NO_WINDOW)
    out = (r.stdout + r.stderr).decode("utf-8", "replace").strip()
    return out[-3000:] if out else f"(exit code {r.returncode}, no output)"


def top_processes(n: int = 8) -> list[str]:
    import psutil
    procs = []
    for p in psutil.process_iter(["name", "memory_info"]):
        try:
            procs.append((p.info["memory_info"].rss, p.info["name"]))
        except Exception:
            pass
    procs.sort(reverse=True)
    return [f"{name} ({rss / 2**20:.0f} MB)" for rss, name in procs[:n]]
