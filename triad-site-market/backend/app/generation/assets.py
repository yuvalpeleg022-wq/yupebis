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


def svg_art(src: str, palette: Palette, w: int = 1200, h: int = 800) -> str:
    r = random.Random(src)
    colors = [palette.primary, palette.accent, palette.surface, mix(palette.primary, palette.background, 0.5),
              mix(palette.accent, palette.text, 0.3)]
    bg = mix(palette.surface, palette.primary, r.uniform(0.05, 0.25))
    style = r.choice(["circles", "bands", "blocks", "arcs"])
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
