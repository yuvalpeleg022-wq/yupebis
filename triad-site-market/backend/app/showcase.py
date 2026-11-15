"""Static showcase export: a browsable, serverless catalog of generated websites.

Produces plain HTML files that any static host (GitHub Pages, Cloudflare Pages, S3) can
serve. It is a demo catalog only: there is no login, purchase or editing without the API.

    python -m app.cli export-showcase OUT_DIR
"""

from __future__ import annotations

import json
import shutil
from html import escape
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.generation.catalog import CATEGORIES, DIRECTIONS
from app.generation.renderer import render_page
from app.generation.spec import SiteSpec

# A curated, reproducible line-up covering every design direction.
LINEUP: list[tuple[str, str, int]] = [
    ("travel", "orbital", 7101), ("technology", "abyssal", 7102), ("restaurant", "luxury", 7103),
    ("architecture", "editorial", 7104), ("creative_agency", "abyssal", 7105), ("law_firm", "corporate", 7106),
    ("portfolio", "orbital", 7107), ("fitness", "cinematic", 7108), ("clinic", "minimalist", 7109),
    ("real_estate", "luxury", 7110), ("technology", "futuristic", 7111), ("professional_services", "minimalist", 7112),
    ("architecture", "orbital", 7113), ("restaurant", "editorial", 7114), ("travel", "abyssal", 7115),
    ("creative_agency", "cinematic", 7116), ("fitness", "futuristic", 7117), ("law_firm", "luxury", 7118),
]

FONTS = ("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600"
         "&family=Inter:wght@400;500;600;700&display=swap")

BASE_CSS = """
*{box-sizing:border-box}html{color-scheme:dark}
body{margin:0;background:#0b0b0f;color:#f4f1ea;font:16px/1.6 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}.wrap{max-width:1280px;margin:0 auto;padding:0 24px}
header.top{position:sticky;top:0;z-index:30;border-bottom:1px solid rgba(255,255,255,.1);background:rgba(11,11,15,.85);backdrop-filter:blur(10px)}
header.top .wrap{display:flex;justify-content:space-between;align-items:center;padding-top:16px;padding-bottom:16px;gap:16px}
.logo{font:600 1.25rem 'Cormorant Garamond',Georgia,serif;letter-spacing:.2em}.logo b{color:#c8a96a;font-weight:600}
.pill{font-size:.75rem;border:1px solid rgba(200,169,106,.5);color:#c8a96a;border-radius:999px;padding:4px 12px;white-space:nowrap}
h1,h2,h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;margin:0}
.muted{color:rgba(255,255,255,.6)}.label{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);display:block;margin-bottom:4px}
.card{border:1px solid rgba(255,255,255,.1);background:#14141b;border-radius:16px}
.chip{font:inherit;font-size:.78rem;color:rgba(255,255,255,.7);background:none;border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:5px 13px;cursor:pointer}
.chip:hover{border-color:rgba(255,255,255,.4)}.chip.on{border-color:#c8a96a;background:rgba(200,169,106,.1);color:#c8a96a}
.input{font:inherit;font-size:.9rem;color:inherit;background:#14141b;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 12px}
.btn{display:inline-block;font:600 .9rem Inter,sans-serif;border-radius:999px;padding:11px 22px;background:#c8a96a;color:#0b0b0f;border:0;cursor:pointer}
.btn[disabled]{opacity:.55;cursor:not-allowed}
a:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #c8a96a;outline-offset:2px}
footer.bot{border-top:1px solid rgba(255,255,255,.1);margin-top:80px;padding:28px 0;font-size:.85rem;color:rgba(255,255,255,.5)}
"""

INDEX_CSS = """
.hero{padding:72px 0 56px}.hero .eyebrow{font-size:.72rem;letter-spacing:.3em;text-transform:uppercase;color:#c8a96a}
.hero h1{font-size:clamp(2.6rem,6.5vw,4.6rem);line-height:1.05;max-width:16em;margin-top:16px}
.hero p{font-size:1.1rem;max-width:40em;margin-top:22px}
.filters{position:sticky;top:61px;z-index:20;background:rgba(11,11,15,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.1);padding:14px 0;margin-bottom:32px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.row+.row{margin-top:12px}.count{margin-left:auto;font-size:.88rem;color:rgba(255,255,255,.5)}
.grid{display:grid;gap:24px;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))}
.site{display:block;overflow:hidden;transition:border-color .2s}.site:hover{border-color:rgba(200,169,106,.6)}
.thumb{position:relative;aspect-ratio:16/10;overflow:hidden;background:#1e1e28}
.thumb iframe{position:absolute;left:0;top:0;width:250%;height:250%;transform:scale(.4);transform-origin:0 0;border:0;pointer-events:none;background:#fff}
.meta{display:flex;justify-content:space-between;gap:12px;padding:16px}.meta h3{font-size:1.2rem}.meta p{margin:2px 0 0;font-size:.88rem}
.meta small{display:block;margin-top:8px;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.4)}
.price{flex:none;align-self:flex-start;background:rgba(200,169,106,.1);color:#c8a96a;font-weight:600;font-size:.9rem;border-radius:999px;padding:4px 12px}
.empty{padding:40px;text-align:center}
"""

DETAIL_CSS = """
.layout{display:grid;gap:32px;grid-template-columns:1fr;padding-top:36px}
@media(min-width:1024px){.layout{grid-template-columns:1fr 340px}aside{position:sticky;top:90px;align-self:start}}
.bar{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.1)}
.stage{display:flex;justify-content:center;background:rgba(0,0,0,.4);padding:14px}
.stage iframe{width:100%;height:72vh;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#fff;transition:width .25s}
.stage.mobile iframe{width:390px;max-width:100%}
aside h1{font-size:2.3rem;line-height:1.1;margin-top:4px}aside>*+*{margin-top:22px}
dl{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0;padding:16px;font-size:.9rem}dd{margin:0}
.sw{display:inline-block;width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,255,255,.2);margin-right:4px}
.buy{padding:20px}.buy .p{font-size:1.9rem;font-weight:600}.buy ul{list-style:none;padding:0;margin:16px 0 0;font-size:.88rem;color:rgba(255,255,255,.6)}
.buy li{margin-top:4px}.note{font-size:.78rem;color:rgba(255,255,255,.45);margin-top:14px}
.back{font-size:.88rem;color:rgba(255,255,255,.55)}
"""


def _label(key: str) -> str:
    return key.replace("_", " ").title()


def _money(cents: int, currency: str) -> str:
    symbol = {"ILS": "₪", "USD": "$", "EUR": "€"}.get(currency, currency + " ")
    return f"{symbol}{cents // 100:,}"


def _shell(title: str, css: str, body: str, root: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="AI-crafted, professionally reviewed websites. Each one sold exactly once.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>{BASE_CSS}{css}</style>
</head>
<body>
<header class="top"><div class="wrap"><a class="logo" href="{root}index.html">TRIAD<b> ·</b> SITE MARKET</a>
<span class="pill">Demo catalog</span></div></header>
{body}
<footer class="bot"><div class="wrap">TRIAD SITE MARKET · demo catalog. Every website shown is an original generated
by the TRIAD engine. Purchasing, accounts and the editors run on the full platform.</div></footer>
</body>
</html>"""


def _index(sites: list[dict]) -> str:
    cats = [c for c in CATEGORIES.values() if any(s["category"] == c.key for s in sites)]
    dirs = [d for d in DIRECTIONS.values() if any(s["direction"] == d.key for s in sites)]
    chips = '<button class="chip on" data-cat="">All</button>' + "".join(
        f'<button class="chip" data-cat="{c.key}">{escape(c.label)}</button>' for c in cats)
    options = '<option value="">All styles</option>' + "".join(
        f'<option value="{d.key}">{escape(d.label)}</option>' for d in dirs)
    cards = "".join(
        f'<a class="card site" href="s/{s["slug"]}.html" data-cat="{s["category"]}" data-dir="{s["direction"]}" '
        f'data-price="{s["price_cents"]}" data-i="{i}" data-text="{escape((s["title"] + " " + s["tagline"]).lower())}">'
        f'<div class="thumb"><iframe title="{escape(s["title"])} thumbnail" src="sites/{s["slug"]}/index.html" '
        f'loading="lazy" tabindex="-1" aria-hidden="true" sandbox=""></iframe></div>'
        f'<div class="meta"><div style="min-width:0"><h3>{escape(s["title"])}</h3><p class="muted">{escape(s["tagline"])}</p>'
        f'<small>{escape(_label(s["category"]))} · {escape(_label(s["direction"]))} · {s["pages"]} pages</small></div>'
        f'<span class="price">{_money(s["price_cents"], s["currency"])}</span></div></a>'
        for i, s in enumerate(sites))
    body = f"""<main class="wrap">
<section class="hero"><span class="eyebrow">One website · One owner</span>
<h1>Exceptional websites, crafted by AI, reviewed by people, sold exactly once.</h1>
<p class="muted">Every site in the market is an original. When it is bought, it leaves the market forever.
Browse the catalog and open any site to explore every page on desktop and mobile.</p></section>
<section class="filters" aria-label="Filters"><div class="row" id="cats">{chips}</div>
<div class="row"><input class="input" id="q" placeholder="Search websites" aria-label="Search">
<select class="input" id="dir" aria-label="Design direction">{options}</select>
<select class="input" id="sort" aria-label="Sort"><option value="new">Newest</option>
<option value="asc">Price: low to high</option><option value="desc">Price: high to low</option></select>
<span class="count" id="count" aria-live="polite"></span></div></section>
<div class="grid" id="grid">{cards}</div>
<p class="card empty muted" id="empty" hidden>No websites match these filters.</p>
</main>
<script>
(function () {{
  var grid = document.getElementById('grid'), cards = [].slice.call(grid.children), cat = '';
  var q = document.getElementById('q'), dir = document.getElementById('dir'), sort = document.getElementById('sort');
  function apply() {{
    var text = q.value.trim().toLowerCase(), shown = 0;
    cards.forEach(function (c) {{
      var ok = (!cat || c.dataset.cat === cat) && (!dir.value || c.dataset.dir === dir.value) &&
               (!text || c.dataset.text.indexOf(text) !== -1);
      c.hidden = !ok; if (ok) shown++;
    }});
    var key = sort.value;
    cards.slice().sort(function (a, b) {{
      return key === 'asc' ? a.dataset.price - b.dataset.price : key === 'desc' ? b.dataset.price - a.dataset.price
           : a.dataset.i - b.dataset.i;
    }}).forEach(function (c) {{ grid.appendChild(c); }});
    document.getElementById('count').textContent = shown + ' available';
    document.getElementById('empty').hidden = shown !== 0;
  }}
  document.getElementById('cats').addEventListener('click', function (e) {{
    if (!e.target.dataset || e.target.dataset.cat === undefined) return;
    cat = e.target.dataset.cat;
    [].forEach.call(this.children, function (b) {{ b.classList.toggle('on', b === e.target); }});
    apply();
  }});
  q.addEventListener('input', apply); dir.addEventListener('change', apply); sort.addEventListener('change', apply);
  apply();
}})();
</script>"""
    return _shell("TRIAD SITE MARKET - One-of-one websites", INDEX_CSS, body, "")


def _detail(s: dict, spec: SiteSpec) -> str:
    tabs = "".join(f'<button class="chip{" on" if i == 0 else ""}" data-page="{p.slug}">{escape(p.title)}</button>'
                   for i, p in enumerate(spec.pages))
    pal = "".join(f'<span class="sw" title="{k}" style="background:{v}"></span>'
                  for k, v in spec.theme.palette.model_dump().items())
    t = spec.theme.typography
    base = f"../sites/{s['slug']}/"
    body = f"""<main class="wrap"><div class="layout">
<div class="card" style="overflow:hidden"><div class="bar"><div class="row" id="pages" role="tablist" aria-label="Pages">{tabs}</div>
<div class="row" id="devices"><button class="chip on" data-device="">Desktop</button><button class="chip" data-device="mobile">Mobile</button></div></div>
<div class="stage" id="stage"><iframe id="frame" title="Website preview" src="{base}index.html" sandbox="allow-same-origin"></iframe></div></div>
<aside><div><a class="back" href="../index.html">← All websites</a><span class="label" style="margin-top:14px">{escape(s["sku"])}</span>
<h1>{escape(s["title"])}</h1><p class="muted" style="margin:8px 0 0">{escape(s["tagline"])}</p></div>
<dl class="card"><div><dt class="label">Category</dt><dd>{escape(_label(s["category"]))}</dd></div>
<div><dt class="label">Style</dt><dd>{escape(_label(s["direction"]))}</dd></div>
<div><dt class="label">Pages</dt><dd>{s["pages"]}</dd></div><div><dt class="label">QC score</dt><dd>{s["quality"]}</dd></div>
<div style="grid-column:1/-1"><dt class="label">Typography</dt><dd>{escape(t.heading_font)} / {escape(t.body_font)}</dd></div>
<div style="grid-column:1/-1"><dt class="label">Palette</dt><dd style="margin-top:4px">{pal}</dd></div></dl>
<div class="card buy"><div class="p">{_money(s["price_cents"], s["currency"])}</div>
<button class="btn" style="width:100%;margin-top:14px" disabled>Purchasing opens soon</button>
<ul><li>✓ Sold to one customer only - removed from the market at purchase</li><li>✓ Free visual editor included</li>
<li>✓ Export as a static site anytime</li><li>✓ Optional AI editor subscription</li></ul>
<p class="note">This is a demo catalog. Exclusivity means TRIAD sells this specific website asset to a single buyer
under the license terms; independently created websites elsewhere may look similar.</p></div></aside>
</div></main>
<script>
(function () {{
  var frame = document.getElementById('frame'), stage = document.getElementById('stage');
  function wire(id, fn) {{
    document.getElementById(id).addEventListener('click', function (e) {{
      if (e.target.tagName !== 'BUTTON') return;
      [].forEach.call(this.children, function (b) {{ b.classList.toggle('on', b === e.target); }});
      fn(e.target.dataset);
    }});
  }}
  wire('pages', function (d) {{ frame.src = '{base}' + d.page + '.html'; }});
  wire('devices', function (d) {{ stage.className = 'stage ' + d.device; }});
}})();
</script>"""
    return _shell(f"{s['title']} · TRIAD SITE MARKET", DETAIL_CSS, body, "../")


def export(out_dir: str) -> int:
    """Generate the line-up in a private in-memory database and write the static catalog."""
    from app.bootstrap import init_db
    from app.generation.pipeline import generate
    from app.models import WebsiteStatus

    engine = create_engine("sqlite:///:memory:", future=True)
    init_db(engine)
    db = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()

    out = Path(out_dir)
    if out.exists():
        shutil.rmtree(out)
    (out / "s").mkdir(parents=True)
    sites: list[dict] = []
    for category, direction, seed in LINEUP:
        _, w = generate(db, category=category, direction=direction, seed=seed)
        if w is None or w.status != WebsiteStatus.in_review:  # failed QC or too similar: never shown
            continue
        spec = SiteSpec.model_validate(w.spec)
        sku = f"TSM-{seed}"
        info = {"slug": w.slug.rsplit("-", 1)[0] + f"-{seed}", "sku": sku, "title": w.title, "tagline": w.tagline,
                "category": category, "direction": direction, "price_cents": w.price_cents, "currency": w.currency,
                "pages": len(spec.pages), "quality": w.quality_score}
        site_dir = out / "sites" / info["slug"]
        site_dir.mkdir(parents=True)
        for page in spec.pages:
            (site_dir / f"{page.slug}.html").write_text(
                render_page(spec, page.slug, preview_banner=f"TRIAD preview · {sku}"), encoding="utf-8")
        (out / "s" / f"{info['slug']}.html").write_text(_detail(info, spec), encoding="utf-8")
        sites.append(info)
    (out / "index.html").write_text(_index(sites), encoding="utf-8")
    (out / "catalog.json").write_text(json.dumps(sites, indent=1), encoding="utf-8")
    return len(sites)
