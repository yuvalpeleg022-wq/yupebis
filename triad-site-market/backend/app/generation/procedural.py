"""Deterministic procedural implementations of each generation step.

Used when ``ai_mode=mock`` (dev/tests/CI) and as a logged last-resort fallback. Seeded,
so the same (category, direction, seed) always yields the same website.
"""

from __future__ import annotations

import random
from typing import Any

from app.generation.catalog import CATEGORIES, DIRECTIONS
from app.generation.color import contrast, shift
from app.generation.spec import SECTION_VARIANTS

PAGE_TITLES = {
    "menu": "Menu", "about": "About", "practice-areas": "Practice Areas", "team": "Team",
    "projects": "Projects", "studio": "Studio", "classes": "Classes", "pricing": "Pricing",
    "listings": "Listings", "services": "Services", "work": "Work", "product": "Product",
    "contact": "Contact", "voyages": "Voyages", "journal": "Journal",
}

# Sections that make sense on each extra page
PAGE_SECTIONS = {
    "menu": ["menu", "gallery", "testimonials"],
    "about": ["about", "stats", "team", "testimonials"],
    "practice-areas": ["services", "features", "faq"],
    "team": ["team", "about", "stats"],
    "projects": ["gallery", "features", "testimonials"],
    "studio": ["about", "team", "stats"],
    "classes": ["services", "features", "pricing"],
    "pricing": ["pricing", "faq", "testimonials"],
    "listings": ["gallery", "services", "stats"],
    "services": ["services", "features", "faq"],
    "work": ["gallery", "testimonials", "stats"],
    "product": ["features", "services", "stats"],
    "voyages": ["services", "gallery", "pricing"],
    "journal": ["about", "gallery", "testimonials"],
}

SINGULAR = {
    "restaurant": "Restaurant", "law_firm": "Law Firm", "architecture": "Architecture Studio",
    "fitness": "Fitness Studio", "real_estate": "Real Estate", "clinic": "Clinic",
    "creative_agency": "Creative Agency", "technology": "Technology", "portfolio": "Portfolio",
    "professional_services": "Professional Services", "travel": "Travel",
}

INDEX_POOL = ["features", "about", "services", "gallery", "stats", "testimonials", "team", "faq", "pricing"]


def _rng(ctx: dict[str, Any], salt: str) -> random.Random:
    return random.Random(f"{ctx['seed']}:{ctx['category']}:{ctx['direction']}:{salt}")


def brief(ctx: dict[str, Any]) -> dict[str, Any]:
    c = CATEGORIES[ctx["category"]]
    r = _rng(ctx, "brief")
    avoid = set(ctx.get("avoid_names", []))
    name = ""
    for _ in range(50):
        name = f"{r.choice(c.name_prefixes)} {r.choice(c.name_suffixes)}"
        if name not in avoid:
            break
    else:
        name = f"{name} {r.randint(2, 99)}"
    return {
        "business_name": name,
        "tagline": r.choice(c.taglines),
        "audience": f"People looking for {c.label.lower()} who value quality and trust.",
        "tone": r.choice(["warm and confident", "precise and calm", "bold and direct", "refined and quiet"]),
        "value_props": [f[0] for f in c.features],
        "location": r.choice(["Tel Aviv", "Haifa", "Jerusalem", "Herzliya", "Ramat Gan", "Be'er Sheva"]),
    }


def _pick_variant(r: random.Random, t: str, prev: dict[str, str], preferred: tuple[str, ...] = ()) -> str:
    options = [v for v in (preferred or SECTION_VARIANTS[t]) if v in SECTION_VARIANTS[t]]
    choices = [v for v in options if prev.get(t) != v] or options
    v = r.choice(choices)
    prev[t] = v
    return v


def plan(ctx: dict[str, Any]) -> dict[str, Any]:
    c = CATEGORIES[ctx["category"]]
    d = DIRECTIONS[ctx["direction"]]
    r = _rng(ctx, "plan")
    prev: dict[str, str] = {}
    pref = d.preferred_variants
    nav_v = r.choice(pref.get("navbar") or SECTION_VARIANTS["navbar"][:3])
    foot_v = r.choice(pref.get("footer") or SECTION_VARIANTS["footer"][:3])

    def pv(t: str) -> str:
        return _pick_variant(r, t, prev, pref.get(t, ()))

    def frame(middle: list[dict[str, str]]) -> list[dict[str, str]]:
        return [{"type": "navbar", "variant": nav_v}, *middle, {"type": "footer", "variant": foot_v}]

    pool = INDEX_POOL[:]
    r.shuffle(pool)
    mid = pool[: r.randint(4, 6)]
    if c.special_section and c.special_section not in mid:
        mid.insert(r.randint(0, 2), c.special_section)
    index_sections = [{"type": "hero", "variant": _pick_variant(r, "hero", prev, d.hero_variants)}]
    index_sections += [{"type": t, "variant": pv(t)} for t in mid]
    index_sections.append({"type": "cta", "variant": pv("cta")})

    pages = [{"slug": "index", "title": "Home", "description": "", "sections": frame(index_sections)}]
    for slug in c.extra_pages:
        secs = [{"type": "hero", "variant": "stacked"}]
        secs += [{"type": t, "variant": pv(t)} for t in PAGE_SECTIONS[slug][: r.randint(2, 3)]]
        secs.append({"type": "cta", "variant": pv("cta")})
        pages.append({"slug": slug, "title": PAGE_TITLES[slug], "description": "", "sections": frame(secs)})
    pages.append({
        "slug": "contact", "title": "Contact", "description": "",
        "sections": frame([
            {"type": "hero", "variant": "stacked"},
            {"type": "contact", "variant": _pick_variant(r, "contact", prev)},
            {"type": "faq", "variant": _pick_variant(r, "faq", prev)},
        ]),
    })
    return {"pages": pages}


def visual(ctx: dict[str, Any]) -> dict[str, Any]:
    d = DIRECTIONS[ctx["direction"]]
    r = _rng(ctx, "visual")
    base = dict(r.choice(d.palettes))
    # Controlled variation: shift primary/accent hue slightly; keep only if contrast holds.
    hue = r.uniform(-18, 18)
    cand_primary = shift(base["primary"], hue_deg=hue, sat=r.uniform(-0.05, 0.05))
    if contrast(cand_primary, base["on_primary"]) >= 4.5:
        base["primary"] = cand_primary
    base["accent"] = shift(base["accent"], hue_deg=r.uniform(-25, 25))
    heading = r.choice(d.heading_fonts)
    body = r.choice([f for f in d.body_fonts if f != heading] or d.body_fonts)
    return {
        "palette": base,
        "typography": {
            "heading_font": heading,
            "body_font": body,
            "heading_weight": r.choice(d.heading_weights),
            "scale": round(r.uniform(1.2, 1.42), 3),
            "heading_case": "uppercase" if d.uppercase_headings else "none",
            "letter_spacing": 0.06 if d.uppercase_headings else round(r.uniform(-0.035 if d.mono_fonts else -0.02, 0.0), 3),
            **({"mono_font": r.choice(d.mono_fonts)} if d.mono_fonts else {}),
        },
        "radius_px": r.randint(*d.radius_range),
        "spacing": r.choice(d.spacing),
        "max_width_px": r.choice(d.max_width),
        "button_style": r.choice(d.button_styles),
        "image_treatment": r.choice(d.image_treatments),
        **({"effects": list(d.effects)} if d.effects else {}),
    }


def page_copy(ctx: dict[str, Any]) -> dict[str, Any]:
    c = CATEGORIES[ctx["category"]]
    b = ctx["brief"]
    page = ctx["page"]
    pages = ctx["pages"]
    r = _rng(ctx, "copy:" + page["slug"])
    name = b["business_name"]
    out = []
    for s in page["sections"]:
        t = s["type"]
        sec: dict[str, Any] = {"eyebrow": "", "heading": "", "body": "", "items": [], "links": []}
        if t == "navbar":
            sec["heading"] = name
            sec["links"] = [{"label": p["title"], "href": "index.html" if p["slug"] == "index" else f"{p['slug']}.html"}
                            for p in pages]
        elif t == "hero":
            if page["slug"] == "index":
                vp = [v if v[1:2].isupper() or not v else v[0].lower() + v[1:] for v in b["value_props"]]
                sec.update(eyebrow=f"{b['location']} · {SINGULAR.get(c.key, c.label)}",
                           heading=b["tagline"],
                           body=f"{name} brings {b['tone']} expertise to every client: "
                                f"{vp[0]}, {vp[1]} and {vp[2]}.")
            else:
                sec.update(eyebrow=name, heading=page["title"],
                           body=f"Everything you need to know about {page['title'].lower()} at {name}.")
            sec["links"] = [{"label": r.choice(["Get in touch", "Book now", "Start a project", "Contact us"]),
                             "href": "contact.html"}]
        elif t in ("services",):
            sec.update(eyebrow="What we do", heading=r.choice(["Services", "How we help", "Our expertise"]),
                       items=[{"title": a, "text": bb} for a, bb in c.services])
        elif t == "features":
            sec.update(eyebrow="Why us", heading=f"Why clients choose {name}",
                       items=[{"title": a, "text": bb} for a, bb in c.features])
        elif t == "about":
            sec.update(eyebrow="Our story", heading=f"About {name}",
                       body=f"Founded in {b['location']}, {name} was built on a simple belief: {b['tagline'].lower()} "
                            f"Today our team serves {b['audience'].lower()}",
                       items=[{"title": str(2008 + i * 5), "text": txt} for i, txt in
                              enumerate(["The beginning", "Growing the team", "A new home", "Today"])])
        elif t == "menu":
            sec.update(eyebrow="Seasonal menu", heading="Tonight's menu",
                       items=[{"title": a, "text": bb, "meta": f"₪{p}"} for a, bb, p in c.menu])
        elif t == "gallery":
            sec.update(eyebrow="Selected work", heading=r.choice(["Gallery", "A closer look", "Moments"]),
                       items=[{"title": f"{SINGULAR.get(c.key, c.label)} view {i + 1}"} for i in range(6)])
        elif t == "stats":
            sec.update(heading="By the numbers", items=[{"title": a, "text": bb} for a, bb in c.stats])
        elif t == "testimonials":
            sec.update(eyebrow="Kind words", heading="What people say",
                       items=[{"text": q, "title": n, "meta": role} for q, n, role in c.testimonials])
        elif t == "team":
            first = ["Dana", "Yoav", "Michal", "Ori", "Tali", "Assaf"]
            roles = ["Founder", "Partner", "Lead", "Senior Associate", "Director", "Specialist"]
            sec.update(eyebrow="People", heading="Meet the team",
                       items=[{"title": f"{first[i]} {chr(65 + r.randint(0, 25))}.", "meta": roles[i],
                               "text": "Brings years of hands-on experience and a calm, practical approach."}
                              for i in range(r.randint(3, 4))])
        elif t == "faq":
            sec.update(eyebrow="FAQ", heading="Questions, answered", items=[{"title": q, "text": a} for q, a in c.faqs])
        elif t == "pricing":
            sec.update(eyebrow="Pricing", heading="Simple, transparent plans",
                       items=[{"title": "Essential", "meta": "₪290 / mo", "text": "The core service, done properly."},
                              {"title": "Plus", "meta": "₪590 / mo", "text": "More time, more support, priority booking."},
                              {"title": "Premium", "meta": "Custom", "text": "A dedicated team and tailored scope."}])
        elif t == "cta":
            sec.update(heading=r.choice(["Ready when you are.", "Let's talk.", f"Visit {name}."]),
                       body="Tell us what you need and we'll get back to you within one business day.",
                       links=[{"label": "Contact us", "href": "contact.html"}])
        elif t == "contact":
            slug = name.lower().replace(" ", "").replace("&", "and")[:24]
            sec.update(eyebrow="Contact", heading="Get in touch",
                       body="Send us a message and we'll reply within one business day.",
                       items=[{"title": "Email", "text": f"hello@{slug}.example.com"},
                              {"title": "Phone", "text": "+972-3-000-0000"},
                              {"title": "Address", "text": f"12 Example St., {b['location']}"}])
        elif t == "footer":
            sec.update(heading=name, body=b["tagline"],
                       links=[{"label": p["title"], "href": "index.html" if p["slug"] == "index" else f"{p['slug']}.html"}
                              for p in pages])
        out.append(sec)
    return {"sections": out}
