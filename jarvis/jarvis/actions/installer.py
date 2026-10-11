"""Install / uninstall apps with winget — no Microsoft Store window needed."""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from typing import Callable

from ..brain.text import key, wratio

NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0
COMMON = ["--accept-source-agreements", "--disable-interactivity"]


@dataclass
class Package:
    name: str
    id: str
    version: str = ""
    source: str = ""


def available() -> bool:
    return shutil.which("winget") is not None


def _run(args: list[str], timeout: int = 60) -> str:
    out = subprocess.run(["winget", *args], capture_output=True, timeout=timeout,
                         creationflags=NO_WINDOW)
    return _decode(out.stdout) + _decode(out.stderr)


def _decode(b: bytes) -> str:
    for enc in ("utf-8", "cp1255", "cp437"):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            continue
    return b.decode("utf-8", "replace")


def parse_table(text: str) -> list[Package]:
    """Parse winget's fixed-width table (works for any UI language)."""
    lines = [re.sub(r"^.*\r", "", ln) for ln in text.splitlines()]
    sep = next((i for i, ln in enumerate(lines) if re.fullmatch(r"-{10,}", ln.strip())), None)
    if sep is None or sep == 0:
        return []
    header = lines[sep - 1]
    starts = [0] + [m.start() for m in re.finditer(r"(?<=\s)\S", header)]
    cols = []
    for i, s in enumerate(starts):
        e = starts[i + 1] if i + 1 < len(starts) else None
        cols.append((s, e))
    pkgs = []
    for ln in lines[sep + 1:]:
        if not ln.strip() or len(ln) < (cols[1][0] if len(cols) > 1 else 0):
            continue
        cells = [ln[s:e].strip() if e else ln[s:].strip() for s, e in cols]
        if len(cells) < 2 or not cells[1] or cells[1].endswith("…"):
            continue  # winget truncates ids in narrow output; such rows can't be installed
        name, pid = cells[0], cells[1]
        version = cells[2] if len(cells) > 2 else ""
        source = cells[-1] if len(cells) > 3 else ""
        pkgs.append(Package(name, pid, version, source))
    return pkgs


def search(query: str) -> list[Package]:
    return parse_table(_run(["search", "--query", query, *COMMON], timeout=60))


def best_match(query: str, pkgs: list[Package]) -> Package | None:
    if not pkgs:
        return None
    q = key(query)

    def score(p: Package) -> float:
        s = wratio(q, key(p.name))
        if key(p.name) == q:
            s += 30
        if p.source.lower() == "winget":
            s += 6   # classic installers are more predictable than store listings
        if q in key(p.id.replace(".", " ")):
            s += 5
        return s
    return max(pkgs, key=score)


def resolve(name: str, known_ids: dict) -> Package | None:
    q = key(name)
    for k, pid in (known_ids or {}).items():
        if key(k) == q:
            return Package(k, pid, source="msstore" if re.fullmatch(r"[0-9A-Z]{12}", pid) else "winget")
    return best_match(name, search(name))


def install(pkg: Package, silent: bool, on_line: Callable[[str], None]) -> bool:
    args = ["winget", "install", "--id", pkg.id, "--exact", "--accept-package-agreements", *COMMON]
    if pkg.source:
        args += ["--source", pkg.source]
    if silent:
        args.append("--silent")
    return _stream(args, on_line)


def uninstall(query: str, on_line: Callable[[str], None]) -> bool:
    listed = parse_table(_run(["list", "--query", query, *COMMON]))
    pkg = best_match(query, listed)
    if not pkg:
        on_line("not found")
        return False
    on_line(f"uninstalling {pkg.name}")
    return _stream(["winget", "uninstall", "--id", pkg.id, "--exact", "--silent", *COMMON], on_line)


def _stream(args: list[str], on_line: Callable[[str], None]) -> bool:
    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=NO_WINDOW)
    buf = b""
    while True:
        chunk = proc.stdout.read(256)
        if not chunk:
            break
        buf += chunk
        while True:
            m = re.search(rb"[\r\n]", buf)
            if not m:
                break
            line, buf = buf[:m.start()], buf[m.end():]
            text = _decode(line).strip()
            if text and not re.fullmatch(r"[\\|/\-]", text):
                on_line(text)
    proc.wait()
    return proc.returncode == 0
