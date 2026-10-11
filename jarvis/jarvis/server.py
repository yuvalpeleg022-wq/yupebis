"""Local HTTP server: serves the HUD, streams events (SSE), receives clicks/commands.

Bound to 127.0.0.1 on a random port, every API call needs the per-run token, and the
Host header is checked, so web pages in your browser can't drive JARVIS.
"""
from __future__ import annotations

import json
import mimetypes
import queue
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .config import HUD_DIR, TTS_DIR

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")


class Hub:
    """Fan-out of events to every connected HUD, plus a snapshot for late joiners."""

    def __init__(self):
        self._clients: list[queue.Queue] = []
        self._lock = threading.Lock()
        self.snapshot: dict = {}
        self.logs: list = []

    def publish(self, kind: str, data=None, keep: bool = False):
        msg = json.dumps({"type": kind, "data": data}, ensure_ascii=False)
        if keep:
            self.snapshot[kind] = data
        if kind == "log":
            self.logs = (self.logs + [data])[-80:]
        with self._lock:
            clients = list(self._clients)
        for q in clients:
            try:
                q.put_nowait(msg)
            except queue.Full:
                pass

    def subscribe(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=500)
        with self._lock:
            self._clients.append(q)
        return q

    def unsubscribe(self, q):
        with self._lock:
            if q in self._clients:
                self._clients.remove(q)


class Server:
    def __init__(self, hub: Hub, api, port: int = 0):
        self.hub = hub
        self.api = api  # object with handle_api(path, body) -> dict
        self.token = secrets.token_urlsafe(24)
        server = self

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def log_message(self, *a):
                pass

            def _host_ok(self):
                host = (self.headers.get("Host") or "").split(":")[0]
                return host in ("127.0.0.1", "localhost")

            def _token_ok(self, qs):
                tok = self.headers.get("X-Jarvis-Token") or (qs.get("t") or [""])[0]
                return secrets.compare_digest(tok, server.token)

            def _send(self, code, body: bytes, ctype="application/json", extra=None):
                self.send_response(code)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                for k, v in (extra or {}).items():
                    self.send_header(k, v)
                self.end_headers()
                self.wfile.write(body)

            def do_GET(self):
                if not self._host_ok():
                    return self._send(403, b"{}")
                u = urlparse(self.path)
                qs = parse_qs(u.query)
                if u.path == "/api/events":
                    if not self._token_ok(qs):
                        return self._send(403, b"{}")
                    return self._sse()
                if u.path == "/api/state":
                    if not self._token_ok(qs):
                        return self._send(403, b"{}")
                    body = json.dumps({"snapshot": hub.snapshot, "logs": hub.logs}, ensure_ascii=False)
                    return self._send(200, body.encode())
                if u.path.startswith("/tts/"):
                    if not self._token_ok(qs):
                        return self._send(403, b"{}")
                    return self._file(TTS_DIR, u.path[len("/tts/"):])
                rel = "index.html" if u.path in ("/", "") else u.path.lstrip("/")
                return self._file(HUD_DIR, rel)

            def do_POST(self):
                if not self._host_ok():
                    return self._send(403, b"{}")
                u = urlparse(self.path)
                if not self._token_ok(parse_qs(u.query)):
                    return self._send(403, b"{}")
                n = int(self.headers.get("Content-Length") or 0)
                try:
                    body = json.loads(self.rfile.read(n) or b"{}")
                except ValueError:
                    return self._send(400, b"{}")
                try:
                    res = server.api.handle_api(u.path, body) or {}
                except Exception as e:  # never kill the server thread
                    res = {"error": str(e)}
                self._send(200, json.dumps(res, ensure_ascii=False).encode())

            def _file(self, root: Path, rel: str):
                root = root.resolve()
                path = (root / rel).resolve()
                if root not in path.parents and path != root or not path.is_file():
                    return self._send(404, b"not found", "text/plain")
                ctype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                if ctype.startswith("text/") or ctype.endswith("javascript"):
                    ctype += "; charset=utf-8"
                self._send(200, path.read_bytes(), ctype)

            def _sse(self):
                q = hub.subscribe()
                try:
                    self.send_response(200)
                    self.send_header("Content-Type", "text/event-stream")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Connection", "keep-alive")
                    self.end_headers()
                    self.wfile.write(b"retry: 1000\n\n")
                    self.wfile.flush()
                    while True:
                        try:
                            msg = q.get(timeout=15)
                            self.wfile.write(f"data: {msg}\n\n".encode())
                        except queue.Empty:
                            self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
                    pass
                finally:
                    hub.unsubscribe(q)
                    self.close_connection = True

        self.httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
        self.httpd.daemon_threads = True
        self.port = self.httpd.server_address[1]

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}/?t={self.token}"

    def start(self):
        threading.Thread(target=self.httpd.serve_forever, name="http", daemon=True).start()
