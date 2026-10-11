"""Long-term memory: one dated markdown file per fact. Writes to memory/ and nowhere else."""
import re
from pathlib import Path

import data


def _dir():
    d = data.memory_dir()
    d.mkdir(parents=True, exist_ok=True)
    return d


def _safe(path):
    """Refuse any path that resolves outside memory/."""
    root = data.MEMORY_DIR.resolve()
    p = Path(path).resolve()
    if root != p and root not in p.parents:
        raise PermissionError(f"refusing to write outside memory/: {p}")
    return p


def write(fact):
    fact = " ".join(fact.split())
    if not fact:
        raise ValueError("empty fact")
    day = data.today().isoformat()
    slug = "-".join(re.findall(r"\w+", fact.lower())[:7])[:60] or "fact"
    path = _dir() / f"{day}-{slug}.md"
    n = 2
    while path.exists():
        path = _dir() / f"{day}-{slug}-{n}.md"
        n += 1
    _safe(path).write_text(f"{fact}\n\n— remembered {day}\n", encoding="utf-8")
    return path.relative_to(data.ROOT).as_posix()


def entries(limit=60):
    files = sorted(_dir().glob("*.md"), reverse=True)[:limit]
    return [{"file": f.relative_to(data.ROOT).as_posix(),
             "fact": f.read_text(encoding="utf-8").split("\n\n— remembered")[0].strip()} for f in files]
