"""Original generated visual assets (abstract SVG art) - fully owned, no third-party license.

Image ``src`` values of the form ``gen:<seed>:<index>`` are rendered as inline SVG built
from the site's palette, so every site ships with unique, properly licensed artwork.
External photography can be attached later through ``WebsiteAsset`` with explicit license data.
"""

from __future__ import annotations

import base64
import random

from app.generation.color import mix
from app.generation.spec import Palette

GENERATED_LICENSE = "TRIAD original (generated, exclusive to owner)"


def is_generated(src: str) -> bool:
    return src.startswith("gen:")


def _planet(r: random.Random, p: Palette, w: int, h: int) -> str:
    """A planet limb seen from orbit: lit crescent, atmosphere glow, surface bands, starfield."""
    rad = w * r.uniform(0.55, 0.7)
    cx, cy = w * r.uniform(0.4, 0.6), rad + h * r.uniform(0.42, 0.55)
    base = mix(p.accent, "#2a1a12", 0.25)
    dark = mix(base, "#000000", 0.75)
    stars = "".join(f'<circle cx="{r.randint(0, w)}" cy="{r.randint(0, int(h * 0.6))}" r="{r.uniform(0.4, 1.4):.1f}" '
                    f'fill="#ffffff" fill-opacity="{r.uniform(0.2, 0.8):.2f}"/>' for _ in range(90))
    bands = "".join(
        f'<ellipse cx="{cx + r.uniform(-rad * 0.6, rad * 0.6):.0f}" cy="{cy - rad + r.uniform(20, rad * 0.5):.0f}" '
        f'rx="{r.uniform(rad * 0.15, rad * 0.5):.0f}" ry="{r.uniform(8, 40):.0f}" fill="{mix(base, r.choice(["#000000", "#ffffff"]), r.uniform(0.15, 0.4))}" '
        f'fill-opacity="{r.uniform(0.25, 0.6):.2f}"/>' for _ in range(14))
    craters = "".join(
        f'<circle cx="{cx + r.uniform(-rad * 0.7, rad * 0.7):.0f}" cy="{cy - rad + r.uniform(30, rad * 0.4):.0f}" r="{r.uniform(4, 22):.0f}" '
        f'fill="none" stroke="{mix(base, "#000000", 0.5)}" stroke-opacity="0.35" stroke-width="2"/>' for _ in range(16))
    return (f'<defs><radialGradient id="pl" cx="45%" cy="10%" r="75%"><stop offset="0" stop-color="{mix(base, "#ffffff", 0.25)}"/>'
            f'<stop offset=".55" stop-color="{base}"/><stop offset="1" stop-color="{dark}"/></radialGradient>'
            f'<radialGradient id="atm" cx="50%" cy="50%" r="50%"><stop offset=".86" stop-color="{mix(p.accent, "#9ad7ff", 0.6)}" stop-opacity="0"/>'
            f'<stop offset=".93" stop-color="{mix(p.accent, "#9ad7ff", 0.6)}" stop-opacity=".35"/><stop offset="1" stop-color="#9ad7ff" stop-opacity="0"/></radialGradient>'
            f'<clipPath id="pc"><circle cx="{cx:.0f}" cy="{cy:.0f}" r="{rad:.0f}"/></clipPath></defs>'
            f'<rect width="{w}" height="{h}" fill="#020304"/>{stars}'
            f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{rad * 1.04:.0f}" fill="url(#atm)"/>'
            f'<g clip-path="url(#pc)"><circle cx="{cx:.0f}" cy="{cy:.0f}" r="{rad:.0f}" fill="url(#pl)"/>{bands}{craters}'
            f'<rect width="{w}" height="{h}" fill="url(#shade)"/></g>'
            f'<defs><linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/>'
            f'<stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>')


def _depth(r: random.Random, p: Palette, w: int, h: int) -> str:
    """Abyssal topography: layered contour lines fading into the dark, with a luminous trench."""
    lines = []
    n = r.randint(18, 28)
    for i in range(n):
        y0 = h * (0.15 + 0.8 * i / n)
        amp = r.uniform(10, 60) * (1 + i / n)
        pts = []
        for x in range(0, w + 60, 60):
            pts.append(f"{x},{y0 + amp * __import__('math').sin(x / r.uniform(90, 220) + i * 0.6):.0f}")
        op = 0.08 + 0.6 * (i / n)
        lines.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{p.primary}" stroke-opacity="{op:.2f}" stroke-width="{1 + i / n:.1f}"/>')
    glow_x = r.uniform(0.3, 0.7) * w
    return (f'<defs><radialGradient id="g" cx="{glow_x / w:.2f}" cy=".85" r=".6"><stop offset="0" stop-color="{p.primary}" stop-opacity=".45"/>'
            f'<stop offset="1" stop-color="{p.background}" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="{w}" height="{h}" fill="{p.background}"/><rect width="{w}" height="{h}" fill="url(#g)"/>{"".join(lines)}')


def _dotmatrix(r: random.Random, p: Palette, w: int, h: int) -> str:
    """A halftone organism / signal field rendered as a dot matrix."""
    import math

    step = 24
    cx, cy = w * r.uniform(0.3, 0.7), h * r.uniform(0.35, 0.65)
    k1, k2 = r.uniform(0.008, 0.02), r.uniform(0.01, 0.03)
    dots = []
    for y in range(step // 2, h, step):
        for x in range(step // 2, w, step):
            d = math.hypot((x - cx) / w, (y - cy) / h)
            v = math.exp(-d * 4.2) * (0.6 + 0.4 * math.sin(x * k1 + y * k2) * math.cos(y * k1 - x * k2 * 0.7))
            if v > 0.12:
                dots.append(f'<circle cx="{x}" cy="{y}" r="{min(step / 2.3, 1.5 + v * 9):.0f}" '
                            f'fill="{p.accent if v > 0.55 else p.primary}" opacity="{min(1, v + 0.15):.1f}"/>')
    return f'<rect width="{w}" height="{h}" fill="{p.background}"/>{"".join(dots)}'


SPECIAL_STYLES = {"planet": _planet, "depth": _depth, "dotmatrix": _dotmatrix}


def svg_art(src: str, palette: Palette, w: int = 1200, h: int = 800) -> str:
    r = random.Random(src)
    parts = src.split(":")
    if len(parts) >= 4 and parts[3] in SPECIAL_STYLES:
        body = SPECIAL_STYLES[parts[3]](r, palette, w, h)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice">'
               f"{body}</svg>")
        return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()
    colors = [palette.primary, palette.accent, palette.surface, mix(palette.primary, palette.background, 0.5),
              mix(palette.accent, palette.text, 0.3)]
    bg = mix(palette.surface, palette.primary, r.uniform(0.05, 0.25))
    style = parts[3] if len(parts) >= 4 and parts[3] in ("circles", "bands", "blocks", "arcs") else r.choice(
        ["circles", "bands", "blocks", "arcs"])
    shapes: list[str] = []
    if style == "circles":
        for _ in range(r.randint(4, 8)):
            shapes.append(
                f'<circle cx="{r.randint(0, w)}" cy="{r.randint(0, h)}" r="{r.randint(60, 380)}" '
                f'fill="{r.choice(colors)}" fill-opacity="{r.uniform(0.35, 0.9):.2f}"/>'
            )
    elif style == "bands":
        y = 0
        while y < h:
            bh = r.randint(40, 200)
            shapes.append(f'<rect x="0" y="{y}" width="{w}" height="{bh}" fill="{r.choice(colors)}" '
                          f'fill-opacity="{r.uniform(0.4, 1):.2f}" transform="skewY({r.randint(-8, 8)})"/>')
            y += bh
    elif style == "blocks":
        for _ in range(r.randint(5, 10)):
            shapes.append(
                f'<rect x="{r.randint(-100, w)}" y="{r.randint(-100, h)}" width="{r.randint(120, 520)}" '
                f'height="{r.randint(120, 520)}" fill="{r.choice(colors)}" fill-opacity="{r.uniform(0.4, 0.95):.2f}"/>'
            )
    else:
        for _ in range(r.randint(3, 6)):
            rad = r.randint(150, 700)
            shapes.append(
                f'<circle cx="{r.choice([0, w])}" cy="{r.choice([0, h])}" r="{rad}" fill="none" '
                f'stroke="{r.choice(colors)}" stroke-width="{r.randint(20, 90)}" stroke-opacity="0.8"/>'
            )
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice">'
           f'<rect width="{w}" height="{h}" fill="{bg}"/>{"".join(shapes)}</svg>')
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()
