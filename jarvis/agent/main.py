"""JARVIS server — python agent/main.py, then open http://localhost:7777

Binds to 127.0.0.1 only. Serves ui/ and a small JSON API.
"""
import json
import mimetypes
import os
import sys
import threading
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import data                      # noqa: E402  (loads .env first)
import tools                     # noqa: E402
import voice                     # noqa: E402
from brain import Brain, WEB_SEARCH   # noqa: E402
from vault import Vault, report  # noqa: E402

UI = data.ROOT / "ui"
PORT = int(os.environ.get("JARVIS_PORT", "7777"))
MAX_UPLOAD = 25 * 1024 * 1024

VAULT = Vault(data.source_folders()).build()
BRAIN = Brain(VAULT)
LOCK = threading.Lock()          # one conversation at a time


def status():
    warnings = []
    if VAULT.missing_folders:
        warnings.append("Folder not found: " + ", ".join(VAULT.missing_folders))
    if not VAULT.notes:
        warnings.append("No files indexed — check JARVIS_FOLDERS in .env.")
    return {"mode": data.mode(), "model": Brain.model_status(), "voice": voice.status(),
            "web_search": WEB_SEARCH, "files": len(VAULT.notes), "warnings": warnings}


class Handler(BaseHTTPRequestHandler):
    server_version = "JARVIS"

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            sys.stderr.write("  " + (fmt % args) + "\n")

    # ------------------------------------------------------------ helpers
    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_UPLOAD:
            raise ValueError("upload too large")
        return self.rfile.read(n)

    # ------------------------------------------------------------ GET
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = dict(urllib.parse.parse_qsl(url.query))
        if url.path == "/api/status":
            return self._json(status())
        if url.path == "/api/graph":
            return self._json(VAULT.graph())
        if url.path == "/api/note":
            n = VAULT.notes.get(q.get("id", ""))
            if not n:
                return self._json({"error": "not found"}, 404)
            links = sorted(VAULT.adj.get(n["id"], ()), key=lambda i: -VAULT.degree(i))
            return self._json({"id": n["id"], "title": n["title"], "type": n["type"], "path": n["path"],
                               "text": n["text"][:20000],
                               "links": [{"id": i, "title": VAULT.notes[i]["title"], "type": VAULT.notes[i]["type"]}
                                         for i in links]})
        if url.path == "/api/path":
            return self._json({"path": VAULT.shortest_path(q.get("a", ""), q.get("b", ""))})
        if url.path == "/api/memory":
            return self._json(tools.list_memory())
        return self._static(url.path)

    def _static(self, path):
        rel = "index.html" if path in ("", "/") else urllib.parse.unquote(path).lstrip("/")
        f = (UI / rel).resolve()
        if UI.resolve() not in f.parents or not f.is_file():
            return self._json({"error": "not found"}, 404)
        body = f.read_bytes()
        ctype = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        if f.suffix == ".js":
            ctype = "text/javascript"
        self.send_response(200)
        self.send_header("Content-Type", ctype + ("; charset=utf-8" if ctype.startswith("text") else ""))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    # ------------------------------------------------------------ POST
    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        q = dict(urllib.parse.parse_qsl(url.query))
        try:
            if url.path == "/api/ask":
                req = json.loads(self._body() or b"{}")
                text = (req.get("text") or "").strip()
                if not text:
                    return self._json({"error": "empty question"}, 400)
                with LOCK:
                    return self._json(BRAIN.ask(text, req.get("lang", "auto")))
            if url.path == "/api/confirm":
                req = json.loads(self._body() or b"{}")
                return self._json(tools.confirm(req.get("id", ""), bool(req.get("approve"))))
            if url.path == "/api/speak":
                req = json.loads(self._body() or b"{}")
                audio = voice.speak(req.get("text", ""))
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(audio)))
                self.end_headers()
                self.wfile.write(audio)
                return
            if url.path == "/api/listen":
                audio = self._body()
                if len(audio) < 1000:
                    return self._json({"text": "", "language": ""})
                ctype = self.headers.get("Content-Type", "audio/webm").split(";")[0]
                return self._json(voice.listen(audio, ctype, q.get("lang", "auto")))
        except voice.VoiceError as e:
            return self._json({"error": str(e)}, 503)
        except Exception as e:                          # degrade loudly
            return self._json({"error": f"{type(e).__name__}: {e}"}, 500)
        return self._json({"error": "not found"}, 404)


class Server(ThreadingHTTPServer):
    # On Windows SO_REUSEADDR lets a second copy silently share the port; refuse instead.
    allow_reuse_address = os.name != "nt"
    daemon_threads = True


def main():
    report(VAULT, data.mode())
    s = status()
    print(f"\nmodel: {s['model']['label'] if s['model']['ok'] else 'NONE — ' + s['model']['reason']}")
    print(f"voice: {'ElevenLabs' if s['voice']['tts'] else 'OFF — ' + s['voice']['reason']}")
    print(f"settings: {data.ROOT / '.env'} ({'found' if (data.ROOT / '.env').exists() else 'MISSING — run setup.bat'})")
    try:
        srv = Server(("127.0.0.1", PORT), Handler)
    except OSError:
        print(f"\n!! Port {PORT} is busy — JARVIS (maybe an older copy) is already running in another window.")
        print("   Close every other JARVIS window, then run start.bat again.")
        return
    url = f"http://localhost:{PORT}"
    print(f"\nJARVIS is up → {url}   (Ctrl+C to stop)\n")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    sys.stdout.reconfigure(errors="replace")      # Hebrew filenames on a Windows console
    main()
