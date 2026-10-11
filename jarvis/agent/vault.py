"""Folders -> searchable graph. Read-only: opens files for reading, never writes.

    python agent/vault.py          index and print what was found
"""
import math
import re
import sys
import time
import zlib
from collections import Counter, defaultdict, deque
from pathlib import Path

SKIP_DIRS = {"node_modules", ".git", ".obsidian", ".trash", "__pycache__", ".venv", "venv",
             "AppData", "$RECYCLE.BIN", "System Volume Information"}
MAX_BYTES = 2 * 1024 * 1024
EXTENSIONS = {".md": "markdown", ".markdown": "markdown", ".txt": "text", ".pdf": "pdf"}

# Parent folder name -> node type, when the note doesn't say `type:` itself.
FOLDER_TYPES = {
    "people": "person", "contacts": "person", "projects": "project", "areas": "area",
    "journal": "daily", "daily": "daily", "learning": "topic", "topics": "topic",
    "places": "place", "tools": "tool", "finance": "money", "money": "money",
}

WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
MDLINK = re.compile(r"\]\(([^)\s]+?\.md)\)")
TOKEN = re.compile(r"\w+", re.UNICODE)
STOP = set("""a an the and or but of to in on at for with from by is are was were be been it this that
these those i me my you your we our he she they them his her its as if so not no do does did have has had
what which who whom when where why how can could would should will just about into than then there here
all any some more most very also up out over""".split())


IRREGULAR = {"paid": "pay", "spent": "spend", "bought": "buy", "owe": "owe", "rent": "rent", "went": "go"}


def stem(t):
    """Tiny English suffix stripper; other scripts pass through untouched."""
    if t in IRREGULAR:
        return IRREGULAR[t]
    if t.isascii() and len(t) > 4:
        for suf in ("ing", "ed", "es", "s"):
            if t.endswith(suf) and len(t) - len(suf) >= 3:
                return t[: -len(suf)]
    return t


def tokenize(text):
    return [stem(t) for t in TOKEN.findall(text.lower()) if t not in STOP and len(t) > 1]


# ---------------------------------------------------------------- file readers

def _frontmatter(text):
    meta = {}
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            for line in text[3:end].splitlines():
                key, sep, value = line.partition(":")
                if sep:
                    meta[key.strip().lower()] = value.strip().strip('"').strip("'")
            text = text[end + 4:].lstrip("-\n")
    return meta, text


def _pdf_unescape(s):
    s = re.sub(rb"\\([0-7]{1,3})", lambda m: bytes([int(m.group(1), 8) & 255]), s)
    for a, b in ((rb"\n", b"\n"), (rb"\r", b""), (rb"\t", b" "), (rb"\(", b"("), (rb"\)", b")"), (rb"\\", b"\\")):
        s = s.replace(a, b)
    return s


def pdf_text(raw):
    """Best-effort text from simple PDFs (stdlib only). Scanned or exotic PDFs return ''."""
    out = []
    for m in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", raw, re.S):
        data = m.group(1)
        try:
            data = zlib.decompress(data)
        except zlib.error:
            pass
        for block in re.findall(rb"BT(.*?)ET", data, re.S):
            parts = re.findall(rb"\(((?:\\.|[^\\)])*)\)|(T\*|Td|TD|')", block)
            line = []
            for string, op in parts:
                if op:
                    out.append(b"".join(line)); line = []
                else:
                    line.append(_pdf_unescape(string))
            out.append(b"".join(line))
    return "\n".join(x.decode("latin-1", "replace") for x in out if x.strip())


# ---------------------------------------------------------------- the vault

class Vault:
    def __init__(self, folders):
        self.folders = [Path(f) for f in folders]
        self.notes = {}            # id -> note dict
        self.by_name = {}          # lowercase stem -> id
        self.edges = set()         # (a, b) with a < b
        self.adj = defaultdict(set)
        self.skipped = Counter()
        self.missing_folders = []
        self.index = {}            # token -> {id: tf}
        self.doc_len = {}
        self.built_in = 0.0

    # -- build
    def build(self):
        t0 = time.time()
        for root in self.folders:
            if not root.is_dir():
                self.missing_folders.append(str(root))
                continue
            for path in self._walk(root):
                self._add_file(root, path)
        self._link()
        self._build_index()
        self.built_in = time.time() - t0
        return self

    def _walk(self, root):
        stack = [root]
        while stack:
            d = stack.pop()
            try:
                entries = list(d.iterdir())
            except (PermissionError, OSError):
                self.skipped["unreadable folder"] += 1
                continue
            for p in entries:
                if p.is_dir():
                    if p.name in SKIP_DIRS or p.name.startswith("."):
                        continue
                    stack.append(p)
                elif p.suffix.lower() in EXTENSIONS:
                    yield p

    def _add_file(self, root, path):
        try:
            size = path.stat().st_size
            if size > MAX_BYTES:
                self.skipped["over 2 MB"] += 1
                return
            raw = path.read_bytes()
        except OSError:
            self.skipped["unreadable"] += 1
            return
        kind = EXTENSIONS[path.suffix.lower()]
        text = pdf_text(raw) if kind == "pdf" else raw.decode("utf-8", "replace")
        meta, body = _frontmatter(text) if kind == "markdown" else ({}, text)
        rel = path.relative_to(root).as_posix()
        nid = f"{root.name}/{rel}" if len(self.folders) > 1 else rel
        ntype = meta.get("type") or self._type_from_path(path, root, kind)
        title = meta.get("title") or path.stem
        links = [l.strip() for l in WIKILINK.findall(body)] if kind != "pdf" else []
        links += [Path(l).stem for l in MDLINK.findall(body)] if kind == "markdown" else []
        self.notes[nid] = {
            "id": nid, "title": title, "type": ntype.lower(), "kind": kind,
            "path": str(path), "size": size, "mtime": path.stat().st_mtime,
            "text": body, "links": links, "meta": meta,
        }
        self.by_name.setdefault(path.stem.lower(), nid)
        self.by_name.setdefault(title.lower(), nid)

    @staticmethod
    def _type_from_path(path, root, kind):
        for part in reversed(path.relative_to(root).parts[:-1]):
            t = FOLDER_TYPES.get(part.lower())
            if t:
                return t
        return {"pdf": "file", "text": "file"}.get(kind, "note")

    def _link(self):
        for nid, note in list(self.notes.items()):
            for target in note["links"]:
                tid = self.by_name.get(target.lower())
                if tid is None:                       # dangling [[link]] -> ghost node
                    tid = f"ghost:{target}"
                    if tid not in self.notes:
                        self.notes[tid] = {"id": tid, "title": target, "type": "ghost", "kind": "ghost",
                                           "path": None, "size": 0, "mtime": 0, "text": "", "links": [], "meta": {}}
                        self.by_name[target.lower()] = tid
                if tid != nid:
                    self.edges.add(tuple(sorted((nid, tid))))
                    self.adj[nid].add(tid)
                    self.adj[tid].add(nid)

    def _build_index(self):
        for nid, note in self.notes.items():
            tokens = tokenize(note["title"]) * 3 + tokenize(note["text"])
            self.doc_len[nid] = len(tokens) or 1
            for tok, tf in Counter(tokens).items():
                self.index.setdefault(tok, {})[nid] = tf
        self.avg_len = sum(self.doc_len.values()) / max(1, len(self.doc_len))

    # -- queries
    def degree(self, nid):
        return len(self.adj.get(nid, ()))

    def hubs(self, n=10):
        return sorted(self.notes, key=lambda i: (-self.degree(i), self.notes[i]["title"]))[:n]

    def type_counts(self):
        return Counter(n["type"] for n in self.notes.values())

    def search(self, query, limit=5):
        """BM25. Returns [{id, title, path, type, score, snippet}]."""
        terms = tokenize(query)
        n = len(self.notes) or 1
        scores = Counter()
        for t in set(terms):
            postings = self.index.get(t, {})
            if not postings:
                continue
            idf = math.log(1 + (n - len(postings) + 0.5) / (len(postings) + 0.5))
            for nid, tf in postings.items():
                norm = tf + 1.2 * (0.25 + 0.75 * self.doc_len[nid] / self.avg_len)
                scores[nid] += idf * tf * 2.2 / norm
        return [dict(id=nid, title=self.notes[nid]["title"], path=self.notes[nid]["path"],
                     type=self.notes[nid]["type"], score=round(s, 3),
                     snippet=self.snippet(nid, terms))
                for nid, s in scores.most_common(limit)
                if s >= 0.4 * scores.most_common(1)[0][1]]          # drop the long tail

    def snippet(self, nid, terms, width=220):
        text = re.sub(r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]", r"\1", self.notes[nid]["text"])
        text = re.sub(r"^#+\s*.*$", "", text, count=1, flags=re.M)        # drop the title heading
        text = re.sub(r"\s+", " ", text).strip()
        low = text.lower()
        pos = min((low.find(t) for t in terms if t in low), default=0)
        start = max(0, pos - width // 3)
        return ("…" if start else "") + text[start:start + width] + ("…" if start + width < len(text) else "")

    def shortest_path(self, a, b):
        prev, queue = {a: None}, deque([a])
        while queue:
            cur = queue.popleft()
            if cur == b:
                path = []
                while cur is not None:
                    path.append(cur); cur = prev[cur]
                return path[::-1]
            for nxt in self.adj.get(cur, ()):
                if nxt not in prev:
                    prev[nxt] = cur; queue.append(nxt)
        return []

    def graph(self):
        """Compact payload for the UI: no note bodies."""
        return {
            "nodes": [{"id": i, "title": n["title"], "type": n["type"], "degree": self.degree(i)}
                      for i, n in self.notes.items()],
            "edges": [list(e) for e in self.edges],
        }


# ---------------------------------------------------------------- CLI report

def report(vault, mode):
    notes = vault.notes
    print(f"JARVIS vault — mode: {mode}")
    for f in vault.folders:
        print(f"  folder: {f}{'   (NOT FOUND)' if str(f) in vault.missing_folders else ''}")
    files = sum(1 for n in notes.values() if n["kind"] != "ghost")
    print(f"\n{files} files, {len(notes) - files} unresolved links, {len(vault.edges)} edges "
          f"— indexed in {vault.built_in * 1000:.0f} ms")
    print("\nBy type:")
    for t, c in vault.type_counts().most_common():
        print(f"  {t:<10} {c:>5}")
    print("\nBy format:")
    for k, c in Counter(n["kind"] for n in notes.values() if n["kind"] != "ghost").most_common():
        print(f"  {k:<10} {c:>5}")
    if vault.skipped:
        print("\nSkipped:")
        for why, c in vault.skipped.items():
            print(f"  {why:<18} {c:>5}")
    print("\nTop 10 hubs:")
    for i, nid in enumerate(vault.hubs(10), 1):
        n = notes[nid]
        print(f"  {i:>2}. {n['title']:<32} {n['type']:<8} {vault.degree(nid):>3} links")


if __name__ == "__main__":
    sys.stdout.reconfigure(errors="replace")      # Hebrew filenames on a Windows console
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import data
    report(Vault(data.source_folders()).build(), data.mode())
