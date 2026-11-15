"""Color utilities: WCAG contrast and controlled palette variation."""

from __future__ import annotations

import colorsys


def hex_to_rgb(h: str) -> tuple[float, float, float]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore[return-value]


def rgb_to_hex(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{round(max(0, min(1, c)) * 255):02x}" for c in rgb)


def luminance(h: str) -> float:
    def ch(c: float) -> float:
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (ch(c) for c in hex_to_rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def shift(h: str, hue_deg: float = 0.0, sat: float = 0.0, light: float = 0.0) -> str:
    r, g, b = hex_to_rgb(h)
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    hh = (hh + hue_deg / 360) % 1.0
    ss = max(0.0, min(1.0, ss + sat))
    ll = max(0.0, min(1.0, ll + light))
    return rgb_to_hex(colorsys.hls_to_rgb(hh, ll, ss))


def mix(a: str, b: str, t: float) -> str:
    ra, rb = hex_to_rgb(a), hex_to_rgb(b)
    return rgb_to_hex(tuple(x + (y - x) * t for x, y in zip(ra, rb)))  # type: ignore[arg-type]
