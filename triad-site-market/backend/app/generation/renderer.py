"""Deterministic SiteSpec -> static HTML renderer.

Output is plain, dependency-free HTML + CSS (no JavaScript other than a tiny, optional
mobile-nav toggle), responsive and accessible. All user/AI text is HTML-escaped.
"""

from __future__ import annotations

from html import escape
from urllib.parse import quote_plus

from app.generation.assets import is_generated, svg_art
from app.generation.color import mix
from app.generation.spec import Image, Page, Section, SiteSpec, Theme

SPACING = {"compact": (56, 20), "comfortable": (88, 28), "airy": (128, 36)}
SAFE_SCHEMES = ("http://", "https://", "mailto:", "tel:", "#")


def e(s: str) -> str:
    return escape(s or "", quote=True)


def safe_href(href: str) -> str:
    h = (href or "").strip()
    if h.startswith(SAFE_SCHEMES) or (h and ":" not in h.split("/")[0]):
        return e(h)
    return "#"


def img_src(img: Image, theme: Theme) -> str:
    if is_generated(img.src):
        return svg_art(img.src, theme.palette)
    return safe_href(img.src)


def css(theme: Theme) -> str:
    p, t = theme.palette, theme.typography
    pad, gap = SPACING[theme.spacing]
    s = t.scale
    sizes = {f"h{i}": round(16 * s ** (6 - i), 1) for i in range(1, 5)}
    btn = {
        "solid": f"background:var(--primary);color:var(--on-primary);border:2px solid var(--primary);",
        "outline": "background:transparent;color:inherit;border:2px solid currentColor;",
        "pill": f"background:var(--primary);color:var(--on-primary);border:2px solid var(--primary);border-radius:999px;",
        "underline": "background:transparent;color:inherit;border:0;border-bottom:2px solid currentColor;padding-left:0;padding-right:0;border-radius:0;",
    }[theme.button_style]
    img = {
        "none": "", "grayscale": "filter:grayscale(1);", "duotone": "filter:grayscale(1) contrast(1.1);mix-blend-mode:luminosity;",
        "rounded": f"border-radius:{max(theme.radius_px, 12)}px;", "framed": "outline:1px solid var(--muted);outline-offset:10px;",
    }[theme.image_treatment]
    return f"""
:root{{--bg:{p.background};--surface:{p.surface};--text:{p.text};--muted:{p.muted};--primary:{p.primary};
--on-primary:{p.on_primary};--accent:{p.accent};--line:{mix(p.text, p.background, 0.85)};--r:{theme.radius_px}px;
--pad:{pad}px;--gap:{gap}px;--max:{theme.max_width_px}px}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}
body{{margin:0;background:var(--bg);color:var(--text);font-family:'{t.body_font}',system-ui,sans-serif;font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}}
h1,h2,h3,h4{{font-family:'{t.heading_font}',Georgia,serif;font-weight:{t.heading_weight};line-height:1.12;margin:0 0 .5em;
letter-spacing:{t.letter_spacing}em;text-transform:{t.heading_case}}}
h1{{font-size:clamp(2.3rem,6vw,{sizes['h1']}px)}}h2{{font-size:clamp(1.8rem,4vw,{sizes['h2']}px)}}h3{{font-size:{sizes['h4']}px}}
p{{margin:0 0 1em}}a{{color:inherit}}img{{max-width:100%;display:block;{img}}}
.wrap{{max-width:var(--max);margin:0 auto;padding:0 24px}}
section{{padding:var(--pad) 0}}
.bg-surface{{background:var(--surface)}}.bg-primary{{background:var(--primary);color:var(--on-primary)}}
.bg-inverse{{background:var(--text);color:var(--bg)}}.bg-inverse .muted,.bg-primary .muted{{color:inherit;opacity:.8}}
.eyebrow{{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:1em;display:block}}
.bg-primary .eyebrow{{color:inherit}}
.muted{{color:var(--muted)}}.lead{{font-size:1.2rem;max-width:40em}}
.btn{{display:inline-block;padding:.85em 1.6em;border-radius:var(--r);text-decoration:none;font-weight:600;{btn}}}
.bg-primary .btn{{background:var(--on-primary);color:var(--primary);border-color:var(--on-primary)}}
.grid{{display:grid;gap:var(--gap)}}.g2{{grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}}
.g3{{grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))}}.g4{{grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))}}
.card{{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:calc(var(--gap) * 1.1)}}
.bg-surface .card{{background:var(--bg)}}
.center{{text-align:center}}.center .lead{{margin-left:auto;margin-right:auto}}
.head{{max-width:46em;margin-bottom:calc(var(--gap) * 1.6)}}.center .head,.head.center{{margin-left:auto;margin-right:auto}}
nav.site{{padding:20px 0;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:10}}
nav.site .wrap{{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}}
nav.site .brand{{font-family:'{t.heading_font}',serif;font-weight:{t.heading_weight};font-size:1.3rem;text-decoration:none;text-transform:{t.heading_case}}}
nav.site ul{{list-style:none;display:flex;gap:28px;margin:0;padding:0;flex-wrap:wrap}}nav.site ul a{{text-decoration:none;font-size:.95rem}}
nav.site ul a:hover{{color:var(--accent)}}nav.centered .wrap{{flex-direction:column}}
nav.split ul{{order:-1}}
.hero-split .wrap{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:calc(var(--gap) * 2);align-items:center}}
.hero-fullbleed{{position:relative;min-height:78vh;display:flex;align-items:flex-end;color:#fff;padding:0}}
.hero-fullbleed img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.55)}}
.hero-fullbleed .muted{{color:rgba(255,255,255,.88)}}.hero-fullbleed .eyebrow{{color:#fff}}
.hero-fullbleed .wrap{{position:relative;padding-top:var(--pad);padding-bottom:var(--pad);width:100%}}
.hero-editorial h1{{font-size:clamp(2.8rem,9vw,{round(sizes['h1'] * 1.35)}px);max-width:14em}}
.hero-editorial .cols{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:var(--gap);border-top:1px solid var(--line);padding-top:var(--gap);margin-top:var(--gap)}}
.media{{aspect-ratio:4/3;width:100%;object-fit:cover;border-radius:var(--r)}}
.list-row{{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:var(--gap);padding:var(--gap) 0;border-top:1px solid var(--line)}}
.num{{font-family:'{t.heading_font}',serif;font-size:2.4rem;color:var(--accent);line-height:1}}
.alt{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:calc(var(--gap)*2);align-items:center;margin-bottom:var(--pad)}}
.alt:nth-child(even) .media{{order:2}}
.masonry{{columns:3 280px;column-gap:var(--gap)}}.masonry img{{margin-bottom:var(--gap);break-inside:avoid;border-radius:var(--r)}}
.masonry img:nth-child(3n){{aspect-ratio:3/4;object-fit:cover}}
.strip{{display:flex;gap:var(--gap);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:12px}}
.strip img{{flex:0 0 min(80%,420px);scroll-snap-align:start;aspect-ratio:4/5;object-fit:cover;border-radius:var(--r)}}
.stat .v{{font-family:'{t.heading_font}',serif;font-size:clamp(2.2rem,5vw,3.6rem);font-weight:{t.heading_weight};line-height:1}}
blockquote{{margin:0;font-size:1.15rem}}.single blockquote{{font-size:clamp(1.4rem,3vw,2.1rem);font-family:'{t.heading_font}',serif;max-width:30em;margin:0 auto}}
.menu-item{{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px dashed var(--line)}}
.price{{font-weight:700;color:var(--accent);white-space:nowrap}}
details{{border-bottom:1px solid var(--line);padding:18px 0}}summary{{cursor:pointer;font-weight:600;font-size:1.05rem}}
form .field{{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}}
input,textarea{{font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r);background:var(--bg);color:var(--text)}}
footer.site{{padding:var(--pad) 0 40px}}footer.site ul{{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:20px}}
footer.site .legal{{margin-top:var(--gap);font-size:.85rem;opacity:.7}}
footer.big .brand{{font-size:clamp(3rem,12vw,9rem);line-height:.9;margin-bottom:var(--gap)}}
a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,textarea:focus-visible{{outline:3px solid var(--accent);outline-offset:3px}}
.skip{{position:absolute;left:-9999px}}.skip:focus{{left:16px;top:16px;background:var(--bg);padding:8px 12px;z-index:100}}
@media (max-width:720px){{.list-row{{grid-template-columns:1fr}}nav.site ul{{gap:16px}}.alt:nth-child(even) .media{{order:0}}}}
@media (prefers-reduced-motion:reduce){{html{{scroll-behavior:auto}}}}
"""


def _head(sec: Section, center: bool = False, level: int = 2) -> str:
    parts = []
    if sec.eyebrow:
        parts.append(f'<span class="eyebrow">{e(sec.eyebrow)}</span>')
    if sec.heading:
        parts.append(f"<h{level}>{e(sec.heading)}</h{level}>")
    if sec.body:
        parts.append(f'<p class="lead muted">{e(sec.body)}</p>')
    if not parts:
        return ""
    return f'<div class="head{" center" if center else ""}">{"".join(parts)}</div>'


def _buttons(sec: Section) -> str:
    return "".join(f'<a class="btn" href="{safe_href(l.href)}">{e(l.label)}</a> ' for l in sec.links)


def _img(img: Image | None, theme: Theme, cls: str = "media", eager: bool = False) -> str:
    if not img:
        return ""
    loading = "eager" if eager else "lazy"
    return f'<img class="{cls}" src="{img_src(img, theme)}" alt="{e(img.alt)}" loading="{loading}" decoding="async">'


def render_section(sec: Section, spec: SiteSpec, page: Page) -> str:
    th = spec.theme
    v, t = sec.variant, sec.type
    bg = {"default": "", "surface": "bg-surface", "primary": "bg-primary", "inverse": "bg-inverse"}[sec.background]
    sid = e(sec.id)

    if t == "navbar":
        current = ' aria-current="page"'
        links = "".join(
            f'<li><a href="{safe_href(l.href)}"{current if l.href.startswith(page.slug + ".") else ""}>{e(l.label)}</a></li>'
            for l in sec.links
        )
        return (f'<nav class="site {e(v)}" id="{sid}" aria-label="Main"><div class="wrap">'
                f'<a class="brand" href="index.html">{e(sec.heading or spec.meta.business_name)}</a>'
                f"<ul>{links}</ul></div></nav>")

    if t == "footer":
        links = "".join(f'<li><a href="{safe_href(l.href)}">{e(l.label)}</a></li>' for l in sec.links)
        cls = "bg-inverse" if v == "big" else (bg or "bg-surface")
        brand = f'<div class="brand" style="font-family:inherit">{e(sec.heading)}</div>' if v == "big" else f"<h3>{e(sec.heading)}</h3>"
        cols = (f'<div class="grid g2">{"<div>" + brand + "<p class=muted>" + e(sec.body) + "</p></div>"}<div><ul>{links}</ul></div></div>'
                if v == "columns" else f'{brand}<ul>{links}</ul>')
        return (f'<footer class="site {e(v)} {cls}" id="{sid}"><div class="wrap">{cols}'
                f'<p class="legal">© {e(spec.meta.business_name)}. All rights reserved.</p></div></footer>')

    inner = ""
    if t == "hero":
        level_head = _head(sec, center=v in ("centered", "stacked"), level=1)
        if v == "split":
            inner = f'<div class="wrap"><div>{level_head}{_buttons(sec)}</div>{_img(sec.image, th, eager=True)}</div>'
            return f'<section class="hero-split {bg}" id="{sid}">{inner}</section>'
        if v == "fullbleed":
            return (f'<section class="hero-fullbleed" id="{sid}">{_img(sec.image, th, cls="", eager=True)}'
                    f'<div class="wrap">{level_head}{_buttons(sec)}</div></section>')
        if v == "editorial":
            inner = (f'<div class="wrap hero-editorial"><span class="eyebrow">{e(sec.eyebrow)}</span><h1>{e(sec.heading)}</h1>'
                     f'<div class="cols"><p class="lead muted">{e(sec.body)}</p><div>{_buttons(sec)}</div></div>'
                     f'{"<div style=margin-top:var(--gap)>" + _img(sec.image, th, eager=True) + "</div>" if sec.image else ""}</div>')
            return f'<section class="{bg}" id="{sid}">{inner}</section>'
        img = f'<div style="margin-top:calc(var(--gap)*2)">{_img(sec.image, th, eager=True)}</div>' if sec.image and v == "centered" else ""
        inner = f'<div class="wrap {"center" if v == "centered" else ""}">{level_head}{_buttons(sec)}{img}</div>'
        return f'<section class="{bg}" id="{sid}">{inner}</section>'

    head = _head(sec, center=v in ("centered", "single", "row", "banner", "minimal"))
    items = sec.items

    if t in ("features", "services"):
        if v in ("grid", "cards"):
            body = "".join(f'<div class="card"><h3>{e(i.title)}</h3><p class="muted">{e(i.text)}</p></div>' for i in items)
            inner = f'{head}<div class="grid g3">{body}</div>'
        elif v in ("list", "rows"):
            inner = head + "".join(f'<div class="list-row"><h3>{e(i.title)}</h3><p class="muted">{e(i.text)}</p></div>' for i in items)
        elif v == "numbered":
            inner = head + '<div class="grid g3">' + "".join(
                f'<div><div class="num">{n:02d}</div><h3 style="margin-top:.6em">{e(i.title)}</h3><p class="muted">{e(i.text)}</p></div>'
                for n, i in enumerate(items, 1)) + "</div>"
        else:  # alternating
            inner = head + "".join(
                f'<div class="alt">{_img(i.image, th)}<div><h3>{e(i.title)}</h3><p class="muted">{e(i.text)}</p></div></div>'
                for i in items)
    elif t == "about":
        if v == "split":
            inner = f'<div class="grid g2" style="align-items:center">{_img(sec.image, th)}<div>{head}</div></div>'
        elif v == "quote":
            inner = (f'<div class="center"><span class="eyebrow">{e(sec.eyebrow)}</span>'
                     f'<blockquote style="font-size:clamp(1.4rem,3vw,2rem);max-width:28em;margin:0 auto">{e(sec.body)}</blockquote>'
                     f'<p class="muted" style="margin-top:1em">- {e(sec.heading)}</p></div>')
        else:  # timeline
            inner = head + "".join(f'<div class="list-row"><div class="num">{e(i.title)}</div><p>{e(i.text)}</p></div>' for i in items)
    elif t == "menu":
        rows = "".join(
            f'<div class="menu-item"><div><strong>{e(i.title)}</strong><div class="muted">{e(i.text)}</div></div>'
            f'<span class="price">{e(i.meta)}</span></div>' for i in items)
        inner = f'{head}<div class="{"grid g2" if v == "columns" else ""}" style="column-gap:calc(var(--gap)*2)">{rows}</div>'
    elif t == "gallery":
        imgs = "".join(_img(i.image, th, cls="media" if v == "grid" else "") for i in items if i.image)
        cls = {"masonry": "masonry", "grid": "grid g3", "strip": "strip"}[v]
        inner = f'{head}<div class="{cls}">{imgs}</div>'
    elif t == "stats":
        cells = "".join(
            f'<div class="stat {"card" if v == "boxed" else ""}"><div class="v">{e(i.title)}</div><p class="muted">{e(i.text)}</p></div>'
            for i in items)
        inner = f'{head}<div class="grid g{min(max(len(items), 2), 4)} {"center" if v == "row" else ""}">{cells}</div>'
    elif t == "testimonials":
        if v == "single" and items:
            i = items[0]
            inner = f'<div class="single center">{head}<blockquote>“{e(i.text)}”</blockquote><p class="muted">{e(i.title)} · {e(i.meta)}</p></div>'
        else:
            cls = "g3" if v == "cards" else "g2"
            inner = head + f'<div class="grid {cls}">' + "".join(
                f'<figure class="card" style="margin:0"><blockquote>“{e(i.text)}”</blockquote>'
                f'<figcaption class="muted" style="margin-top:1em">{e(i.title)} · {e(i.meta)}</figcaption></figure>' for i in items) + "</div>"
    elif t == "pricing":
        if v == "table":
            inner = head + "".join(
                f'<div class="list-row"><div><h3>{e(i.title)}</h3><p class="price">{e(i.meta)}</p></div><p class="muted">{e(i.text)}</p></div>'
                for i in items)
        else:
            inner = head + '<div class="grid g3">' + "".join(
                f'<div class="card"><h3>{e(i.title)}</h3><p class="stat"><span class="v" style="font-size:2rem">{e(i.meta)}</span></p>'
                f'<p class="muted">{e(i.text)}</p><a class="btn" href="contact.html">Choose</a></div>' for i in items) + "</div>"
    elif t == "team":
        if v == "grid":
            inner = head + '<div class="grid g4">' + "".join(
                f'<div>{_img(i.image, th)}<h3 style="margin-top:.8em">{e(i.title)}</h3><p class="muted">{e(i.meta)}</p></div>'
                for i in items) + "</div>"
        else:
            inner = head + "".join(f'<div class="list-row"><div><h3>{e(i.title)}</h3><p class="muted">{e(i.meta)}</p></div><p>{e(i.text)}</p></div>' for i in items)
    elif t == "faq":
        qa = "".join(f"<details><summary>{e(i.title)}</summary><p class=\"muted\">{e(i.text)}</p></details>" for i in items)
        inner = f'<div class="grid g2"><div>{head}</div><div>{qa}</div></div>' if v == "two_column" else f'{head}<div style="max-width:52em">{qa}</div>'
    elif t == "cta":
        bg = bg or "bg-primary"
        if v == "split":
            inner = f'<div class="grid g2" style="align-items:center"><div>{_head(sec)}</div><div>{_buttons(sec)}</div></div>'
        else:
            inner = f'<div class="center">{_head(sec, center=True)}{_buttons(sec)}</div>'
    elif t == "contact":
        details = "".join(f'<p><strong>{e(i.title)}</strong><br><span class="muted">{e(i.text)}</span></p>' for i in items)
        form = ('<form action="#" method="post" aria-label="Contact form">'
                '<div class="field"><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" required></div>'
                '<div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>'
                '<div class="field"><label for="f-msg">Message</label><textarea id="f-msg" name="message" rows="5" required></textarea></div>'
                '<button class="btn" type="submit">Send message</button></form>')
        if v == "simple":
            inner = f"{head}{details}"
        else:
            inner = f'<div class="grid g2"><div>{head}{details}</div><div>{form}</div></div>'

    return f'<section class="{t} {e(v)} {bg}" id="{sid}"><div class="wrap">{inner}</div></section>'


def google_fonts_href(theme: Theme) -> str:
    fams = {theme.typography.heading_font, theme.typography.body_font}
    q = "&".join(f"family={quote_plus(f)}:wght@300;400;500;600;700;800" for f in sorted(fams))
    return f"https://fonts.googleapis.com/css2?{q}&display=swap"


def render_page(spec: SiteSpec, slug: str = "index", *, preview_banner: str | None = None) -> str:
    page = spec.page(slug)
    if page is None:
        raise KeyError(slug)
    title = page.title if slug != "index" else spec.meta.business_name
    full_title = f"{title} · {spec.meta.business_name}" if slug != "index" else f"{title} - {spec.meta.tagline}"
    desc = page.description or spec.meta.tagline
    secs = list(page.sections)
    nav = render_section(secs.pop(0), spec, page) if secs and secs[0].type == "navbar" else ""
    foot = render_section(secs.pop(), spec, page) if secs and secs[-1].type == "footer" else ""
    body = "\n".join(render_section(s, spec, page) for s in secs)
    banner = (f'<div role="note" style="position:fixed;bottom:12px;right:12px;z-index:999;background:#111;color:#fff;'
              f'font:600 12px system-ui;padding:8px 12px;border-radius:6px;opacity:.85">{e(preview_banner)}</div>'
              if preview_banner else "")
    return f"""<!doctype html>
<html lang="{e(spec.meta.language)}" dir="{spec.meta.direction}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full_title)}</title>
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(full_title)}">
<meta property="og:description" content="{e(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{google_fonts_href(spec.theme)}">
<style>{css(spec.theme)}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{nav}
<main id="main">
{body}
</main>
{foot}
{banner}
</body>
</html>"""


def render_site(spec: SiteSpec) -> dict[str, str]:
    return {f"{p.slug}.html": render_page(spec, p.slug) for p in spec.pages}
