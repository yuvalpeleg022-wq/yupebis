"""Paste your keys once; this writes .env for you.  Run: python setup.py  (or double-click setup.bat)"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV = ROOT / ".env"
TEMPLATE = ROOT / ".env.example"

ASK = [
    ("ELEVENLABS_API_KEY", "ElevenLabs key (voice) — starts with sk_"),
    ("ANTHROPIC_API_KEY", "Claude key (the brain) — starts with sk-ant-"),
]


def read(path):
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    values = {}
    for line in lines:
        if "=" in line and not line.lstrip().startswith("#"):
            k, _, v = line.partition("=")
            values[k.strip()] = v.strip()
    return lines, values


def mask(v):
    return v[:6] + "…" + v[-4:] if len(v) > 12 else "set"


def main():
    sys.stdout.reconfigure(errors="replace")
    lines, values = read(ENV if ENV.exists() else TEMPLATE)
    print("\nJARVIS setup — paste a key and press Enter. Press Enter alone to keep what's there.")
    print("(To paste in this window: right-click, or Ctrl+V.)\n")
    changed = {}
    for key, label in ASK:
        now = values.get(key, "")
        hint = f" [now: {mask(now)}]" if now else " [not set]"
        try:
            got = input(f"{label}{hint}\n> ").strip().strip('"').strip("'")
        except EOFError:
            got = ""
        if got:
            changed[key] = got
        print()
    if not changed:
        print("Nothing changed.")
        return
    out, seen = [], set()
    for line in lines:
        k = line.partition("=")[0].strip()
        if k in changed and not line.lstrip().startswith("#"):
            out.append(f"{k}={changed[k]}")
            seen.add(k)
        else:
            out.append(line)
    out += [f"{k}={v}" for k, v in changed.items() if k not in seen]
    ENV.write_text("\n".join(out) + "\n", encoding="utf-8")
    if os.name != "nt":
        os.chmod(ENV, 0o600)
    for k, v in changed.items():
        print(f"Saved {k} = {mask(v)}")
    print(f"\nWritten to {ENV}\nNow start JARVIS again (start.bat).")


if __name__ == "__main__":
    main()
