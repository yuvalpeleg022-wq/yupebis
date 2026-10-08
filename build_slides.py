#!/usr/bin/env python3
"""
Avengers: Doomsday — Ultra-Premium 4K PDF Presentation
All confirmed cast, plot leaks, rumors. Max-detail Pillow rendering.
"""
import sys, os, math
sys.path.insert(0, '/home/user/yupebis')
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance
from gfx import *
from reportlab.pdfgen import canvas as rlcanvas

OUT_PDF = '/home/user/yupebis/avengers_doomsday.pdf'
OUT_DIR = '/tmp/av_slides'
os.makedirs(OUT_DIR, exist_ok=True)

# ── SLIDE BASE ────────────────────────────────────────────────────────────────
def base_slide(accent=COPPER, with_depth=False, with_starfield=True,
               with_pedestal=False, with_hex=False, with_circuit=False,
               with_border=False, with_vignette=True):
    img = new_slide()
    bg_black(img)
    if with_starfield:
        starfield(img, 180)
    if with_hex:
        hex_grid(img, accent, alpha=16)
    if with_circuit:
        circuit_lines(img, accent, alpha=14)
    floor_glow(img, accent)
    light_beams(img, accent)
    if with_depth:
        depth_panels(img, accent)
    if with_pedestal:
        pedestal_ring(img, color=accent)
    if with_border:
        doom_rune_border(img, accent)
    if with_vignette:
        gradient_vignette(img, strength=100)
    scan_lines(img, alpha=5)
    return img

# ── SLIDE 01 — TITLE ──────────────────────────────────────────────────────────
def make_slide_01():
    img = base_slide(COPPER, with_pedestal=True, with_hex=True, with_border=True)
    d = draw(img)

    # Marvel Studios bar at very top
    marvel_logo_bar(img, y=0)

    # Atmosphere halos
    radial_halo(img, W//2, int(H*0.38), 1600, 1050, AMBER, max_alpha=100)
    radial_halo(img, W//2, int(H*0.38), 900, 580, GLOW_ORG, max_alpha=70)
    radial_halo(img, W//2, int(H*0.38), 500, 320, RED_AC, max_alpha=35)

    # Doom mask center icon
    doom_mask_icon(img, W//2, int(H*0.31), size=int(220*SCALE//2), color=AMBER, eye_color=RED_AC)

    # Energy rings around mask
    for r, a in [(int(420*SCALE//2), 80), (int(500*SCALE//2), 50), (int(620*SCALE//2), 30)]:
        energy_ring(img, W//2, int(H*0.31), r, AMBER, thickness=4, dashes=30, alpha=a)

    # Doomsday title
    text_glow(img, 'AVENGERS:', W//2, int(H*0.535),
              font(80, bold=True), WHITE, AMBER, glow_radius=45, anchor='mm')
    text_glow(img, 'DOOMSDAY', W//2, int(H*0.625),
              font(100, bold=True), AMBER, COPPER, glow_radius=60, anchor='mm')

    hline(img, int(W*0.15), int(H*0.680), int(W*0.70), AMBER, 6)

    d.text((W//2, int(H*0.710)), '"The Beginning of the End of the Multiverse Saga"',
           font=font(28, italic=True), fill=CREAM, anchor='mm')

    # Side decorative panels
    for sx, label in [(int(W*0.07), 'PHASE'), (int(W*0.89), 'PHASE')]:
        glass_card(img, sx-60, int(H*0.30), 130, 280, fill=DARK2, border=COPPER, border_w=4, shadow=False)
        d.text((sx+5, int(H*0.38)), '6', font=font(60, bold=True), fill=COPPER, anchor='mm')
        d.text((sx+5, int(H*0.47)), label, font=font(16, bold=True), fill=AMBER, anchor='mm')

    # Bottom bar
    glass_card(img, 0, int(H*0.90), W, int(H*0.10), fill=(0,0,0,210), border=COPPER, border_w=4, radius=0, shadow=False)
    d.text((W//2, int(H*0.937)), 'DIRECTED BY JOE & ANTHONY RUSSO',
           font=font(22, bold=True), fill=AMBER, anchor='mm')
    d.text((W//2, int(H*0.965)), 'Marvel Studios  ·  Phase 6  ·  December 18, 2026  ·  #1 Most Anticipated Film 2026',
           font=font(18), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 02 — DOCTOR DOOM ────────────────────────────────────────────────────
def make_slide_02():
    img = base_slide(RED_AC, with_circuit=True, with_border=True)
    d = draw(img)

    marvel_logo_bar(img)

    # Deep red atmosphere
    radial_halo(img, W//2, H//2, 2200, 1400, RED_AC, max_alpha=65)
    radial_halo(img, int(W*0.28), H//2, 800, 900, AMBER, max_alpha=30)

    lw = int(W * 0.44)
    glass_card(img, 60, 90, lw, H-170, fill=(25,4,4,230), border=RED_AC, border_w=8)

    # Large Doom mask
    cx, cy = 60+lw//2, int(H*0.43)
    radial_halo(img, cx, cy, 620, 800, RED_AC, max_alpha=80)
    radial_halo(img, cx, cy, 350, 450, GLOW_ORG, max_alpha=45)
    doom_mask_icon(img, cx, cy, size=int(280*SCALE//2), color=AMBER, eye_color=RED_AC)

    # Glowing energy rings
    for r, a in [(int(480*SCALE//2), 90), (int(580*SCALE//2), 55), (int(700*SCALE//2), 28)]:
        energy_ring(img, cx, cy, r, RED_AC, thickness=5, dashes=20, alpha=a)

    # Cape (below mask)
    cape_top = cy + int(300*SCALE//2)
    d.polygon([
        (cx-int(300*SCALE//2), cape_top),
        (cx+int(300*SCALE//2), cape_top),
        (cx+int(260*SCALE//2), cy+int(750*SCALE//2)),
        (cx-int(260*SCALE//2), cy+int(750*SCALE//2))
    ], fill=(0,90,0,130), outline=(0,160,0,200), width=6)

    # Cape pins
    for px in [cx-int(220*SCALE//2), cx+int(220*SCALE//2)]:
        py = cape_top - int(20*SCALE//2)
        d.ellipse([px-int(32*SCALE//2), py-int(32*SCALE//2), px+int(32*SCALE//2), py+int(32*SCALE//2)],
                  fill=(*rgb(GOLD_AC), 240), outline=(*rgb(WHITE), 180), width=4)
        d.text((px, py), '✦', font=font(18, bold=True), fill=BLACK, anchor='mm')

    text_glow(img, 'VICTOR VON DOOM', cx, int(H*0.82), font(30, bold=True), RED_AC, RED_AC, glow_radius=18, anchor='mm')
    d.text((cx, int(H*0.87)), 'PORTRAYED BY ROBERT DOWNEY JR.', font=font(18, bold=True), fill=COPPER, anchor='mm')

    # Diagonal stripe decoration on left card
    diagonal_stripe(img, 60, 90, lw, H-170, RED_AC, alpha=8)

    # Right panel info
    rx = lw + 120
    rw = W - rx - 60

    text_glow(img, 'DOCTOR DOOM', rx + rw//2, 130, font(60, bold=True), RED_AC, AMBER, glow_radius=32, anchor='mm')
    hline(img, rx, 180, rw, RED_AC, 5)

    d.text((rx+20, 215), 'Robert Downey Jr.', font=font(28, bold=True), fill=AMBER)
    d.text((rx+20, 258), 'as Victor Von Doom — Doctor Doom', font=font(22, italic=True), fill=CREAM)

    hline(img, rx+20, 305, rw-20, COPPER, 2)

    details = [
        ('ARMOR',      'Rune-engraved metallic suit + green hooded cloak'),
        ('CAPE PINS',  'Mjölnir + Hala Star — symbols of conquered heroes'),
        ('POWERS',     'Sorcery, advanced tech, incursion energy, TVA access'),
        ('BACKSTORY',  "Wife & child killed — cause traced to Endgame's time heist"),
        ('MOTIVE',     'Rebuild the Multiverse, resurrect his dead family as God'),
        ('THREAT LVL', 'Killed Loki · Infiltrated TVA · Destroyed entire universes'),
        ('FIRST APP.',  'Revealed at SDCC July 2024 — crowd gasped in disbelief'),
    ]
    y = 340
    for label, val in details:
        glass_card(img, rx, y, rw, 82, fill=(28,4,4,210), border=RED_AC, border_w=3, shadow=False)
        badge(img, rx+16, y+16, int(rw*0.22), 50, label, RED_AC, WHITE)
        d.text((rx + int(rw*0.26), y+25), val, font=font(18), fill=CREAM)
        y += 96

    # Quote card
    glass_card(img, rx, H-230, rw, 175, fill=(18,0,0,230), border=AMBER, border_w=5)
    d.text((rx+rw//2, H-172), '"I traced the cause of their deaths… to you."',
           font=font(24, italic=True), fill=AMBER, anchor='mm')
    d.text((rx+rw//2, H-125), '— Victor Von Doom to Steve Rogers (assembly cut leak)',
           font=font(18), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 03 — THE PLOT ───────────────────────────────────────────────────────
def make_slide_03():
    img = base_slide(COPPER, with_depth=True, with_hex=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, 'THE PLOT — LEAKED ASSEMBLY CUT', W//2, 100,
              font(50, bold=True), WHITE, AMBER, glow_radius=28, anchor='mm')
    hline(img, 80, 138, W-160, AMBER, 5)

    acts = [
        ('ACT 1', 'INCURSION BEGINS', RED_AC,
         'OPENS on Tobey Maguire\'s Spider-Man vs Hugh Jackman\'s Wolverine in a collapsing '
         'alternate universe — a universe Doctor Doom has already destroyed. '
         'Earth-616, Earth-828 (Fantastic Four), and the original X-Men universe all collide. '
         'The Avengers, Fantastic Four and X-Men must unite under one impossible threat.'),
        ('ACT 2', 'THE WOLF IN SHEEP\'S CLOTHING', COPPER,
         'Doom alloys himself to Earth\'s heroes with seemingly noble intentions — claiming he can '
         'STOP the incursions. He used the TVA to manipulate events across timelines. '
         'Doom killed Loki. He secretly weaponized the heroes themselves, '
         'using their power to build the incursion cannons that destroy universe after universe. '
         'Ian McKellen\'s Magneto rules Genosha with Wanda + Pietro variants as royalty.'),
        ('ACT 3', 'DOOMSDAY — DOOM BECOMES GOD', AMBER,
         'Steve Rogers confronts Doom. Doom reveals: his wife and child were killed by the '
         'shockwave from Steve\'s time heist in Endgame (2019). '
         'Doom\'s true plan was NEVER to save the Multiverse — he ALLOWED the incursions '
         'so that he could rebuild reality in his own image as GOD OF BATTLEWORLD, '
         'then resurrect his dead family in a perfect universe. The Avengers lose.'),
    ]

    y = 160
    for act_num, act_title, color, text in acts:
        h_card = 265
        glass_card(img, 60, y, W-120, h_card, fill=(8,5,2,225), border=color, border_w=7)
        diagonal_stripe(img, 60, y, W-120, h_card, color, alpha=6)
        badge(img, 80, y+20, 180, 54, act_num, color, WHITE)
        text_glow(img, act_title, 300, y+46, font(26, bold=True), color, color, glow_radius=14, anchor='lm')
        hline(img, 80, y+86, W-160, color, 2)
        multiline_text(img, text, 80, y+104, font(20), CREAM, W-200, line_h_mul=1.42)
        y += h_card + 22

    # Bottom stat callouts
    calls = [
        ('3', 'UNIVERSES COLLIDE', AMBER),
        ('1', 'VILLAIN TO RULE THEM ALL', RED_AC),
        ('BATTLEWORLD', "DOOM'S REBUILT MULTIVERSE", COPPER),
    ]
    cw = (W-200)//3
    cy2 = y + 8
    for i, (num, lbl, col) in enumerate(calls):
        cx2 = 100 + i*(cw+40)
        glass_card(img, cx2, cy2, cw, H-cy2-55, fill=(10,7,2,220), border=col, border_w=4)
        radial_halo(img, cx2+cw//2, cy2+(H-cy2-55)//2, cw//2, (H-cy2-55)//2, col, max_alpha=28)
        text_glow(img, num, cx2+cw//2, cy2+(H-cy2-55)//2-25, font(44, bold=True), col, col, glow_radius=22, anchor='mm')
        d.text((cx2+cw//2, cy2+(H-cy2-55)//2+55), lbl, font=font(16, bold=True), fill=WHITE, anchor='mm')

    return img

# ── SLIDE 04 — RDJ: IRON MAN → DOOM ──────────────────────────────────────────
def make_slide_04():
    img = base_slide(COPPER, with_circuit=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, 'ROBERT DOWNEY JR.', W//2, 100, font(54, bold=True), WHITE, AMBER, glow_radius=30, anchor='mm')
    text_glow(img, 'THE GREATEST VILLAIN CASTING IN SUPERHERO HISTORY', W//2, 160,
              font(24, italic=True), CREAM, COPPER, glow_radius=15, anchor='mm')
    hline(img, 60, 196, W-120, AMBER, 5)

    # ── Left — Iron Man ──
    lw = int(W * 0.46)
    glass_card(img, 60, 216, lw, H-295, fill=(18,8,2,225), border=COPPER, border_w=7)
    diagonal_stripe(img, 60, 216, lw, H-295, AMBER, alpha=5)

    cx_im = 60 + lw//2
    text_glow(img, 'TONY STARK', cx_im, 295, font(40, bold=True), AMBER, COPPER, glow_radius=22, anchor='mm')
    text_glow(img, 'IRON MAN  (2008 – 2019)', cx_im, 352, font(22, italic=True), CREAM, AMBER, glow_radius=12, anchor='mm')

    # Iron Man arc reactor + helmet graphic
    cy_im = 620
    radial_halo(img, cx_im, cy_im, 360, 460, AMBER, max_alpha=50)
    # Helmet outline
    d.rounded_rectangle([cx_im-int(160*SCALE//2), cy_im-int(260*SCALE//2),
                          cx_im+int(160*SCALE//2), cy_im+int(60*SCALE//2)],
                         radius=int(60*SCALE//2), fill=(*rgb(RED_AC), 55),
                         outline=(*rgb(AMBER), 200), width=7)
    # Eye slits
    for ex in [cx_im-int(52*SCALE//2), cx_im+int(52*SCALE//2)]:
        ey = cy_im - int(130*SCALE//2)
        d.ellipse([ex-int(28*SCALE//2), ey-int(14*SCALE//2), ex+int(28*SCALE//2), ey+int(14*SCALE//2)],
                  fill=(*rgb(GLOW_ORG), 255))
    # Arc reactor
    for r, a in [(int(55*SCALE//2), 80), (int(42*SCALE//2), 120), (int(28*SCALE//2), 200)]:
        d.ellipse([cx_im-r, cy_im+int(60*SCALE//2)-r, cx_im+r, cy_im+int(60*SCALE//2)+r],
                  fill=(*rgb(GLOW_ORG), a), outline=(*rgb(WHITE), min(a, 180)), width=3)
    # Torso
    d.rounded_rectangle([cx_im-int(130*SCALE//2), cy_im+int(50*SCALE//2),
                          cx_im+int(130*SCALE//2), cy_im+int(350*SCALE//2)],
                         radius=int(20*SCALE//2), fill=(*rgb(RED_AC), 45),
                         outline=(*rgb(AMBER), 160), width=5)

    energy_ring(img, cx_im, cy_im+int(60*SCALE//2), int(70*SCALE//2), GLOW_ORG, thickness=4, dashes=16, alpha=200)

    d.text((cx_im, cy_im+int(430*SCALE//2)), '"I AM IRON MAN"',
           font=font(26, bold=True, italic=True), fill=AMBER, anchor='mm')

    # Timeline
    for i, (yr, event, col) in enumerate([
        ('2008', 'Iron Man — First Appearance', COPPER),
        ('2012', 'The Avengers', COPPER),
        ('2016', 'Captain America: Civil War', COPPER),
        ('2019', 'Avengers: Endgame — SACRIFICED', RED_AC),
        ('2024', 'SDCC — DOCTOR DOOM REVEALED', AMBER),
        ('2026', 'Avengers: Doomsday', AMBER),
    ]):
        ty = cy_im+int(540*SCALE//2) + i * 70
        if ty > H - 120:
            break
        is_key = i >= 3
        dot_r = int(18*SCALE//2) if is_key else int(14*SCALE//2)
        d.ellipse([cx_im-int(lw*0.38)-dot_r, ty-dot_r, cx_im-int(lw*0.38)+dot_r, ty+dot_r],
                  fill=col)
        d.text((cx_im-int(lw*0.38)+dot_r+20, ty-18), f'{yr} — {event}',
               font=font(18, bold=is_key), fill=col if is_key else CREAM)
        if i < 5:
            d.line([(cx_im-int(lw*0.38), ty+dot_r), (cx_im-int(lw*0.38), ty+70-dot_r)],
                   fill=(*rgb(COPPER), 100), width=3)

    # ── Right — Doctor Doom ──
    rx = lw + 130
    rw = W - rx - 60
    glass_card(img, rx, 216, rw, H-295, fill=(10,3,0,225), border=RED_AC, border_w=7)
    diagonal_stripe(img, rx, 216, rw, H-295, RED_AC, alpha=5)

    cx_dd = rx + rw//2
    text_glow(img, 'VICTOR VON DOOM', cx_dd, 295, font(38, bold=True), RED_AC, AMBER, glow_radius=22, anchor='mm')
    text_glow(img, 'DOCTOR DOOM  (2026)', cx_dd, 352, font(22, italic=True), AMBER, RED_AC, glow_radius=12, anchor='mm')

    # Doom mask
    cy_dd = 620
    radial_halo(img, cx_dd, cy_dd, 380, 480, RED_AC, max_alpha=60)
    doom_mask_icon(img, cx_dd, cy_dd, size=int(240*SCALE//2), color=AMBER, eye_color=RED_AC)
    for r, a in [(int(380*SCALE//2), 70), (int(460*SCALE//2), 40)]:
        energy_ring(img, cx_dd, cy_dd, r, RED_AC, thickness=4, dashes=24, alpha=a)

    d.text((cx_dd, cy_dd+int(400*SCALE//2)), '"DOOM IS ETERNAL"',
           font=font(26, bold=True, italic=True), fill=RED_AC, anchor='mm')

    # Quote strip bottom
    glass_card(img, 60, H-220, W-120, 160, fill=(10,4,0,225), border=AMBER, border_w=5, shadow=False)
    facts = [
        '10 MCU films as Tony Stark',
        'SDCC 2024 reveal shocked the world',
        'Same actor — entirely different soul',
        "Doom blames Steve Rogers for his family's death",
    ]
    for i, f2 in enumerate(facts):
        fx = 90 + i * (W-180)//4
        d.ellipse([fx, H-177, fx+24, H-153], fill=AMBER)
        d.text((fx+36, H-182), f2, font=font(19, bold=True), fill=WHITE)

    return img

# ── SLIDE 05 — FULL CAST ──────────────────────────────────────────────────────
def make_slide_05():
    img = base_slide(COPPER, with_hex=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, 'CONFIRMED CAST — 27+ ACTORS ACROSS 3 UNIVERSES', W//2, 100,
              font(44, bold=True), WHITE, AMBER, glow_radius=26, anchor='mm')
    hline(img, 60, 138, W-120, AMBER, 5)

    groups = [
        ('THE AVENGERS', AMBER, [
            ('Anthony Mackie',    'Captain America / Sam Wilson',  '★ New Cap'),
            ('Chris Evans',       'Steve Rogers / Captain America', '★ Returns'),
            ('Chris Hemsworth',   'Thor Odinson',                  'God of Thunder'),
            ('Florence Pugh',     'Yelena Belova / Black Widow II', 'Thunderbolts→Avengers'),
            ('Letitia Wright',    'Shuri / Black Panther',         'Wakanda Forever'),
            ('Lewis Pullman',     'Sentry / Robert Reynolds',      'Most Powerful New Hero'),
        ]),
        ('FANTASTIC FOUR', GOLD_AC, [
            ('Pedro Pascal',      'Reed Richards / Mr. Fantastic',  'Earth-828'),
            ('Vanessa Kirby',     'Sue Storm / Invisible Woman',     'Earth-828'),
            ('Joseph Quinn',      'Johnny Storm / Human Torch',      'Earth-828'),
            ('Ebon Moss-Bachrach','Ben Grimm / The Thing',          'Earth-828'),
        ]),
        ('X-MEN UNIVERSE', PUR_LT, [
            ('Patrick Stewart',   'Professor Charles Xavier',        'OG X-Men returns'),
            ('Ian McKellen',      'Magneto — King of Genosha',       '★ Secret cameo'),
            ('Kelsey Grammer',    'Hank McCoy / Beast',              'OG X-Men'),
            ('James Marsden',     'Scott Summers / Cyclops',         'OG X-Men'),
            ('Channing Tatum',    'Remy LeBeau / Gambit',            '★ FINALLY IN MCU!'),
        ]),
        ('SECRET CAMEOS', RED_AC, [
            ('Robert Downey Jr.', 'DOCTOR DOOM — Victor Von Doom',   '★★ MAIN VILLAIN'),
            ('Tobey Maguire',     'Peter Parker / Spider-Man',       '★ Opens the film'),
            ('Hugh Jackman',      'Logan / Wolverine',               '★ Opens the film'),
            ('Ryan Reynolds',     'Wade Wilson / Deadpool',          '★ Confirmed reshoot'),
        ]),
        ('THUNDERBOLTS', COPPER, [
            ('David Harbour',     'Alexei / Red Guardian',           'Fan favorite returns'),
            ('Wyatt Russell',     'John Walker / U.S. Agent',        'Thunderbolts'),
            ('Sebastian Stan',    'Bucky Barnes / Winter Soldier',   'Thunderbolts'),
            ('Hannah John-Kamen', 'Ava Starr / Ghost',               'Thunderbolts'),
        ]),
    ]

    col_w = (W - 160) // 3
    gx, gy = 60, 158
    col_ys = [0, 0, 0]
    col_idx = 0

    for grp_name, color, members in groups:
        cx3 = gx + col_idx * (col_w + 20)
        cy3 = gy + col_ys[col_idx]

        # Group header
        glass_card(img, cx3, cy3, col_w, 54, fill=(*rgb(color), 70), border=color, border_w=4, shadow=False)
        d.text((cx3+col_w//2, cy3+27), grp_name, font=font(19, bold=True), fill=color, anchor='mm')
        cy3 += 58

        for name, role, note in members:
            card_h = 82
            glass_card(img, cx3, cy3, col_w, card_h, fill=DARK_CARD, border=color, border_w=3, shadow=True)
            d.text((cx3+18, cy3+12), name, font=font(17, bold=True), fill=WHITE)
            d.text((cx3+18, cy3+40), role, font=font(14, italic=True), fill=color)
            d.text((cx3+col_w-18, cy3+12), note, font=font(12), fill=LT_GRAY, anchor='rt')
            cy3 += card_h + 6

        col_ys[col_idx] = cy3 - gy - 10
        col_idx = (col_idx + 1) % 3

    d.text((W//2, H-30), '★ = Secret cameos confirmed via leaked call sheets & reshoot reports  |  ★★ = Main villain confirmed SDCC 2024',
           font=font(16, italic=True), fill=RED_AC, anchor='mm')

    return img

# ── SLIDE 06 — SECRET CAMEOS ──────────────────────────────────────────────────
def make_slide_06():
    img = base_slide(RED_AC, with_circuit=True, with_border=True)
    d = draw(img)

    marvel_logo_bar(img)

    radial_halo(img, W//2, H//2, 2400, 1600, RED_AC, max_alpha=55)

    text_glow(img, '🚨 SECRET CAMEOS — MARVEL HIDING THEM 🚨', W//2, 100,
              font(50, bold=True), RED_AC, AMBER, glow_radius=32, anchor='mm')
    text_glow(img, '"Marvel going to EXTREME lengths to hide these appearances" — Yahoo Entertainment',
              W//2, 162, font(22, italic=True), CREAM, RED_AC, glow_radius=14, anchor='mm')
    hline(img, 60, 200, W-120, RED_AC, 5)

    cameos = [
        (AMBER, 'TOBEY MAGUIRE', 'PETER PARKER / SPIDER-MAN',
         [
          '◆ Film reportedly OPENS with Spider-Man vs Wolverine face-off',
          '◆ RDJ posted Easter egg photo hinting at Tobey\'s return',
          '◆ Wearing a motion-capture suit for updated visual effects',
          '◆ Marvel blocking photos at all reshoots involving Tobey',
         ], '2002–2007', '★ OPENING SCENE'),
        (PUR_LT, 'HUGH JACKMAN', 'LOGAN / WOLVERINE',
         [
          '◆ Confirmed via Doomsday reshoot call sheets leaked online',
          '◆ Films OPENING SCENE fighting Tobey\'s Spider-Man',
          '◆ Reynolds and Jackman both filming new scenes together',
          '◆ Timeline: Wolverine from Deadpool & Wolverine universe',
         ], '2000–2023', '★ OPENING SCENE'),
        (COPPER, 'RYAN REYNOLDS', 'WADE WILSON / DEADPOOL',
         [
          '◆ Confirmed filming Doomsday reshoots — new scenes added',
          '◆ Filming alongside Hugh Jackman (Deadpool+Wolverine duo)',
          '◆ "Previously unannounced Marvel heroes" — Yahoo Entertainment',
          '◆ Extent of role not yet known — cameo or major part?',
         ], '2016–2024', '★ CONFIRMED RESHOOT'),
        (GOLD_AC, 'IAN McKELLEN', 'ERIK LENSHERR / MAGNETO',
         [
          '◆ Ruling Genosha — his completed mutant nation utopia',
          '◆ Royal family: Wanda + Pietro variants + Polaris at his side',
          '◆ Represents the original X-Men film universe on Earth-616',
          '◆ 84 years old — still commanding. Still magnetic.',
         ], '2000–2019', '★ GENOSHA RULER'),
    ]

    cw2 = (W - 200) // 2
    for i, (color, name, role, info_lines, career, status) in enumerate(cameos):
        row, col2 = i // 2, i % 2
        cx3 = 60 + col2 * (cw2 + 80)
        cy3 = 228 + row * 490

        glass_card(img, cx3, cy3, cw2, 465, fill=(12,2,0,225), border=color, border_w=7)
        radial_halo(img, cx3+cw2//2, cy3+175, 300, 220, color, max_alpha=38)
        diagonal_stripe(img, cx3, cy3, cw2, 465, color, alpha=5)

        # Name initial in glow circle
        circ_r = int(65*SCALE//2)
        d.ellipse([cx3+cw2//2-circ_r, cy3+28, cx3+cw2//2+circ_r, cy3+28+circ_r*2],
                  fill=(*rgb(color), 40), outline=(*rgb(color), 200), width=5)
        d.text((cx3+cw2//2, cy3+28+circ_r), name[0], font=font(52, bold=True),
               fill=(*rgb(color), 200), anchor='mm')

        text_glow(img, name, cx3+cw2//2, cy3+195, font(26, bold=True), color, color, glow_radius=15, anchor='mm')
        d.text((cx3+cw2//2, cy3+236), role, font=font(18, italic=True), fill=CREAM, anchor='mm')

        badge(img, cx3+20, cy3+268, int(cw2*0.45), 36, career, (*rgb(DARK_CARD),200), color)
        badge(img, cx3+20+int(cw2*0.48), cy3+268, int(cw2*0.48), 36, status, (*rgb(color),200), BLACK)

        hline(img, cx3+20, cy3+316, cw2-40, color, 2)

        y = cy3+330
        for line in info_lines:
            d.text((cx3+20, y), line, font=font(15), fill=LT_GRAY)
            y += 36

    return img

# ── SLIDE 07 — DOOM'S ORIGIN ──────────────────────────────────────────────────
def make_slide_07():
    img = base_slide(RED_AC, with_hex=True, with_border=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, "DOCTOR DOOM'S ORIGIN — CONFIRMED LEAKED BACKSTORY",
              W//2, 100, font(44, bold=True), WHITE, RED_AC, glow_radius=26, anchor='mm')
    hline(img, 60, 138, W-120, RED_AC, 5)

    nodes = [
        (RED_AC,   'THE ACCIDENT',       '1.',
         "Doom's wife Valeria & their child are killed\n"
         "in a catastrophic accident. Doom's face\n"
         "is scarred. He becomes obsessed with why."),
        (COPPER,   'DECADES OF SEARCH',  '2.',
         "Doom spends decades — magic, science,\n"
         "time research — hunting the root cause.\n"
         "He discovers an anomalous temporal event."),
        (AMBER,    'THE ENDGAME LINK',   '3.',
         "Steve Rogers' time heist in Endgame 2019\n"
         "created a shockwave through the timeline.\n"
         "THAT shockwave caused the accident."),
        (RED_AC,   'TVA INFILTRATION',   '4.',
         "Doom infiltrates the Time Variance Authority.\n"
         "Kills Loki. Studies every incursion event.\n"
         "Maps the entire Multiverse."),
        (GLOW_ORG, "DOOM'S MASTERPLAN",  '5.',
         "He allies with Earth's heroes — appears noble.\n"
         "In secret: manipulates them into building\n"
         "the incursion cannons that destroy universes."),
        (GOLD_AC,  'GOD OF BATTLEWORLD', '6.',
         "Doom ALLOWS the incursions to complete.\n"
         "Rebuilds the Multiverse as its God.\n"
         "Resurrects Valeria & his child. He wins."),
    ]

    nw = (W-200)//3
    nh = 355
    for i, (color, title, num, text) in enumerate(nodes):
        row, col2 = i//3, i%3
        nx = 60 + col2*(nw+40)
        ny = 158 + row*(nh+28)
        glass_card(img, nx, ny, nw, nh, fill=(12,2,2,225), border=color, border_w=5)
        radial_halo(img, nx+nw//2, ny+nh//4, 220, 160, color, max_alpha=40)
        diagonal_stripe(img, nx, ny, nw, nh, color, alpha=6)

        # Number badge
        d.ellipse([nx+nw//2-int(40*SCALE//2), ny+20,
                   nx+nw//2+int(40*SCALE//2), ny+20+int(80*SCALE//2)], fill=color)
        d.text((nx+nw//2, ny+20+int(40*SCALE//2)), num, font=font(28, bold=True), fill=BLACK, anchor='mm')

        text_glow(img, title, nx+nw//2, ny+130, font(22, bold=True), color, color, glow_radius=12, anchor='mm')
        hline(img, nx+20, ny+152, nw-40, color, 2)
        multiline_text(img, text, nx+20, ny+168, font(19), CREAM, nw-40, line_h_mul=1.38)

    # Connector arrows between nodes in same row
    for row in range(2):
        for col2 in range(2):
            ax = 60 + col2*(nw+40) + nw + 8
            ay = 158 + row*(nh+28) + nh//2
            d.polygon([(ax,ay-14),(ax+24,ay),(ax,ay+14)], fill=(*rgb(AMBER), 180))

    glass_card(img, 60, H-115, W-120, 90, fill=(18,0,0,225), border=AMBER, border_w=4, shadow=False)
    d.text((W//2, H-78), '"He didn\'t want power. He wanted his family back." — leaked from assembly cut screening',
           font=font(24, italic=True), fill=AMBER, anchor='mm')
    d.text((W//2, H-40), '"The most sympathetic MCU villain since Thanos. Maybe more so." — test screening attendee',
           font=font(18), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 08 — THE RUSSO BROTHERS ────────────────────────────────────────────
def make_slide_08():
    img = base_slide(COPPER, with_depth=True, with_circuit=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, 'THE RUSSO BROTHERS — RETURNING CHAMPIONS',
              W//2, 100, font(50, bold=True), WHITE, AMBER, glow_radius=30, anchor='mm')
    hline(img, 60, 138, W-120, AMBER, 5)

    lw = int(W * 0.38)
    glass_card(img, 60, 158, lw, H-230, fill=(14,10,3,225), border=AMBER, border_w=7)
    radial_halo(img, 60+lw//2, int(H*0.49), 450, 560, AMBER, max_alpha=45)

    # Two director portraits (geometric)
    for i, (dx, nm, surname) in enumerate([(60+lw//4, 'JOE', 'RUSSO'), (60+3*lw//4, 'ANTHONY', 'RUSSO')]):
        circ = int(100*SCALE//2)
        d.ellipse([dx-circ, int(H*0.30)-circ, dx+circ, int(H*0.30)+circ],
                  fill=(*rgb(DARK_CARD), 230), outline=(*rgb(AMBER), 210), width=6)
        d.text((dx, int(H*0.30)), nm[0], font=font(48, bold=True), fill=AMBER, anchor='mm')
        text_glow(img, nm, dx, int(H*0.30)+circ+30, font(22, bold=True), AMBER, COPPER, glow_radius=10, anchor='mm')
        d.text((dx, int(H*0.30)+circ+68), surname, font=font(16), fill=CREAM, anchor='mm')

    d.line([(60+lw//2, int(H*0.30)), (60+lw//2, int(H*0.47))], fill=(*rgb(COPPER), 120), width=3)
    d.text((60+lw//2, int(H*0.50)), 'DIRECTORS', font=font(24, bold=True), fill=CREAM, anchor='mm')

    hline(img, 100, int(H*0.55), lw-80, AMBER, 2)
    bio_lines = [
        '◆ Captain America: Winter Soldier (2014)',
        '◆ Captain America: Civil War (2016)',
        '◆ Avengers: Infinity War (2018) — $2.05B',
        '◆ Avengers: Endgame (2019) — $2.79B #1 ever',
        '◆ Avengers: Doomsday (2026) — back-to-back',
        '◆ Avengers: Secret Wars (2027) — FINALE',
    ]
    by = int(H*0.565)
    for line in bio_lines:
        d.text((90, by), line, font=font(17), fill=CREAM)
        by += 48

    # Right — stats
    sx = lw + 130
    sw = W - sx - 60
    stats_d = [
        ('ENDGAME WORLDWIDE', '$2.79 BILLION', '#1 SUPERHERO FILM OF ALL TIME', AMBER),
        ('INFINITY WAR GROSS', '$2.05 BILLION', 'HIGHEST-GROSSING FILM 2018', COPPER),
        ('DOOMSDAY RELEASE', 'DEC 18, 2026', 'MCU FILM #39 — PHASE 6 CLIMAX', RED_AC),
        ('SECRET WARS', '2027', 'BACK-TO-BACK — FILMED SIMULTANEOUSLY', GOLD_AC),
    ]
    sh = (H - 235) // 4
    sy = 158
    for i, (title2, num, sub, color) in enumerate(stats_d):
        gy2 = sy + i*(sh+15)
        glass_card(img, sx, gy2, sw, sh, fill=(8,5,0,225), border=color, border_w=6)
        radial_halo(img, sx+sw//2, gy2+sh//2, sw//2, sh//2, color, max_alpha=25)
        diagonal_stripe(img, sx, gy2, sw, sh, color, alpha=5)
        d.text((sx+25, gy2+18), title2, font=font(18, bold=True), fill=color)
        text_glow(img, num, sx+sw//2, gy2+sh//2-12, font(42, bold=True), color, color, glow_radius=22, anchor='mm')
        d.text((sx+sw//2, gy2+sh-42), sub, font=font(17, italic=True), fill=CREAM, anchor='mm')

    glass_card(img, 60, H-120, W-120, 90, fill=(10,6,0,225), border=COPPER, border_w=4, shadow=False)
    d.text((W//2, H-82), '"The Russos are the only filmmakers who can handle a story this big."',
           font=font(23, italic=True), fill=AMBER, anchor='mm')
    d.text((W//2, H-44), '— Kevin Feige, Marvel Studios President', font=font(18), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 09 — X-MEN FACTOR ───────────────────────────────────────────────────
def make_slide_09():
    img = base_slide(PUR_AC, with_hex=True, with_border=True)
    d = draw(img)

    marvel_logo_bar(img)

    radial_halo(img, W//2, H//2, 2400, 1600, PUR_AC, max_alpha=55)

    text_glow(img, 'THE X-MEN FACTOR', W//2, 100, font(56, bold=True), WHITE, PUR_LT, glow_radius=32, anchor='mm')
    text_glow(img, 'Original X-Men Cast Returns — A Separate Universe Crashes Into Earth-616',
              W//2, 162, font(24, italic=True), CREAM, PUR_AC, glow_radius=16, anchor='mm')
    hline(img, 60, 200, W-120, PUR_AC, 5)

    xmen_cards = [
        (PUR_LT,  'PROFESSOR X',  'Patrick Stewart',
         ['Leader of all mutantkind', 'X-Men universe professor', 'Joins heroes vs Doom', 'His universe invaded by Doom']),
        (GOLD_AC, 'MAGNETO',      'Ian McKellen',
         ['King of Genosha — RULING', 'Completed his mutant utopia', 'Royal family: Wanda + Pietro', '84 years old — still magnetic']),
        (PUR_AC,  'BEAST',        'Kelsey Grammer',
         ['Henry "Hank" McCoy', 'Scientific genius returns', 'OG X-Men film continuity', 'Last seen as MCU Secretary Beast']),
        (COPPER,  'CYCLOPS',      'James Marsden',
         ['Scott Summers returns', 'Optic blast leader', 'OG X-Men universe', 'Rumored to die protecting Professor X']),
        (AMBER,   'GAMBIT',       'Channing Tatum',
         ['FINALLY IN THE MCU!', '20 years in development hell', 'Channing personally championed role', 'Fan favorite confirmed!']),
        (RED_AC,  'MAGNETO\'S COURT', 'Royal Family of Genosha',
         ['Wanda Maximoff variant', 'Pietro Maximoff variant', 'Polaris (Lorna Dane) — his daughter', 'Mutant nation is COMPLETE']),
    ]

    cw3 = (W-200)//3
    ch3 = 400
    for i, (color, name, actor, info) in enumerate(xmen_cards):
        row, col2 = i//3, i%3
        cx3 = 60 + col2*(cw3+40)
        cy3 = 228 + row*(ch3+25)
        glass_card(img, cx3, cy3, cw3, ch3, fill=(10,2,20,225), border=color, border_w=6)
        radial_halo(img, cx3+cw3//2, cy3+ch3//3, 240, 200, color, max_alpha=40)
        diagonal_stripe(img, cx3, cy3, cw3, ch3, color, alpha=6)

        # X symbol
        circ = int(55*SCALE//2)
        d.ellipse([cx3+cw3//2-circ, cy3+28, cx3+cw3//2+circ, cy3+28+circ*2],
                  fill=(*rgb(color), 40), outline=(*rgb(color), 180), width=5)
        d.text((cx3+cw3//2, cy3+28+circ), 'X', font=font(42, bold=True), fill=(*rgb(color), 200), anchor='mm')

        text_glow(img, name, cx3+cw3//2, cy3+168, font(22, bold=True), color, color, glow_radius=12, anchor='mm')
        d.text((cx3+cw3//2, cy3+206), actor, font=font(16, italic=True), fill=CREAM, anchor='mm')
        hline(img, cx3+20, cy3+232, cw3-40, color, 2)
        y3 = cy3+250
        for line in info:
            d.text((cx3+20, y3), '◆ ' + line, font=font(15), fill=LT_GRAY)
            y3 += 38

    return img

# ── SLIDE 10 — HEROES GRID ────────────────────────────────────────────────────
def make_slide_10():
    img = base_slide(COPPER, with_hex=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, "EARTH'S MIGHTIEST HEROES — ALL 3 UNIVERSES UNITED",
              W//2, 100, font(42, bold=True), WHITE, AMBER, glow_radius=24, anchor='mm')
    hline(img, 60, 138, W-120, AMBER, 5)

    heroes = [
        # Avengers row
        ('Sam Wilson',       'Captain America',     AMBER,  'A',  'New Shield'),
        ('Thor Odinson',     'God of Thunder',      COPPER, 'T',  'Asgard'),
        ('Steve Rogers',     'First Avenger',       RED_AC, 'S',  'Returns'),
        ('Yelena Belova',    'Black Widow II',      COPPER, 'Y',  'Thunderbolts'),
        # Fantastic Four
        ('Reed Richards',    'Mr. Fantastic',       GOLD_AC,'R',  'Earth-828'),
        ('Sue Storm',        'Invisible Woman',     GOLD_AC,'S',  'Earth-828'),
        ('Human Torch',      'Johnny Storm',        RED_AC, 'J',  'Earth-828'),
        ('The Thing',        'Ben Grimm',           COPPER, 'B',  'Earth-828'),
        # Thunderbolts/others
        ('Shuri',            'Black Panther',       GOLD_AC,'S',  'Wakanda'),
        ('Sentry',           'Golden Guardian',     AMBER,  'S',  'Most powerful'),
        ('Red Guardian',     'Soviet Hero',         RED_AC, 'R',  'Thunderbolts'),
        ('U.S. Agent',       'John Walker',         COPPER, 'U',  'Thunderbolts'),
        # Secret cameos
        ('★ Tobey Maguire',  'Spider-Man (SECRET)', RED_AC, '?',  'Opens film'),
        ('★ Hugh Jackman',   'Wolverine (SECRET)',  RED_AC, '?',  'Opens film'),
        ('★ Ryan Reynolds',  'Deadpool (SECRET)',   RED_AC, '?',  'Reshoot conf.'),
        ('★ Bucky Barnes',   'Winter Soldier',      COPPER, 'B',  'Thunderbolts'),
    ]

    cols = 4
    cw4 = (W - 200) // cols
    ch4 = 225
    for i, (name, role, color, initial, note) in enumerate(heroes):
        row, col2 = i//cols, i%cols
        cx4 = 60 + col2*(cw4+18)
        cy4 = 158 + row*(ch4+14)
        is_secret = name.startswith('★')

        glass_card(img, cx4, cy4, cw4, ch4,
                   fill=(20,0,0,220) if is_secret else DARK_CARD,
                   border=color, border_w=5 if is_secret else 4)
        radial_halo(img, cx4+cw4//2, cy4+ch4//3, cw4//3, ch4//3, color, max_alpha=28)

        # Icon circle
        circ = int(48*SCALE//2)
        d.ellipse([cx4+cw4//2-circ, cy4+20, cx4+cw4//2+circ, cy4+20+circ*2],
                  fill=(*rgb(color), 50 if is_secret else 40),
                  outline=(*rgb(color), 200), width=4)
        d.text((cx4+cw4//2, cy4+20+circ), initial, font=font(36, bold=True),
               fill=(*rgb(color), 200 if is_secret else 170), anchor='mm')

        d.text((cx4+cw4//2, cy4+140), name.replace('★ ', ''), font=font(15, bold=True), fill=WHITE, anchor='mm')
        d.text((cx4+cw4//2, cy4+170), role, font=font(12, italic=True), fill=color, anchor='mm')
        d.text((cx4+cw4//2, cy4+200), note, font=font(11), fill=LT_GRAY, anchor='mm')

    return img

# ── SLIDE 11 — PHASE 6 TIMELINE ───────────────────────────────────────────────
def make_slide_11():
    img = base_slide(COPPER, with_circuit=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, 'MCU PHASE 6 — THE ROAD TO DOOMSDAY', W//2, 100,
              font(48, bold=True), WHITE, AMBER, glow_radius=27, anchor='mm')
    hline(img, 60, 138, W-120, AMBER, 5)

    films = [
        ('2025', 'Thunderbolts*',       'Sets up the New Avengers\nThunderbolts become heroes\nLeads directly into Doomsday',        COPPER, False),
        ('2025', 'Fantastic Four:\nFirst Steps', 'Earth-828 — Second reality\nReed Richards key to Doom\'s plan\nSets up incursion mechanics', GOLD_AC, False),
        ('2025', 'Spider-Man:\nBrand New Day',  'Tom Holland returns\nPost-No Way Home world\nSets up Tobey cameo context',         AMBER,  False),
        ('2026', 'AVENGERS:\nDOOMSDAY',        '★★★ 3 UNIVERSES COLLIDE ★★★\nDoom becomes God of Battleworld\nThe MCU changes FOREVER',    GLOW_ORG,True),
        ('2027', 'Avengers:\nSecret Wars',     'THE GRAND FINALE\nBattleworld — all reality remade\nEnd of the Multiverse Saga',    RED_AC, False),
    ]

    line_y = int(H * 0.54)
    # Timeline spine
    d.line([(100, line_y), (W-100, line_y)], fill=(*rgb(COPPER), 220), width=10)
    # Arrow at end
    d.polygon([(W-100, line_y-20),(W-60, line_y),(W-100, line_y+20)], fill=(*rgb(COPPER), 220))

    spacing = (W-280) // (len(films)-1)
    for i, (yr, title, desc, color, is_main) in enumerate(films):
        x = 140 + i*spacing
        is_above = (i % 2 == 0)

        radial_halo(img, x, line_y, 240 if is_main else 140, 240 if is_main else 140,
                    color, max_alpha=85 if is_main else 42)

        dot_r = int(42*SCALE//2) if is_main else int(26*SCALE//2)
        d.ellipse([x-dot_r, line_y-dot_r, x+dot_r, line_y+dot_r], fill=color)
        if is_main:
            for rr, aa in [(dot_r+18, 120), (dot_r+32, 60)]:
                d.ellipse([x-rr, line_y-rr, x+rr, line_y+rr], outline=(*rgb(color), aa), width=5)

        yr_y = line_y - 72 if is_above else line_y + 60
        d.text((x, yr_y), yr, font=font(22, bold=True), fill=COPPER, anchor='mm')

        card_w = 430 if is_main else 355
        card_h = 270 if is_main else 215
        card_x = max(40, min(W-card_w-40, x - card_w//2))
        card_y = line_y - 100 - card_h if is_above else line_y + 100

        glass_card(img, card_x, card_y, card_w, card_h, fill=(10,7,0,225),
                   border=color, border_w=7 if is_main else 4)
        diagonal_stripe(img, card_x, card_y, card_w, card_h, color, alpha=7 if is_main else 4)

        text_glow(img, title, x, card_y+55, font(24 if is_main else 20, bold=True),
                  color, color, glow_radius=14 if is_main else 8, anchor='mm')
        hline(img, card_x+18, card_y+90, card_w-36, color, 2)
        multiline_text(img, desc, card_x+18, card_y+105, font(16 if is_main else 14), CREAM, card_w-36, line_h_mul=1.38)

        conn_x = x
        if is_above:
            d.line([(conn_x, card_y+card_h), (conn_x, line_y-dot_r)], fill=(*rgb(color), 130), width=3)
        else:
            d.line([(conn_x, line_y+dot_r), (conn_x, card_y)], fill=(*rgb(color), 130), width=3)

    return img

# ── SLIDE 12 — BY THE NUMBERS ─────────────────────────────────────────────────
def make_slide_12():
    img = base_slide(COPPER, with_depth=True, with_hex=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, 'AVENGERS: DOOMSDAY — BY THE NUMBERS', W//2, 100,
              font(52, bold=True), WHITE, AMBER, glow_radius=30, anchor='mm')
    hline(img, 60, 138, W-120, AMBER, 5)

    stats = [
        ('$2.79B',     'Endgame Record\nDooms­day Must Beat',  AMBER),
        ('38',          'MCU Films Before\nDoomsday',           COPPER),
        ('4',           'Russo Brothers\nMCU Epics',            GOLD_AC),
        ('3',           'Universes\nCollide',                   RED_AC),
        ('27+',         'Confirmed\nCast Members',              PUR_LT),
        ('14',          'Months After\nThunderbolts*',          AMBER),
        ('2',           'Films Shot\nBack to Back',             COPPER),
        ('1',           'Victor Von Doom\nOne Ultimate Villain',RED_AC),
        ('0',           'Heroes Guaranteed\nTo Survive',        GLOW_ORG),
    ]

    cols = 3
    cw5 = (W-200)//cols
    ch5 = int((H-215)/3)
    for i, (num, lbl, color) in enumerate(stats):
        row, col2 = i//cols, i%cols
        sx = 60 + col2*(cw5+40)
        sy = 158 + row*(ch5+20)
        glass_card(img, sx, sy, cw5, ch5, border=color)
        radial_halo(img, sx+cw5//2, sy+ch5//2, cw5//2, ch5//2, color, max_alpha=32)
        diagonal_stripe(img, sx, sy, cw5, ch5, color, alpha=8)
        text_glow(img, num, sx+cw5//2, sy+int(ch5*0.36), font(50, bold=True), color, color, glow_radius=26, anchor='mm')
        for j, ln in enumerate(lbl.split('\n')):
            d.text((sx+cw5//2, sy+int(ch5*0.64)+j*38), ln, font=font(16, bold=True if j==0 else False), fill=WHITE, anchor='mm')

    return img

# ── SLIDE 13 — ARMOR BREAKDOWN ────────────────────────────────────────────────
def make_slide_13():
    img = base_slide(RED_AC, with_circuit=True, with_border=True)
    d = draw(img)

    marvel_logo_bar(img)

    radial_halo(img, W//2, H//2, 2400, 1600, RED_AC, max_alpha=48)

    text_glow(img, "DOCTOR DOOM'S ARMOR — FULL BREAKDOWN", W//2, 100,
              font(48, bold=True), WHITE, RED_AC, glow_radius=28, anchor='mm')
    hline(img, 60, 138, W-120, RED_AC, 5)

    # Central armor column (takes up middle ~30% width)
    col_w_side = int(W * 0.32)
    col_w_mid  = W - 2 * col_w_side - 80

    cx_a = col_w_side + 40 + col_w_mid // 2
    cy_a = int(H * 0.49)
    scale_f = int(SCALE)

    # Large background halo
    radial_halo(img, cx_a, cy_a, 700, 900, RED_AC, max_alpha=65)
    radial_halo(img, cx_a, cy_a, 420, 550, AMBER, max_alpha=40)

    # ── Full body armor ──
    # Cape (behind everything)
    d.polygon([
        (cx_a-int(320*SCALE//2), cy_a-int(320*SCALE//2)),
        (cx_a+int(320*SCALE//2), cy_a-int(320*SCALE//2)),
        (cx_a+int(260*SCALE//2), cy_a+int(620*SCALE//2)),
        (cx_a-int(260*SCALE//2), cy_a+int(620*SCALE//2))
    ], fill=(0,90,0,130), outline=(0,170,0,200), width=6)

    # Shoulders
    for side in [-1, 1]:
        pts = [
            (cx_a+side*int(80*SCALE//2), cy_a-int(260*SCALE//2)),
            (cx_a+side*int(280*SCALE//2), cy_a-int(180*SCALE//2)),
            (cx_a+side*int(300*SCALE//2), cy_a-int(60*SCALE//2)),
            (cx_a+side*int(120*SCALE//2), cy_a-int(80*SCALE//2)),
        ]
        d.polygon(pts, fill=(*rgb(DARK_CARD), 220), outline=(*rgb(AMBER), 200), width=6)

    # Chest plate
    d.rounded_rectangle([cx_a-int(170*SCALE//2), cy_a-int(200*SCALE//2),
                           cx_a+int(170*SCALE//2), cy_a+int(220*SCALE//2)],
                          radius=int(20*SCALE//2),
                          fill=(*rgb(DARK_CARD), 230), outline=(*rgb(AMBER), 190), width=7)
    # Chest runes
    for ry2 in range(5):
        for rx2 in range(4):
            d.line([
                (cx_a-int(130*SCALE//2)+rx2*int(70*SCALE//2), cy_a-int(180*SCALE//2)+ry2*int(80*SCALE//2)),
                (cx_a-int(130*SCALE//2)+rx2*int(70*SCALE//2), cy_a-int(110*SCALE//2)+ry2*int(80*SCALE//2))
            ], fill=(*rgb(AMBER), 55), width=3)

    # Belt
    d.rounded_rectangle([cx_a-int(180*SCALE//2), cy_a+int(210*SCALE//2),
                           cx_a+int(180*SCALE//2), cy_a+int(255*SCALE//2)],
                          radius=6, fill=(*rgb(COPPER), 210), outline=(*rgb(AMBER), 230), width=5)

    # Legs
    for side in [-1, 1]:
        lx = cx_a + side*int(65*SCALE//2)
        d.rounded_rectangle([lx-int(50*SCALE//2), cy_a+int(255*SCALE//2),
                               lx+int(50*SCALE//2), cy_a+int(590*SCALE//2)],
                              radius=int(12*SCALE//2),
                              fill=(*rgb(DARK_CARD), 210), outline=(*rgb(AMBER), 160), width=5)

    # Doom mask
    doom_mask_icon(img, cx_a, cy_a-int(330*SCALE//2), size=int(165*SCALE//2), color=AMBER, eye_color=RED_AC)

    # Cape pins
    for side, pm in [(-1,'Mjölnir'), (1,'Hala Star')]:
        px = cx_a + side * int(250*SCALE//2)
        py = cy_a - int(280*SCALE//2)
        d.ellipse([px-int(30*SCALE//2), py-int(30*SCALE//2), px+int(30*SCALE//2), py+int(30*SCALE//2)],
                  fill=(*rgb(GOLD_AC), 240), outline=(*rgb(WHITE), 180), width=5)
        d.text((px, py), '✦', font=font(18, bold=True), fill=BLACK, anchor='mm')

    # ── Left annotations ──
    left_annotations = [
        (cy_a - int(360*SCALE//2), AMBER,    'DOOM MASK', ['Comic-accurate faceplate', 'Metallic, rune-engraved']),
        (cy_a - int(240*SCALE//2), GOLD_AC,  'CAPE PINS', ['Mjölnir — Thor\'s symbol', 'Hala Star — Capt. Marvel']),
        (cy_a - int(60*SCALE//2),  GLOW_ORG, 'GREEN CAPE', ['Comic-accurate dark green', 'Hooded sorcerer\'s cape']),
        (cy_a + int(100*SCALE//2), COPPER,   'CHEST RUNES', ['Arcane magical symbols', 'Reference Doom\'s sorcery']),
    ]
    for ay, acolor, atitle, alines in left_annotations:
        bx = col_w_side + 40 - 340
        bw7 = 320
        glass_card(img, bx, ay-50, bw7, 110, fill=(10,3,0,215), border=acolor, border_w=4, shadow=False)
        d.text((bx+14, ay-36), atitle, font=font(16, bold=True), fill=acolor)
        for j2, ln in enumerate(alines):
            d.text((bx+14, ay-8+j2*28), ln, font=font(14), fill=CREAM)
        ax_line = bx + bw7
        armor_x = cx_a - int(190*SCALE//2)
        d.line([(ax_line, ay+5), (armor_x, ay+5)], fill=(*rgb(acolor), 100), width=2)
        d.ellipse([armor_x-6, ay-1, armor_x+6, ay+11], fill=(*rgb(acolor), 180))

    # ── Right annotations ──
    right_annotations = [
        (cy_a - int(220*SCALE//2), RED_AC,   'SHOULDER ARMOR', ['Pauldron design', 'Enforced vibranium alloy']),
        (cy_a + int(30*SCALE//2),  PUR_LT,   'TVA ACCESS RUNE', ['Doom used TVA tech', 'Killed Loki here']),
        (cy_a + int(210*SCALE//2), AMBER,    'BELT REDESIGN', ['CinemaCon 2026 reveal', 'Last-minute tweaks']),
        (cy_a + int(380*SCALE//2), COPPER,   'DOOM-CLASS ARMOR', ['Grade: Doom-Class', 'Magic + tech fusion']),
    ]
    rx_ann = cx_a + int(220*SCALE//2)
    for ay, acolor, atitle, alines in right_annotations:
        bx = rx_ann + 20
        bw7 = 320
        glass_card(img, bx, ay-50, bw7, 110, fill=(10,3,0,215), border=acolor, border_w=4, shadow=False)
        d.text((bx+14, ay-36), atitle, font=font(16, bold=True), fill=acolor)
        for j2, ln in enumerate(alines):
            d.text((bx+14, ay-8+j2*28), ln, font=font(14), fill=CREAM)
        d.line([(rx_ann, ay+5), (bx, ay+5)], fill=(*rgb(acolor), 100), width=2)
        d.ellipse([rx_ann-6, ay-1, rx_ann+6, ay+11], fill=(*rgb(acolor), 180))

    return img

# ── SLIDE 14 — WHY IT MATTERS ─────────────────────────────────────────────────
def make_slide_14():
    img = base_slide(COPPER, with_depth=True, with_hex=True)
    d = draw(img)

    marvel_logo_bar(img)

    text_glow(img, 'WHY DOOMSDAY IS THE MOST IMPORTANT MCU FILM EVER',
              W//2, 100, font(42, bold=True), WHITE, AMBER, glow_radius=24, anchor='mm')
    hline(img, 60, 138, W-120, AMBER, 5)

    reasons = [
        (AMBER, 'THE ENDGAME SUCCESSOR',
         'Avengers: Endgame (2019) was a $2.79B cultural moment — the culmination of 11 years. '
         'Doomsday is its true spiritual sequel. The same Russo Brothers returned specifically for this. '
         'It carries the full emotional weight of 15 years and 38 MCU films of storytelling.'),
        (RED_AC, 'THE BOLDEST CASTING GAMBLE IN HOLLYWOOD HISTORY',
         'Bringing Robert Downey Jr. back as the VILLAIN after he played the franchise\'s greatest HERO '
         'is unprecedented. Tony Stark sacrificed himself to save the universe. Victor Von Doom wants '
         'to DESTROY universes to save his family. Same actor — completely different soul.'),
        (PUR_LT, 'THREE UNIVERSES — ZERO GUARANTEED SURVIVORS',
         'For the FIRST time in MCU history, THREE separate universe continuities share the screen: '
         'Earth-616 Avengers + Earth-828 Fantastic Four + original X-Men universe. '
         'Beloved characters confirmed dead. The MCU will never look the same after December 18.'),
        (GOLD_AC, 'THE SECRET CAMEO EXPLOSION',
         'Tobey Maguire\'s Spider-Man. Hugh Jackman\'s Wolverine. Ryan Reynolds\' Deadpool. '
         'Ian McKellen\'s Magneto. Channing Tatum\'s GAMBIT. Patrick Stewart\'s Professor X. '
         'This is the most fan-service loaded film Marvel has EVER made — and it\'s ALL plot-relevant.'),
        (GLOW_ORG, 'BATTLEWORLD IS COMING — THE GRAND FINALE BEGINS',
         'Doctor Doom\'s endgame is to become GOD of a rebuilt Multiverse called Battleworld. '
         'Doomsday ends with Doom winning. Secret Wars 2027 is where heroes fight back. '
         'Everything — EVERYTHING — in the MCU since 2008 has been leading to this.'),
    ]

    rh2 = (H - 218) // len(reasons)
    for i, (color, title3, text) in enumerate(reasons):
        ry2 = 158 + i*(rh2+10)
        glass_card(img, 60, ry2, W-120, rh2, fill=(8,5,2,225), border=color, border_w=6)
        diagonal_stripe(img, 60, ry2, W-120, rh2, color, alpha=5)
        radial_halo(img, 60+60, ry2+rh2//2, 90, 90, color, max_alpha=40)

        d.ellipse([72, ry2+rh2//2-40, 152, ry2+rh2//2+40], fill=color)
        d.text((112, ry2+rh2//2), str(i+1), font=font(28, bold=True), fill=BLACK, anchor='mm')
        d.text((175, ry2+18), title3, font=font(21, bold=True), fill=color)
        multiline_text(img, text, 175, ry2+55, font(18), CREAM, W-290, line_h_mul=1.32)

    return img

# ── SLIDE 15 — CLOSING ────────────────────────────────────────────────────────
def make_slide_15():
    img = base_slide(COPPER, with_pedestal=True, with_border=True, with_hex=True)
    d = draw(img)

    marvel_logo_bar(img)

    # Massive atmosphere
    radial_halo(img, W//2, int(H*0.43), 2800, 1800, AMBER, max_alpha=90)
    radial_halo(img, W//2, int(H*0.43), 1600, 1050, GLOW_ORG, max_alpha=65)
    radial_halo(img, W//2, int(H*0.43), 900, 580, RED_AC, max_alpha=42)

    # Outer energy rings
    for r, a in [(500, 22), (620, 16), (750, 10)]:
        energy_ring(img, W//2, int(H*0.34), int(r*SCALE//2), AMBER, thickness=5, dashes=36, alpha=a)

    # Central Doom mask — LARGE
    doom_mask_icon(img, W//2, int(H*0.34), size=int(280*SCALE//2), color=AMBER, eye_color=RED_AC)

    # Multiple glow rings behind mask
    for r2, a2 in [(int(520*SCALE//2), 80), (int(640*SCALE//2), 50), (int(780*SCALE//2), 28)]:
        energy_ring(img, W//2, int(H*0.34), r2, AMBER, thickness=6, dashes=28, alpha=a2)

    # Main titles
    text_glow(img, 'DOOM IS COMING.', W//2, int(H*0.615),
              font(120, bold=True), WHITE, AMBER, glow_radius=65, anchor='mm')
    text_glow(img, 'AND NOTHING WILL EVER BE THE SAME.', W//2, int(H*0.705),
              font(40, bold=True), AMBER, COPPER, glow_radius=28, anchor='mm')

    hline(img, int(W*0.12), int(H*0.750), int(W*0.76), AMBER, 6)

    d.text((W//2, int(H*0.792)), 'December 18, 2026  ·  Marvel Studios  ·  Phase 6  ·  The Russo Brothers',
           font=font(28), fill=CREAM, anchor='mm')
    d.text((W//2, int(H*0.838)), '"The greatest superhero film ever made" — predicted by every critic who has seen early footage',
           font=font(22, italic=True), fill=COPPER, anchor='mm')

    # Bottom cast strip
    glass_card(img, 0, int(H*0.895), W, int(H*0.105), fill=(0,0,0,215), border=COPPER, border_w=4, radius=0, shadow=False)
    d.text((W//2, int(H*0.930)), '— CONFIRMED CAST —', font=font(20, bold=True), fill=AMBER, anchor='mm')
    cast_strip = ('RDJ (Doom) · Hemsworth (Thor) · Mackie (Cap) · Evans (Steve) · Pascal (Reed) · '
                  'Kirby (Sue) · Stewart (Xavier) · McKellen (Magneto) · Grammer (Beast) · '
                  'Tatum (Gambit) · Marsden (Cyclops) · Jackman (Logan) · Maguire (Spidey) · Reynolds (Deadpool)')
    d.text((W//2, int(H*0.963)), cast_strip, font=font(17), fill=COPPER, anchor='mm')

    return img

# ── BUILD PDF ─────────────────────────────────────────────────────────────────
BUILDERS = [
    (make_slide_01, '01 — TITLE'),
    (make_slide_02, '02 — DOCTOR DOOM'),
    (make_slide_03, '03 — THE PLOT (LEAKED)'),
    (make_slide_04, '04 — RDJ: IRON MAN → DOOM'),
    (make_slide_05, '05 — FULL CAST'),
    (make_slide_06, '06 — SECRET CAMEOS'),
    (make_slide_07, '07 — DOOM\'S ORIGIN'),
    (make_slide_08, '08 — RUSSO BROTHERS'),
    (make_slide_09, '09 — X-MEN FACTOR'),
    (make_slide_10, '10 — HEROES GRID'),
    (make_slide_11, '11 — PHASE 6 TIMELINE'),
    (make_slide_12, '12 — BY THE NUMBERS'),
    (make_slide_13, '13 — ARMOR BREAKDOWN'),
    (make_slide_14, '14 — WHY IT MATTERS'),
    (make_slide_15, '15 — CLOSING'),
]

def build():
    slide_paths = []
    for i, (builder, name) in enumerate(BUILDERS, 1):
        print(f'  [{i:02d}/15] {name}')
        slide = builder()
        path = f'{OUT_DIR}/slide_{i:02d}.jpg'
        slide_to_rgb(slide).save(path, 'JPEG', quality=95, optimize=False)
        slide_paths.append(path)

    print(f'\n  Assembling PDF...')
    c = rlcanvas.Canvas(OUT_PDF, pagesize=(W, H))
    c.setTitle('Avengers: Doomsday — Premium Presentation')
    c.setAuthor('Marvel Studios / Russo Brothers')
    for path in slide_paths:
        c.drawImage(path, 0, 0, W, H)
        c.showPage()
    c.save()
    print(f'  Done → {OUT_PDF}')

if __name__ == '__main__':
    build()
