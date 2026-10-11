"""Windows system controls: volume & media keys, lock, screenshot, power."""
from __future__ import annotations

import datetime as dt
import os
import subprocess
import sys
import time
from pathlib import Path

IS_WIN = sys.platform == "win32"
VK = {"vol_up": 0xAF, "vol_down": 0xAE, "mute": 0xAD, "next": 0xB0, "prev": 0xB1, "playpause": 0xB3}


def press(name: str, times: int = 1) -> None:
    if not IS_WIN:
        return
    import ctypes
    user32 = ctypes.windll.user32
    code = VK[name]
    for _ in range(times):
        user32.keybd_event(code, 0, 0, 0)
        user32.keybd_event(code, 0, 2, 0)
        time.sleep(0.01)


def volume(direction: str, steps: int = 5) -> None:
    press("vol_up" if direction == "up" else "vol_down", steps)


def lock() -> None:
    if IS_WIN:
        import ctypes
        ctypes.windll.user32.LockWorkStation()


def show_desktop() -> None:
    if IS_WIN:
        subprocess.Popen(["powershell", "-NoProfile", "-Command",
                          "(New-Object -ComObject Shell.Application).ToggleDesktop()"],
                         creationflags=0x08000000)


def screenshot() -> Path:
    from PIL import ImageGrab
    folder = Path(os.path.expanduser("~/Pictures")) / "JARVIS"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"screenshot_{dt.datetime.now():%Y-%m-%d_%H-%M-%S}.png"
    ImageGrab.grab(all_screens=True).save(path)
    return path


def shutdown(restart: bool = False) -> None:
    if IS_WIN:
        subprocess.Popen(["shutdown", "/r" if restart else "/s", "/t", "10"], creationflags=0x08000000)


def run_shell(command: str) -> None:
    subprocess.Popen(command, shell=True, creationflags=0x08000000 if IS_WIN else 0)


HEB_DAYS = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"]
HEB_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר",
              "אוקטובר", "נובמבר", "דצמבר"]


def time_text() -> str:
    now = dt.datetime.now()
    return f"השעה {now:%H:%M}"


def date_text() -> str:
    now = dt.datetime.now()
    return f"היום יום {HEB_DAYS[now.weekday()]}, {now.day} ב{HEB_MONTHS[now.month - 1]} {now.year}"
