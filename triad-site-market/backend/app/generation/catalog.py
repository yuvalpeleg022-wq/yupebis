"""Category knowledge and design directions used by the generation engine.

This is the offline knowledge base: it seeds AI prompts in live mode and drives the
deterministic procedural generator in mock mode (development, tests, CI).
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Category:
    key: str
    label: str
    name_prefixes: tuple[str, ...]
    name_suffixes: tuple[str, ...]
    taglines: tuple[str, ...]
    services: tuple[tuple[str, str], ...]
    features: tuple[tuple[str, str], ...]
    stats: tuple[tuple[str, str], ...]
    testimonials: tuple[tuple[str, str, str], ...]  # quote, name, role
    faqs: tuple[tuple[str, str], ...]
    extra_pages: tuple[str, ...]  # pages beyond index/contact
    special_section: str | None = None  # e.g. "menu" for restaurants
    menu: tuple[tuple[str, str, str], ...] = field(default_factory=tuple)
    base_price_cents: int = 149_000


CATEGORIES: dict[str, Category] = {
    c.key: c
    for c in [
        Category(
            key="restaurant",
            label="Restaurants",
            name_prefixes=("Olive", "Ember", "Saffron", "Harbor", "Fig", "Copper", "Salt"),
            name_suffixes=("& Vine", "Kitchen", "Table", "House", "Bistro", "Hearth"),
            taglines=(
                "Seasonal cooking, open fire, long tables.",
                "A neighborhood kitchen with a coastal soul.",
                "Market-driven plates and natural wines.",
            ),
            services=(
                ("Private dining", "An intimate room for up to 18 guests with a dedicated tasting menu."),
                ("Catering", "Our kitchen, brought to your celebration - from canapés to full service."),
                ("Chef's counter", "Eight seats facing the open fire. Watch every course come to life."),
            ),
            features=(
                ("Local sourcing", "Produce from farms within 80 km, delivered every morning."),
                ("Wood-fired", "Everything passes through our custom-built oak and olive-wood oven."),
                ("Natural wine", "A list of 120 low-intervention bottles, curated monthly."),
            ),
            stats=(("12", "years on the corner"), ("80km", "sourcing radius"), ("120", "wines by the bottle")),
            testimonials=(
                ("The roasted cauliflower alone is worth crossing the city for.", "Maya L.", "Food writer"),
                ("Warm, generous, and never pretentious. Our new Friday ritual.", "Daniel R.", "Regular guest"),
                ("They hosted our wedding dinner flawlessly.", "Noa & Eitan", "Private event"),
            ),
            faqs=(
                ("Do you take reservations?", "Yes - book online up to 30 days ahead. We keep the bar for walk-ins."),
                ("Do you cater to dietary needs?", "Every dish can be adapted for vegetarian, vegan or gluten-free guests."),
                ("Is there parking?", "Street parking and a public lot two minutes away."),
            ),
            extra_pages=("menu", "about"),
            special_section="menu",
            menu=(
                ("Charred leeks", "smoked labneh, hazelnut dukkah", "38"),
                ("Sea bream crudo", "citrus, chili oil, wild herbs", "56"),
                ("Fire-roasted cauliflower", "tahini, pomegranate, sumac", "44"),
                ("Lamb shoulder", "slow-cooked 12 hours, freekeh, yogurt", "112"),
                ("Grilled catch of the day", "brown butter, capers, lemon", "98"),
                ("Olive oil cake", "crème fraîche, roasted figs", "36"),
            ),
            base_price_cents=129_000,
        ),
        Category(
            key="law_firm",
            label="Law Firms",
            name_prefixes=("Halevi", "Sterling", "Barak", "Whitmore", "Aldridge", "Kessler"),
            name_suffixes=("& Partners", "Law", "Legal", "Advocates", "Chambers"),
            taglines=(
                "Clear counsel for complex matters.",
                "Litigation and advisory for businesses that build.",
                "Precise. Discreet. Relentless when it matters.",
            ),
            services=(
                ("Corporate & M&A", "Structuring, due diligence and negotiation for transactions of every size."),
                ("Commercial litigation", "Strategic representation in courts and arbitration."),
                ("Real estate", "Acquisitions, development agreements and zoning matters."),
                ("Employment", "Advisory and disputes for employers and executives."),
            ),
            features=(
                ("Partner-led", "Every matter is handled personally by a senior partner."),
                ("Fixed-fee options", "Transparent pricing for defined scopes of work."),
                ("Bilingual team", "Fluent counsel in Hebrew, English and French."),
            ),
            stats=(("25+", "years of practice"), ("600", "transactions closed"), ("94%", "client retention")),
            testimonials=(
                ("They saw the risk three steps before anyone else at the table.", "Ron A.", "CEO, logistics group"),
                ("Calm, sharp and fully available when the stakes were highest.", "Tamar S.", "Founder"),
            ),
            faqs=(
                ("How does the first consultation work?", "A 45-minute meeting to understand your matter and outline options."),
                ("Do you work on retainer?", "Yes, alongside hourly and fixed-fee engagements."),
            ),
            extra_pages=("practice-areas", "team"),
            base_price_cents=189_000,
        ),
        Category(
            key="architecture",
            label="Architecture Studios",
            name_prefixes=("Atelier", "Studio", "Plane", "Field", "Mass", "Contour"),
            name_suffixes=("Architects", "Office", "Workshop", "Studio", "Practice"),
            taglines=(
                "Buildings shaped by light, climate and use.",
                "Residential and cultural architecture with restraint.",
                "We design the quiet backdrop for everyday life.",
            ),
            services=(
                ("Residential", "Private houses and renovations, from concept to completion."),
                ("Cultural & public", "Museums, libraries and civic spaces."),
                ("Interior architecture", "Spatial planning, joinery and material selection."),
            ),
            features=(
                ("Climate-first", "Passive design strategies before mechanical systems."),
                ("Full service", "Design, permitting and construction supervision."),
                ("Material honesty", "Concrete, timber, stone - detailed with care."),
            ),
            stats=(("48", "built projects"), ("9", "design awards"), ("3", "countries")),
            testimonials=(
                ("They listened for months before drawing a line. The house shows it.", "Yael & Omri", "Private residence"),
                ("A rare studio that is both poetic and practical.", "Municipal arts dept.", "Public client"),
            ),
            faqs=(
                ("When should we involve an architect?", "Before you buy land or commit to a renovation scope."),
                ("How are fees structured?", "As a percentage of construction cost or a fixed fee per phase."),
            ),
            extra_pages=("projects", "studio"),
            base_price_cents=169_000,
        ),
        Category(
            key="fitness",
            label="Fitness",
            name_prefixes=("Pulse", "Forge", "Kinetic", "Apex", "Iron", "Flow"),
            name_suffixes=("Studio", "Lab", "Club", "Athletics", "Collective"),
            taglines=(
                "Strength training that fits real life.",
                "Small-group coaching. Big results.",
                "Move better, feel stronger, every week.",
            ),
            services=(
                ("Personal training", "One-on-one programming built around your goals and history."),
                ("Small-group classes", "Max eight people. Coached, never crowded."),
                ("Nutrition coaching", "Practical habits, not crash diets."),
            ),
            features=(
                ("Assessment first", "Every member starts with a movement and strength assessment."),
                ("Progress tracking", "Monthly check-ins with measurable benchmarks."),
                ("Open 5am-11pm", "Train on your schedule, seven days a week."),
            ),
            stats=(("1,200", "active members"), ("8", "max class size"), ("18", "certified coaches")),
            testimonials=(
                ("I deadlifted my bodyweight at 52. Never thought I would.", "Irit K.", "Member since 2022"),
                ("The coaches actually know your name and your knee injury.", "Gal M.", "Member"),
            ),
            faqs=(
                ("I'm a total beginner - is that okay?", "Absolutely. Most members start with no experience."),
                ("Can I freeze my membership?", "Yes, up to two months per year."),
            ),
            extra_pages=("classes", "pricing"),
            base_price_cents=119_000,
        ),
        Category(
            key="real_estate",
            label="Real Estate",
            name_prefixes=("Meridian", "Keystone", "Crest", "Haven", "Northgate", "Urban"),
            name_suffixes=("Realty", "Properties", "Estates", "Homes", "Group"),
            taglines=(
                "Homes found with patience and local insight.",
                "Boutique brokerage for exceptional properties.",
                "Buy, sell and invest with clarity.",
            ),
            services=(
                ("Buying", "Off-market access and honest guidance from search to keys."),
                ("Selling", "Professional staging, photography and targeted marketing."),
                ("Investment advisory", "Yield analysis and portfolio strategy."),
            ),
            features=(
                ("Neighborhood experts", "Agents who live where they sell."),
                ("Data-backed pricing", "Valuations grounded in recent comparable sales."),
                ("Concierge closing", "Lawyers, mortgage and movers coordinated for you."),
            ),
            stats=(("₪2.1B", "in sales"), ("31", "days avg. on market"), ("850", "families moved")),
            testimonials=(
                ("Sold above asking in 19 days, with zero stress.", "The Cohen family", "Sellers"),
                ("They talked us out of the wrong apartment. Then found the right one.", "Lior & Dana", "Buyers"),
            ),
            faqs=(
                ("What is your commission?", "Competitive and transparent, agreed in writing before listing."),
                ("Do you handle rentals?", "Yes, for long-term residential leases."),
            ),
            extra_pages=("listings", "about"),
            base_price_cents=159_000,
        ),
        Category(
            key="clinic",
            label="Clinics",
            name_prefixes=("Clear", "Vital", "Cedar", "Harmony", "Bright", "Lumen"),
            name_suffixes=("Clinic", "Health", "Medical", "Care", "Dental"),
            taglines=(
                "Modern care with time to listen.",
                "Family medicine and specialist care under one roof.",
                "Gentle, evidence-based treatment.",
            ),
            services=(
                ("General practice", "Preventive care, check-ups and chronic condition management."),
                ("Physiotherapy", "Rehabilitation programs for injury and post-surgery recovery."),
                ("Dermatology", "Medical and cosmetic skin care by board-certified specialists."),
            ),
            features=(
                ("Same-week appointments", "Book online and be seen within days, not months."),
                ("Digital records", "Results and prescriptions in a secure patient portal."),
                ("Accessible facility", "Step-free access and parking at the entrance."),
            ),
            stats=(("15", "specialists"), ("4.9", "patient rating"), ("20k", "visits per year")),
            testimonials=(
                ("The first doctor who actually explained my results.", "Shira B.", "Patient"),
                ("Efficient, kind, and on time. Rare combination.", "Avi T.", "Patient"),
            ),
            faqs=(
                ("Do you accept health insurance?", "We work with all major health funds and private insurers."),
                ("Can I book online?", "Yes, through our patient portal 24/7."),
            ),
            extra_pages=("services", "team"),
            base_price_cents=149_000,
        ),
        Category(
            key="creative_agency",
            label="Creative Agencies",
            name_prefixes=("Bold", "Northern", "Paper", "Signal", "Mono", "Wild"),
            name_suffixes=("Studio", "Agency", "Co.", "Collective", "Works"),
            taglines=(
                "Brands with a point of view.",
                "Strategy, identity and campaigns that get noticed.",
                "We make ambitious companies impossible to ignore.",
            ),
            services=(
                ("Brand strategy", "Positioning, naming and narrative that sharpen what you stand for."),
                ("Visual identity", "Logos, systems and guidelines built to scale."),
                ("Campaigns", "Integrated creative across digital, print and outdoor."),
                ("Digital products", "Websites and apps designed around real users."),
            ),
            features=(
                ("Small senior team", "No hand-offs to juniors. You work with the people who pitch."),
                ("Research-driven", "Every concept starts with customer insight."),
                ("Built to ship", "Production-ready files, not just presentations."),
            ),
            stats=(("140", "brands launched"), ("22", "industry awards"), ("11", "people")),
            testimonials=(
                ("Our rebrand doubled inbound leads in a quarter.", "Michal G.", "CMO, fintech"),
                ("They pushed us out of our comfort zone - in the best way.", "Yoni P.", "Founder"),
            ),
            faqs=(
                ("What does a typical project cost?", "Identity projects start around ₪60k; we scope every project."),
                ("How long does a rebrand take?", "Usually 10-14 weeks from kickoff to launch."),
            ),
            extra_pages=("work", "studio"),
            base_price_cents=179_000,
        ),
        Category(
            key="technology",
            label="Technology Companies",
            name_prefixes=("Nimbus", "Quanta", "Vector", "Helix", "Orbit", "Stack"),
            name_suffixes=("Labs", "AI", "Systems", "Cloud", "io"),
            taglines=(
                "Infrastructure that scales with your ambition.",
                "Turn operational data into decisions in real time.",
                "Security automation for modern engineering teams.",
            ),
            services=(
                ("Platform", "A unified API for ingestion, processing and analytics."),
                ("Integrations", "Connect 200+ tools in minutes with no code."),
                ("Enterprise", "SSO, audit logs, dedicated support and custom SLAs."),
            ),
            features=(
                ("Real-time", "Sub-second latency from event to dashboard."),
                ("SOC 2 Type II", "Independently audited security controls."),
                ("Developer-first", "Typed SDKs, great docs and a generous free tier."),
            ),
            stats=(("99.99%", "uptime"), ("3B", "events per day"), ("1,500", "teams")),
            testimonials=(
                ("We replaced three internal tools in a single sprint.", "Eran D.", "VP Engineering"),
                ("Onboarding took an afternoon. ROI took a month.", "Rachel F.", "Head of Data"),
            ),
            faqs=(
                ("Is there a free tier?", "Yes - up to 1M events per month, forever."),
                ("Where is data hosted?", "EU and US regions, with data residency options."),
            ),
            extra_pages=("product", "pricing"),
            base_price_cents=199_000,
        ),
        Category(
            key="portfolio",
            label="Portfolios",
            name_prefixes=("Noa", "Ari", "Lia", "Tom", "Eli", "Rina"),
            name_suffixes=("Levin", "Mor", "Shani", "Adler", "Ben-Ami", "Katz"),
            taglines=(
                "Product designer crafting calm interfaces.",
                "Photographer of people, places and quiet moments.",
                "Illustrator and visual storyteller.",
            ),
            services=(
                ("Product design", "End-to-end UX and UI for web and mobile products."),
                ("Art direction", "Visual concepts for brands and editorial."),
                ("Workshops", "Design thinking sessions for teams."),
            ),
            features=(
                ("10 years", "of experience with startups and global brands."),
                ("Remote friendly", "Working with clients across time zones."),
                ("Selective", "A handful of projects per year for full focus."),
            ),
            stats=(("60+", "projects"), ("14", "countries"), ("5", "awards")),
            testimonials=(
                ("A designer who thinks like a product manager.", "Itay S.", "CPO"),
                ("Delivered beyond the brief, on time.", "Studio Ora", "Client"),
            ),
            faqs=(
                ("Are you available for freelance?", "Booking projects starting next quarter."),
                ("What's your process?", "Discovery, concepts, iteration, delivery - with weekly check-ins."),
            ),
            extra_pages=("work", "about"),
            base_price_cents=89_000,
        ),
        Category(
            key="professional_services",
            label="Professional Services",
            name_prefixes=("Summit", "Clarity", "Ledger", "Beacon", "Pillar", "Anchor"),
            name_suffixes=("Advisory", "Consulting", "Partners", "Group", "Accounting"),
            taglines=(
                "Financial clarity for growing businesses.",
                "Operational consulting that delivers measurable change.",
                "Trusted advisors for founders and family businesses.",
            ),
            services=(
                ("Accounting & tax", "Bookkeeping, annual reports and tax planning."),
                ("CFO services", "Fractional finance leadership for scaling companies."),
                ("Business consulting", "Process, pricing and growth strategy."),
            ),
            features=(
                ("Dedicated advisor", "One point of contact who knows your business."),
                ("Monthly reporting", "Clear dashboards, not spreadsheets."),
                ("Proactive", "We flag opportunities before deadlines."),
            ),
            stats=(("400", "clients"), ("18", "years"), ("₪30M", "saved in taxes")),
            testimonials=(
                ("Finally, numbers I understand and trust.", "Hila N.", "Owner, retail chain"),
                ("Their CFO service got us investor-ready in six weeks.", "Amit K.", "Co-founder"),
            ),
            faqs=(
                ("Do you work with startups?", "Yes - from incorporation to Series B."),
                ("How do you charge?", "Fixed monthly packages based on scope."),
            ),
            extra_pages=("services", "about"),
            base_price_cents=139_000,
        ),
        Category(
            key="travel",
            label="Travel & Experiences",
            name_prefixes=("Halcyon", "Meridian", "Aurora", "Polaris", "Drift", "Solstice"),
            name_suffixes=("Voyages", "Expeditions", "Journeys", "Retreats", "Travel"),
            taglines=(
                "Slow journeys to the edges of the map.",
                "Small-group expeditions, designed around one unforgettable view.",
                "Quiet luxury, far from everything.",
            ),
            services=(
                ("Signature expeditions", "Ten to fourteen days, twelve guests, one carefully planned route."),
                ("Private charters", "The whole itinerary, reshaped around your group."),
                ("Weekend escapes", "Three nights, fully hosted, close enough to leave on Thursday."),
            ),
            features=(
                ("Twelve guests, max", "Every departure is small enough to know everyone by name."),
                ("Expert hosts", "Naturalists, photographers and local guides travel with you."),
                ("Carbon accounted", "Every journey is measured and offset through verified projects."),
            ),
            stats=(("12", "guests per departure"), ("38", "destinations"), ("4.9", "guest rating")),
            testimonials=(
                ("The most restful two weeks of my life, and the most astonishing.", "Ruth A.", "Guest, 2026"),
                ("Every detail was handled before we thought of it.", "Ilan & Maya", "Private charter"),
            ),
            faqs=(
                ("How fit do I need to be?", "Most journeys suit anyone comfortable walking a few kilometers a day."),
                ("What is included?", "Accommodation, meals, guides and all transfers during the journey."),
            ),
            extra_pages=("voyages", "journal"),
            base_price_cents=179_000,
        ),
    ]
}


@dataclass(frozen=True)
class DesignDirection:
    key: str
    label: str
    heading_fonts: tuple[str, ...]
    body_fonts: tuple[str, ...]
    palettes: tuple[dict[str, str], ...]
    radius_range: tuple[int, int]
    spacing: tuple[str, ...]
    button_styles: tuple[str, ...]
    image_treatments: tuple[str, ...]
    heading_weights: tuple[int, ...]
    uppercase_headings: bool
    hero_variants: tuple[str, ...]
    max_width: tuple[int, ...]
    price_multiplier: float = 1.0
    mono_fonts: tuple[str, ...] = ()
    effects: tuple[str, ...] = ()
    art_styles: tuple[str, ...] = ("circles", "bands", "blocks", "arcs")
    preferred_variants: dict[str, tuple[str, ...]] = field(default_factory=dict)


def _p(bg, surface, text, muted, primary, on_primary, accent) -> dict[str, str]:
    return dict(
        background=bg, surface=surface, text=text, muted=muted,
        primary=primary, on_primary=on_primary, accent=accent,
    )


DIRECTIONS: dict[str, DesignDirection] = {
    d.key: d
    for d in [
        DesignDirection(
            key="minimalist",
            label="Minimalist",
            heading_fonts=("Inter", "Manrope", "DM Sans"),
            body_fonts=("Inter", "DM Sans", "IBM Plex Sans"),
            palettes=(
                _p("#ffffff", "#f5f5f4", "#18181b", "#52525b", "#18181b", "#ffffff", "#2563eb"),
                _p("#fafaf9", "#f0efeb", "#1c1917", "#57534e", "#3f6212", "#ffffff", "#ca8a04"),
                _p("#ffffff", "#f1f5f9", "#0f172a", "#475569", "#0f766e", "#ffffff", "#e11d48"),
            ),
            radius_range=(0, 8),
            spacing=("airy", "comfortable"),
            button_styles=("solid", "underline", "outline"),
            image_treatments=("none", "grayscale"),
            heading_weights=(500, 600),
            uppercase_headings=False,
            hero_variants=("centered", "split", "stacked"),
            max_width=(1080, 1200),
        ),
        DesignDirection(
            key="luxury",
            label="Luxury",
            heading_fonts=("Cormorant Garamond", "Playfair Display", "Bodoni Moda"),
            body_fonts=("Lato", "Jost", "Montserrat"),
            palettes=(
                _p("#0c0a09", "#1c1917", "#f5f5f4", "#a8a29e", "#c8a96a", "#0c0a09", "#e7d7b1"),
                _p("#f7f3ec", "#efe7da", "#231f1a", "#6b6155", "#6b4f2a", "#ffffff", "#a17a3d"),
                _p("#0f1a17", "#16241f", "#eef2ef", "#9fb3aa", "#b89b5e", "#0f1a17", "#d9c48f"),
            ),
            radius_range=(0, 2),
            spacing=("airy",),
            button_styles=("outline", "underline"),
            image_treatments=("framed", "none"),
            heading_weights=(400, 500),
            uppercase_headings=True,
            hero_variants=("fullbleed", "centered"),
            max_width=(1200, 1320),
            price_multiplier=1.25,
        ),
        DesignDirection(
            key="editorial",
            label="Editorial",
            heading_fonts=("Fraunces", "Newsreader", "Libre Caslon Text"),
            body_fonts=("Source Serif 4", "Inter", "Libre Franklin"),
            palettes=(
                _p("#fbf8f1", "#f1ebdd", "#1a1a1a", "#5c5850", "#b3261e", "#ffffff", "#1d4ed8"),
                _p("#ffffff", "#f3f0ea", "#111111", "#555555", "#111111", "#ffffff", "#f97316"),
                _p("#f4f1ea", "#e8e2d4", "#202124", "#5f6368", "#1f4e3d", "#ffffff", "#c2410c"),
            ),
            radius_range=(0, 4),
            spacing=("comfortable", "airy"),
            button_styles=("underline", "solid"),
            image_treatments=("none", "grayscale", "duotone"),
            heading_weights=(600, 700, 800),
            uppercase_headings=False,
            hero_variants=("editorial", "split", "stacked"),
            max_width=(1160, 1280),
        ),
        DesignDirection(
            key="futuristic",
            label="Futuristic",
            heading_fonts=("Space Grotesk", "Sora", "Orbitron"),
            body_fonts=("Inter", "Space Grotesk", "Sora"),
            palettes=(
                _p("#05060a", "#0e1220", "#e6f1ff", "#8b9bb4", "#22d3ee", "#05060a", "#a855f7"),
                _p("#0a0a12", "#141428", "#f0f0ff", "#9a9ac0", "#7c3aed", "#ffffff", "#34d399"),
                _p("#020617", "#0f172a", "#e2e8f0", "#94a3b8", "#4ade80", "#020617", "#f472b6"),
            ),
            radius_range=(10, 24),
            spacing=("comfortable",),
            button_styles=("pill", "solid"),
            image_treatments=("duotone", "rounded"),
            heading_weights=(600, 700),
            uppercase_headings=False,
            hero_variants=("centered", "fullbleed", "split"),
            max_width=(1200, 1280),
            price_multiplier=1.1,
        ),
        DesignDirection(
            key="corporate",
            label="Corporate",
            heading_fonts=("IBM Plex Sans", "Source Sans 3", "Work Sans"),
            body_fonts=("IBM Plex Sans", "Source Sans 3", "Open Sans"),
            palettes=(
                _p("#ffffff", "#f3f6fb", "#0b1f3a", "#4a5b73", "#0b5cad", "#ffffff", "#f59e0b"),
                _p("#ffffff", "#f4f6f5", "#12261e", "#4b5d55", "#1f6f4a", "#ffffff", "#2563eb"),
                _p("#f8fafc", "#eef2f7", "#111827", "#4b5563", "#1e3a8a", "#ffffff", "#dc2626"),
            ),
            radius_range=(4, 10),
            spacing=("comfortable", "compact"),
            button_styles=("solid", "outline"),
            image_treatments=("rounded", "none"),
            heading_weights=(600, 700),
            uppercase_headings=False,
            hero_variants=("split", "stacked", "centered"),
            max_width=(1140, 1240),
        ),
        DesignDirection(
            key="cinematic",
            label="Cinematic",
            heading_fonts=("Bebas Neue", "Oswald", "Anton"),
            body_fonts=("Inter", "Barlow", "Archivo"),
            palettes=(
                _p("#0b0b0b", "#161616", "#f2f2f2", "#9e9e9e", "#e50914", "#ffffff", "#f5c518"),
                _p("#0d1117", "#161b22", "#f0f6fc", "#8b949e", "#f97316", "#0d1117", "#38bdf8"),
                _p("#120c08", "#1f1510", "#fbeee0", "#b8a08a", "#e0a458", "#120c08", "#d1495b"),
            ),
            radius_range=(0, 6),
            spacing=("airy", "comfortable"),
            button_styles=("solid", "outline"),
            image_treatments=("duotone", "none"),
            heading_weights=(400, 700),
            uppercase_headings=True,
            hero_variants=("fullbleed", "editorial"),
            max_width=(1280, 1440),
            price_multiplier=1.15,
        ),
        # Inspired by cinematic "space porthole" heroes: near-black, light display type with a
        # dimmed second line, mono telemetry labels, panoramic framed imagery, pill buttons.
        DesignDirection(
            key="orbital",
            label="Orbital",
            heading_fonts=("Geist", "Inter Tight", "Manrope"),
            body_fonts=("Geist", "Inter", "Manrope"),
            palettes=(
                _p("#050607", "#0d0f11", "#eef0f2", "#8f9398", "#eef0f2", "#050607", "#e0703a"),
                _p("#04060a", "#0b0f16", "#edf1f7", "#8a93a3", "#edf1f7", "#04060a", "#7cc4ff"),
                _p("#070605", "#100e0c", "#f2efe9", "#97918a", "#f2efe9", "#070605", "#e8b04a"),
            ),
            radius_range=(14, 28),
            spacing=("airy",),
            button_styles=("pill",),
            image_treatments=("rounded", "none"),
            heading_weights=(300, 400),
            uppercase_headings=False,
            hero_variants=("porthole",),
            max_width=(1280, 1360),
            price_multiplier=1.3,
            mono_fonts=("Geist Mono", "JetBrains Mono", "IBM Plex Mono"),
            effects=("rise_in", "pulse_dot", "glow", "mono_labels"),
            art_styles=("planet",),
            preferred_variants={"navbar": ("split", "inline"), "footer": ("telemetry",),
                                "stats": ("ticker", "row"), "cta": ("minimal", "split")},
        ),
        # Inspired by deep-sea tech landing pages: abyss black with a luminous tide accent,
        # floating glass navigation, hairline grids with mono micro-labels, dot-matrix art.
        DesignDirection(
            key="abyssal",
            label="Abyssal",
            heading_fonts=("Funnel Display", "Space Grotesk", "Sora"),
            body_fonts=("Funnel Sans", "Inter", "DM Sans"),
            palettes=(
                _p("#06090c", "#0d1419", "#f2f4f3", "#8e969e", "#12c2d6", "#04161a", "#b8fff1"),
                _p("#05080b", "#0c1317", "#eef5f3", "#8b979a", "#2dd4bf", "#03201c", "#a7f3d0"),
                _p("#07070d", "#10101a", "#f1f1f6", "#9191a3", "#8b7cf6", "#0b0820", "#c4b5fd"),
            ),
            radius_range=(2, 12),
            spacing=("comfortable", "airy"),
            button_styles=("solid",),
            image_treatments=("none", "rounded"),
            heading_weights=(500, 600),
            uppercase_headings=False,
            hero_variants=("immersive", "porthole"),
            max_width=(1200, 1320),
            price_multiplier=1.3,
            mono_fonts=("Martian Mono", "Space Mono", "JetBrains Mono"),
            effects=("rise_in", "grid_lines", "glass_nav", "mono_labels", "dot_matrix"),
            art_styles=("depth", "dotmatrix"),
            preferred_variants={"navbar": ("floating",), "footer": ("telemetry", "columns"),
                                "stats": ("ticker",), "cta": ("block",)},
        ),
    ]
}
