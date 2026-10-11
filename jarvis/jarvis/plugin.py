"""Plugin API: drop .py files in the plugins folder; they hot-reload on save.

    from jarvis.plugin import command

    @command("מה מזג האוויר", "weather")
    def weather(ctx, text):
        ctx.search("מזג האוויר")
        return "הנה מזג האוויר"
"""
from __future__ import annotations

import importlib.util
import sys
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

_collecting: list | None = None


@dataclass
class PluginCommand:
    phrases: tuple[str, ...]
    func: Callable
    source: str


def command(*phrases: str):
    def deco(func):
        if _collecting is not None:
            _collecting.append(PluginCommand(tuple(phrases), func, getattr(func, "__module__", "?")))
        return func
    return deco


def load_plugins(folder: Path) -> tuple[list[PluginCommand], list[str]]:
    """Execute every plugin file fresh. Returns (commands, error messages)."""
    global _collecting
    commands: list[PluginCommand] = []
    errors: list[str] = []
    if not folder.exists():
        return commands, errors
    for path in sorted(folder.glob("*.py")):
        if path.name.startswith("_"):
            continue
        name = f"jarvis_plugin_{path.stem}"
        _collecting = []
        try:
            spec = importlib.util.spec_from_file_location(name, path)
            mod = importlib.util.module_from_spec(spec)
            sys.modules[name] = mod
            spec.loader.exec_module(mod)
            commands.extend(_collecting)
        except Exception:
            errors.append(f"{path.name}: {traceback.format_exc(limit=3)}")
        finally:
            _collecting = None
    return commands, errors
