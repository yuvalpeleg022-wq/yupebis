"""Desktop app entry: frameless fullscreen HUD window, tray icon, global hotkey."""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import threading
import time
import webbrowser

from . import config as C
from .core import Assistant
from .server import Hub, Server


def parse_args(argv=None):
    p = argparse.ArgumentParser(prog="jarvis", description="J.A.R.V.I.S desktop assistant")
    p.add_argument("--browser", action="store_true", help="open the HUD in the default browser instead of a window")
    p.add_argument("--no-voice", action="store_true", help="run without microphone (typed commands only)")
    p.add_argument("--port", type=int, default=0)
    p.add_argument("--headless", action="store_true", help="only run the server (for development/tests)")
    return p.parse_args(argv)


def apply_startup(enabled: bool):
    """Create/remove a launcher in the Windows Startup folder."""
    if not C.IS_WINDOWS:
        return
    folder = os.path.join(os.environ.get("APPDATA", ""), r"Microsoft\Windows\Start Menu\Programs\Startup")
    path = os.path.join(folder, "JARVIS.cmd")
    if enabled:
        if C.FROZEN:
            target = f'start "" "{sys.executable}"'
        else:
            pyw = sys.executable.replace("python.exe", "pythonw.exe")
            root = os.path.dirname(C.PKG_DIR)
            target = f'cd /d "{root}"\r\nstart "" "{pyw}" -m jarvis'
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"@echo off\r\n{target}\r\n")
    elif os.path.exists(path):
        os.remove(path)


def relaunch():
    args = [sys.executable] + ([] if C.FROZEN else ["-m", "jarvis"]) + sys.argv[1:]
    subprocess.Popen(args, cwd=os.path.dirname(C.PKG_DIR))


def main(argv=None):
    args = parse_args(argv)
    C.ensure_user_files()
    try:
        cfg = C.load_config()
    except Exception as e:
        print(f"config.yaml error ({e}); using defaults", file=sys.stderr)
        cfg = C._read_yaml(C.DEFAULT_CONFIG)

    port_dbg = (cfg.get("dev") or {}).get("remote_debugging_port") or 0
    if port_dbg:
        os.environ.setdefault("QTWEBENGINE_REMOTE_DEBUGGING", str(port_dbg))
    os.environ.setdefault("QTWEBENGINE_CHROMIUM_FLAGS",
                          "--ignore-gpu-blocklist --enable-gpu-rasterization --autoplay-policy=no-user-gesture-required")

    hub = Hub()
    assistant = Assistant(hub, cfg, voice=not args.no_voice)
    server = Server(hub, assistant, args.port)
    server.start()
    apply_startup(bool((cfg.get("startup") or {}).get("run_on_login")))
    print(f"JARVIS HUD: {server.url}", flush=True)
    assistant.start()

    if args.headless:
        _wait_forever(assistant)
        return
    if args.browser:
        webbrowser.open(server.url)
        _wait_forever(assistant)
        return
    try:
        run_qt(assistant, server)
    except ImportError as e:
        print(f"PySide6 not available ({e}); opening in browser", file=sys.stderr)
        webbrowser.open(server.url)
        _wait_forever(assistant)


def _wait_forever(assistant):
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        assistant.stop()


def run_qt(assistant: Assistant, server: Server):
    from PySide6.QtCore import QObject, Qt, QUrl, Signal
    from PySide6.QtGui import QAction, QColor, QIcon, QPainter, QPen, QPixmap, QRadialGradient
    from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineSettings
    from PySide6.QtWebEngineWidgets import QWebEngineView
    from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon

    if C.IS_WINDOWS:
        try:  # own taskbar icon instead of python's
            import ctypes
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("jarvis.hud.1")
        except Exception:
            pass

    app = QApplication(sys.argv)
    app.setApplicationName("J.A.R.V.I.S")
    app.setQuitOnLastWindowClosed(False)

    icon_path = C.PKG_DIR.parent / "assets" / "icon.png"
    if icon_path.exists():
        icon = QIcon(str(icon_path))
    else:  # draw a small arc-reactor icon
        pm = QPixmap(64, 64)
        pm.fill(Qt.GlobalColor.transparent)
        p = QPainter(pm)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        g = QRadialGradient(32, 32, 30)
        g.setColorAt(0, QColor(255, 220, 140))
        g.setColorAt(0.5, QColor(255, 150, 30, 200))
        g.setColorAt(1, QColor(0, 0, 0, 0))
        p.setBrush(g)
        p.setPen(Qt.PenStyle.NoPen)
        p.drawEllipse(2, 2, 60, 60)
        p.setPen(QPen(QColor(255, 190, 80), 3))
        p.setBrush(Qt.BrushStyle.NoBrush)
        p.drawEllipse(14, 14, 36, 36)
        p.end()
        icon = QIcon(pm)
    app.setWindowIcon(icon)

    class Page(QWebEnginePage):
        def acceptNavigationRequest(self, url, nav_type, is_main):
            # links clicked inside the HUD open in the real browser
            if url.host() not in ("127.0.0.1", "localhost") and url.scheme() in ("http", "https"):
                webbrowser.open(url.toString())
                return False
            return super().acceptNavigationRequest(url, nav_type, is_main)

    view = QWebEngineView()
    page = Page(view)
    view.setPage(page)
    page.setBackgroundColor(QColor(2, 5, 9))
    s = page.settings()
    for attr in ("PlaybackRequiresUserGesture",):
        s.setAttribute(getattr(QWebEngineSettings.WebAttribute, attr), False)
    for attr in ("WebGLEnabled", "Accelerated2dCanvasEnabled", "LocalStorageEnabled"):
        s.setAttribute(getattr(QWebEngineSettings.WebAttribute, attr), True)
    view.setWindowTitle("J.A.R.V.I.S")
    view.setWindowIcon(icon)
    view.resize(1600, 900)
    view.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
    view.load(QUrl(server.url))

    def apply_window():
        w = assistant.cfg.get("window") or {}
        flags = Qt.WindowType.Window | Qt.WindowType.FramelessWindowHint
        if w.get("always_on_top"):
            flags |= Qt.WindowType.WindowStaysOnTopHint
        visible = view.isVisible()
        view.setWindowFlags(flags)
        if visible:
            show()

    def show():
        if (assistant.cfg.get("window") or {}).get("mode", "fullscreen") == "fullscreen":
            view.showFullScreen()
        else:
            view.showMaximized()
        view.raise_()
        view.activateWindow()

    def hide():
        view.hide()

    def toggle():
        hide() if view.isVisible() and view.isActiveWindow() else show()

    def quit_app():
        assistant.stop()
        tray.hide()
        app.quit()

    class Bridge(QObject):
        sig = Signal(str)

    bridge = Bridge()

    def on_ui(cmd: str):
        if cmd == "show":
            show()
        elif cmd == "hide":
            hide()
        elif cmd == "toggle":
            toggle()
        elif cmd == "apply_window":
            apply_window()
        elif cmd == "quit":
            quit_app()
        elif cmd == "restart":
            relaunch()
            quit_app()
        elif cmd == "devtools":
            dev = QWebEngineView()
            page.setDevToolsPage(dev.page())
            dev.resize(1100, 700)
            dev.show()
            view._devtools = dev
    bridge.sig.connect(on_ui, Qt.ConnectionType.QueuedConnection)
    assistant.ui_callback = bridge.sig.emit  # safe from any thread

    tray = QSystemTrayIcon(icon)
    tray.setToolTip("J.A.R.V.I.S")
    menu = QMenu()

    def add(label, fn):
        a = QAction(label, menu)
        a.triggered.connect(fn)
        menu.addAction(a)
    add("הצג / הסתר  (Ctrl+Alt+J)", toggle)
    menu.addSeparator()
    add("ערוך הגדרות", lambda: os.startfile(C.CONFIG_FILE) if C.IS_WINDOWS else None)
    add("ערוך פקודות", lambda: os.startfile(C.COMMANDS_FILE) if C.IS_WINDOWS else None)
    add("תיקיית תוספים", lambda: os.startfile(C.PLUGINS_DIR) if C.IS_WINDOWS else None)
    add("תיקיית הקוד", lambda: os.startfile(C.PKG_DIR) if C.IS_WINDOWS else None)
    add("טען הכל מחדש", lambda: assistant.handle_api("/api/reload", {}))
    add("כלי פיתוח (DevTools)", lambda: on_ui("devtools"))
    menu.addSeparator()
    add("למד את הקול שלי מחדש", lambda: assistant.handle_api("/api/enroll", {}))
    add("הפעל מחדש", lambda: on_ui("restart"))
    add("יציאה", quit_app)
    tray.setContextMenu(menu)
    tray.activated.connect(lambda r: toggle() if r in (QSystemTrayIcon.ActivationReason.Trigger,
                                                QSystemTrayIcon.ActivationReason.DoubleClick) else None)
    tray.show()

    hotkey = (assistant.cfg.get("window") or {}).get("hotkey")
    if hotkey:
        try:
            import keyboard
            keyboard.add_hotkey(hotkey, lambda: bridge.sig.emit("toggle"))
        except Exception as e:
            assistant.log(f"global hotkey unavailable: {e}", "warn")

    apply_window()
    if not (assistant.cfg.get("window") or {}).get("start_hidden"):
        show()
    sys.exit(app.exec())
