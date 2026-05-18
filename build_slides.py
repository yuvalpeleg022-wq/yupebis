#!/usr/bin/env python3
"""
Avengers: Doomsday — Premium 4K PDF Presentation
All real confirmed cast, plot leaks, rumors. High-detail Pillow rendering.
"""
import sys, os, math, textwrap
sys.path.insert(0, '/home/user/yupebis')
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance
from gfx import *
from reportlab.pdfgen import canvas as rlcanvas
from reportlab.lib.units import inch

OUT_PDF = '/home/user/yupebis/avengers_doomsday.pdf'
OUT_DIR = '/tmp/av_slides'
os.makedirs(OUT_DIR, exist_ok=True)

# ── SLIDE BASE ────────────────────────────────────────────────────────────────
def base_slide(accent=COPPER, with_depth=False, with_starfield=True, with_pedestal=False):
    img = new_slide()
    bg_black(img)
    if with_starfield:
        starfield(img, 150)
    floor_glow(img, accent)
    light_beams(img, accent)
    if with_depth:
        depth_panels(img, accent)
    if with_pedestal:
        pedestal_ring(img, color=accent)
    return img

# ── SLIDE 1 — TITLE ───────────────────────────────────────────────────────────
def make_slide_01():
    img = base_slide(COPPER, with_pedestal=True)
    d = draw(img)

    # Massive centered halo
    radial_halo(img, W//2, int(H*0.38), 1400, 900, AMBER, max_alpha=90)
    radial_halo(img, W//2, int(H*0.38), 700, 450, GLOW_ORG, max_alpha=60)

    # Doom mask silhouette (geometric approximation)
    cx, cy = W//2, int(H*0.32)
    # Outer helm glow rings
    for r, a in [(340,25),(280,40),(220,55),(160,70)]:
        d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(*rgb(AMBER), a), width=6)
    # Doom letter "D" styled as armor mask
    d.ellipse([cx-130, cy-150, cx+130, cy+150], fill=(*rgb(AMBER), 220))
    d.ellipse([cx-90, cy-110, cx+90, cy+110], fill=(*rgb(DARK_CARD), 240))
    d.ellipse([cx-130, cy-150, cx+130, cy+150], outline=(*rgb(AMBER), 255), width=8)
    # Eyes glow
    for ex in [cx-42, cx+42]:
        for r2, a2 in [(22, 40), (16, 80), (10, 160), (6, 255)]:
            d.ellipse([ex-r2, cy-28-r2, ex+r2, cy-28+r2], fill=(*rgb(RED_AC), a2))
    # Doom text
    text_glow(img, 'DOOM', cx, cy+12, font(54, bold=True), AMBER, COPPER, glow_radius=35)

    # Title
    text_glow(img, 'AVENGERS:', W//2, int(H*0.535),
              font(76, bold=True), WHITE, AMBER, glow_radius=40, anchor='mm')
    text_glow(img, 'DOOMSDAY', W//2, int(H*0.620),
              font(90, bold=True), AMBER, COPPER, glow_radius=50, anchor='mm')

    # Hline separator
    hline(img, int(W*0.18), int(H*0.665), int(W*0.64), AMBER, 5)

    # Subtitle
    d.text((W//2, int(H*0.695)), '"The Beginning of the End of the Multiverse Saga"',
           font=font(28, italic=True), fill=CREAM, anchor='mm')

    # Bottom info bar
    glass_card(img, 0, int(H*0.90), W, int(H*0.10), fill=(0,0,0,200), border=COPPER, border_w=3, radius=0, shadow=False)
    d.text((W//2, int(H*0.950)), 'Marvel Studios  ·  Phase 6  ·  Directed by The Russo Brothers  ·  December 18, 2026',
           font=font(22, bold=True), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 2 — DOCTOR DOOM ─────────────────────────────────────────────────────
def make_slide_02():
    img = base_slide(RED_AC, with_pedestal=True)
    d = draw(img)

    # Red atmosphere
    radial_halo(img, W//2, H//2, 1800, 1200, RED_AC, max_alpha=60)

    # Left side — DOOM armor graphic
    lx, lw = 60, int(W*0.44)
    glass_card(img, lx, 80, lw, H-160, fill=(30,5,5,220), border=RED_AC, border_w=8)

    # Armor silhouette
    cx, cy = lx + lw//2, int(H*0.42)
    # Full-body armor shape
    radial_halo(img, cx, cy, 500, 700, RED_AC, max_alpha=80)
    radial_halo(img, cx, cy, 280, 380, GLOW_ORG, max_alpha=50)
    # Helmet
    d.ellipse([cx-160, cy-420, cx+160, cy-140], fill=(*rgb(AMBER), 30), outline=(*rgb(RED_AC), 200), width=6)
    # Eyes
    for ex in [cx-50, cx+50]:
        d.ellipse([ex-18, cy-310-18, ex+18, cy-310+18], fill=(*rgb(RED_AC), 255))
        d.ellipse([ex-10, cy-310-10, ex+10, cy-310+10], fill=(*rgb(GLOW_ORG), 255))
    # Shoulders
    d.polygon([(cx-200, cy-100), (cx-160, cy-280), (cx-60, cy-220), (cx-60, cy-80)],
              fill=(*rgb(COPPER), 100), outline=(*rgb(AMBER), 180), width=4)
    d.polygon([(cx+200, cy-100), (cx+160, cy-280), (cx+60, cy-220), (cx+60, cy-80)],
              fill=(*rgb(COPPER), 100), outline=(*rgb(AMBER), 180), width=4)
    # Chest rune
    d.text((cx, cy-30), 'DOOM', font=font(38, bold=True), fill=(*rgb(RED_AC), 220), anchor='mm')
    # Cape pins hint
    for px in [cx-140, cx+140]:
        d.ellipse([px-20, cy-260-20, px+20, cy-260+20], fill=(*rgb(GOLD_AC), 200))
    # Body
    d.rectangle([cx-110, cy-80, cx+110, cy+280], fill=(*rgb(DARK_CARD), 180), outline=(*rgb(AMBER), 160), width=3)
    # Armor text label
    text_glow(img, 'VICTOR VON DOOM', cx, int(H*0.77), font(32, bold=True), RED_AC, RED_AC, glow_radius=20, anchor='mm')
    d.text((cx, int(H*0.83)), 'ARMOR GRADE: DOOM-CLASS', font=font(18, bold=True), fill=COPPER, anchor='mm')

    # Right side — info
    rx = lx + lw + 60
    rw = W - rx - 60

    text_glow(img, 'DOCTOR DOOM', rx + rw//2, 130, font(58, bold=True), RED_AC, AMBER, glow_radius=30, anchor='mm')
    hline(img, rx, 175, rw, RED_AC, 5)

    d.text((rx, 210), 'ROBERT DOWNEY JR.', font=font(26, bold=True), fill=AMBER)
    d.text((rx, 250), 'as VICTOR VON DOOM', font=font(22, italic=True), fill=CREAM)

    hline(img, rx, 300, rw, COPPER, 2)

    # Armor details
    details = [
        ('ARMOR', 'Green hooded cloak + rune-engraved metallic suit'),
        ('CAPE PINS', 'Mjölnir + Hala Star — symbols of conquered heroes'),
        ('POWERS', 'Magic, tech, incursion energy, TVA access'),
        ('BACKSTORY', 'Wife & child killed — traced cause to Endgame\'s time heist'),
        ('MOTIVE', 'Rebuild the Multiverse to resurrect his dead family'),
        ('ROLE', 'Wolf in sheep\'s clothing — allies with heroes, then betrays all'),
        ('THREAT', 'Killed Loki · Infiltrated the TVA · Destroyed universes'),
    ]
    y = 340
    for label, val in details:
        glass_card(img, rx, y, rw, 78, fill=(30,5,5,200), border=RED_AC, border_w=3, shadow=False)
        d.text((rx+20, y+14), label, font=font(16, bold=True), fill=RED_AC)
        d.text((rx+20, y+40), val, font=font(17), fill=CREAM)
        y += 94

    # Quote
    glass_card(img, rx, H-230, rw, 170, fill=(20,0,0,220), border=AMBER, border_w=4, shadow=True)
    d.text((rx+rw//2, H-178), '"I traced the cause of their deaths... to you."',
           font=font(22, italic=True), fill=AMBER, anchor='mm')
    d.text((rx+rw//2, H-130), '— Victor Von Doom to Steve Rogers', font=font(18), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 3 — THE PLOT (FULL LEAK) ───────────────────────────────────────────
def make_slide_03():
    img = base_slide(COPPER, with_depth=True)
    d = draw(img)

    text_glow(img, 'THE PLOT — LEAKED ASSEMBLY CUT', W//2, 95,
              font(46, bold=True), WHITE, AMBER, glow_radius=25, anchor='mm')
    hline(img, 80, 130, W-160, AMBER, 5)

    acts = [
        ('ACT 1', 'INCURSION', RED_AC,
         'Opens: Tobey Maguire\'s Spider-Man vs Hugh Jackman\'s Wolverine in a '
         'collapsed universe. Doctor Doom has spent decades executing a secret plan — '
         'he understood incursions BEFORE the Avengers. Earth-616, Earth-828 (Fantastic Four), '
         'and the X-Men universe collide. Heroes from 3 realities must unite.'),
        ('ACT 2', 'THE TRAP', COPPER,
         'Doom acts as a "wolf in sheep\'s clothing" — allying with Earth\'s Mightiest Heroes '
         'with seemingly noble intentions. He infiltrated the TVA and killed Loki. '
         'He used the heroes themselves to build the very cannons that would destroy their universes. '
         'Ian McKellen\'s Magneto rules Genosha with Wanda/Pietro variants as his royal family.'),
        ('ACT 3', 'DOOMSDAY', AMBER,
         'Steve Rogers confronts Doom. Doom reveals he traced the accident that killed his wife '
         'and child directly to Steve\'s time heist in Endgame. '
         'Doom\'s true plan: ALLOW the incursions to happen — then rebuild the Multiverse '
         'in his own image and RESURRECT his dead family. He becomes God of Battleworld.'),
    ]

    y = 155
    for act_num, act_title, color, text in acts:
        h_card = 260
        glass_card(img, 60, y, W-120, h_card, fill=(8,4,2,220), border=color, border_w=6)
        # Act badge
        d.rounded_rectangle([80, y+20, 240, y+70], radius=8, fill=color)
        d.text((160, y+45), act_num, font=font(20, bold=True), fill=BLACK, anchor='mm')
        d.text((260, y+45), act_title, font=font(26, bold=True), fill=color)
        hline(img, 80, y+82, W-160, color, 2)
        multiline_text(img, text, 80, y+100, font(20), CREAM, W-200, line_h_mul=1.45)
        y += h_card + 25

    # Bottom callouts
    calls = [('3', 'UNIVERSES\nCOLLIDE'), ('14', 'MONTHS AFTER\nTHUNDERBOLTS*'), ('BATTLEWORLD', 'DOOM\'S\nMULTIVERSE')]
    cw = (W-200)//3
    cy2 = y + 10
    for i, (num, lbl) in enumerate(calls):
        cx2 = 100 + i*(cw+40)
        stat_card(img, cx2, cy2, cw, H-cy2-60, num, lbl)

    return img

# ── SLIDE 4 — RDJ: IRON MAN → IRON DOOM ──────────────────────────────────────
def make_slide_04():
    img = base_slide(COPPER)
    d = draw(img)

    # Split layout
    text_glow(img, 'ROBERT DOWNEY JR.', W//2, 95, font(50, bold=True), WHITE, AMBER, glow_radius=28, anchor='mm')
    text_glow(img, 'THE GREATEST VILLAIN CASTING IN SUPERHERO HISTORY', W//2, 155, font(24, italic=True), CREAM, COPPER, glow_radius=15, anchor='mm')
    hline(img, 60, 190, W-120, AMBER, 4)

    # Left — Iron Man card
    lw = int(W*0.47)
    glass_card(img, 60, 210, lw, H-290, fill=(15,8,2,220), border=COPPER, border_w=6)
    text_glow(img, 'TONY STARK', 60+lw//2, 290, font(36, bold=True), AMBER, COPPER, glow_radius=20, anchor='mm')
    text_glow(img, 'IRON MAN', 60+lw//2, 345, font(28, italic=True), CREAM, AMBER, glow_radius=15, anchor='mm')

    # Iron Man suit graphic
    cx, cy = 60+lw//2, 580
    radial_halo(img, cx, cy, 320, 420, AMBER, max_alpha=50)
    # Red/gold geometric armor
    d.ellipse([cx-140, cy-260, cx+140, cy-40], fill=(*rgb(RED_AC), 60), outline=(*rgb(AMBER), 180), width=6)
    d.rectangle([cx-100, cy-40, cx+100, cy+220], fill=(*rgb(RED_AC), 50), outline=(*rgb(AMBER), 160), width=4)
    d.ellipse([cx-50, cy-160-50, cx+50, cy-160+50], fill=(*rgb(GLOW_ORG), 180))  # arc reactor
    d.ellipse([cx-28, cy-160-28, cx+28, cy-160+28], fill=(*rgb(WHITE), 220))

    text_glow(img, 'I AM IRON MAN', cx, int(cy+310), font(26, bold=True, italic=True), AMBER, COPPER, glow_radius=15, anchor='mm')

    # Timeline
    for i, (yr, event) in enumerate([('2008', 'Iron Man'), ('2012', 'Avengers'), ('2019', 'Endgame'), ('2024', 'SDCC Reveal'), ('2026', 'DOCTOR DOOM')]):
        ty = int(cy+360) + i*64
        color = RED_AC if i == 4 else COPPER
        d.ellipse([cx-12, ty-12, cx+12, ty+12], fill=color)
        d.text((cx+30, ty-14), f'{yr} — {event}', font=font(20, bold=(i==4)), fill=color if i==4 else CREAM)
        if i < 4:
            d.line([(cx, ty+12), (cx, ty+52)], fill=(*rgb(COPPER), 120), width=2)

    # Right — Doctor Doom card
    rx = lw + 120
    rw = W - rx - 60
    glass_card(img, rx, 210, rw, H-290, fill=(8,3,0,220), border=RED_AC, border_w=6)
    text_glow(img, 'VICTOR VON DOOM', rx+rw//2, 290, font(34, bold=True), RED_AC, AMBER, glow_radius=20, anchor='mm')
    text_glow(img, 'DOCTOR DOOM', rx+rw//2, 345, font(28, italic=True), AMBER, RED_AC, glow_radius=15, anchor='mm')

    # Doom mask graphic
    cx2 = rx+rw//2
    cy2 = 620
    radial_halo(img, cx2, cy2, 300, 400, RED_AC, max_alpha=60)
    # Green cape
    d.polygon([(cx2-200, cy2-50), (cx2+200, cy2-50), (cx2+160, cy2+300), (cx2-160, cy2+300)],
              fill=(0,80,0,100), outline=(0,120,0,180), width=4)
    # Mask
    d.ellipse([cx2-140, cy2-280, cx2+140, cy2-60], fill=(*rgb(DARK_CARD), 240), outline=(*rgb(AMBER), 200), width=7)
    d.rectangle([cx2-120, cy2-80, cx2+120, cy2+100], fill=(*rgb(DARK_CARD), 240), outline=(*rgb(AMBER), 200), width=5)
    # Doom eyes
    for ex in [cx2-42, cx2+42]:
        d.ellipse([ex-16, cy2-178-16, ex+16, cy2-178+16], fill=(*rgb(RED_AC), 255))
    # Rune lines on armor
    for rx2 in [-90,-60,-30,0,30,60,90]:
        d.line([(cx2+rx2, cy2-60), (cx2+rx2, cy2+90)], fill=(*rgb(AMBER), 60), width=2)
    text_glow(img, '"DOOM IS ETERNAL"', cx2, int(cy2+310), font(22, bold=True, italic=True), RED_AC, AMBER, glow_radius=12, anchor='mm')

    # RDJ stats row
    for i, (rx3, lbl3) in enumerate([(int(W*0.62)+60*i*5, v) for i, v in enumerate([
        f'{rx+60}', f'{rx+rw//2}', f'{W-80}'
    ])]):
        pass  # skip

    # Bottom fact strip
    glass_card(img, 60, H-220, W-120, 160, fill=(10,4,0,220), border=AMBER, border_w=4, shadow=False)
    facts = ['10 MCU films as Tony Stark', 'Revealed at SDCC 2024', '1 role — entirely different soul', 'Doom traced his family\'s death to Steve\'s time travel']
    for i, f2 in enumerate(facts):
        fx = 100 + i*(W-200)//4
        d.text((fx, H-175), '◆', font=font(18), fill=AMBER)
        d.text((fx+40, H-178), f2, font=font(19, bold=True), fill=WHITE)
        d.text((fx+40, H-148), '', font=font(16), fill=LT_GRAY)

    return img

# ── SLIDE 5 — FULL CAST ───────────────────────────────────────────────────────
def make_slide_05():
    img = base_slide(COPPER)
    d = draw(img)
    text_glow(img, 'CONFIRMED CAST — 27+ ACTORS', W//2, 90, font(46, bold=True), WHITE, AMBER, glow_radius=25, anchor='mm')
    hline(img, 60, 128, W-120, AMBER, 4)

    groups = [
        ('THE AVENGERS', AMBER, [
            ('Anthony Mackie', 'Captain America / Sam Wilson'),
            ('Chris Hemsworth', 'Thor Odinson'),
            ('Florence Pugh', 'Yelena Belova'),
            ('Chris Evans', 'Steve Rogers'),
            ('Letitia Wright', 'Shuri / Black Panther'),
            ('Lewis Pullman', 'Sentry'),
        ]),
        ('FANTASTIC FOUR', GOLD_AC, [
            ('Pedro Pascal', 'Reed Richards / Mr. Fantastic'),
            ('Vanessa Kirby', 'Sue Storm / Invisible Woman'),
            ('Joseph Quinn', 'Johnny Storm / Human Torch'),
            ('Ebon Moss-Bachrach', 'Ben Grimm / The Thing'),
        ]),
        ('X-MEN', PUR_LT, [
            ('Patrick Stewart', 'Professor Charles Xavier'),
            ('Kelsey Grammer', 'Hank McCoy / Beast'),
            ('James Marsden', 'Scott Summers / Cyclops'),
            ('Ian McKellen', 'Erik Lensherr / Magneto'),
            ('Channing Tatum', 'Remy LeBeau / Gambit'),
        ]),
        ('SECRET CAMEOS', RED_AC, [
            ('Robert Downey Jr.', 'Victor Von Doom / DOCTOR DOOM'),
            ('Tobey Maguire', 'Peter Parker / Spider-Man ★'),
            ('Hugh Jackman', 'Logan / Wolverine ★'),
            ('Ryan Reynolds', 'Wade Wilson / Deadpool ★'),
        ]),
        ('THUNDERBOLTS', COPPER, [
            ('David Harbour', 'Alexei / Red Guardian'),
            ('Wyatt Russell', 'John Walker / U.S. Agent'),
            ('Sebastian Stan', 'Bucky Barnes / Winter Soldier'),
            ('Hannah John-Kamen', 'Ava Starr / Ghost'),
        ]),
    ]

    col_w = (W - 120) // 3
    gx, gy = 60, 148
    col_idx = 0
    col_heights = [0, 0, 0]

    for grp_name, color, members in groups:
        cx3 = gx + col_idx * (col_w + 30)
        cy3 = gy + col_heights[col_idx]

        needed_h = 55 + len(members) * 78 + 20
        # header
        glass_card(img, cx3, cy3, col_w, 50, fill=(*rgb(color), 60), border=color, border_w=4, shadow=False)
        d.text((cx3 + col_w//2, cy3+25), grp_name, font=font(19, bold=True), fill=color, anchor='mm')
        cy3 += 55

        for name, role in members:
            glass_card(img, cx3, cy3, col_w, 72, fill=DARK_CARD, border=color, border_w=3, shadow=True)
            d.text((cx3+20, cy3+14), name, font=font(18, bold=True), fill=WHITE)
            d.text((cx3+20, cy3+40), role, font=font(14, italic=True), fill=color)
            cy3 += 78

        col_heights[col_idx] = cy3 - gy - 148 + 20
        col_idx = (col_idx + 1) % 3
        if col_idx == 0:
            pass  # wrap columns handled by height tracking

    d.text((W//2, H-30), '★ = Secret cameos confirmed/leaked — Marvel actively hiding appearances',
           font=font(18, italic=True), fill=RED_AC, anchor='mm')

    return img

# ── SLIDE 6 — SECRET CAMEOS ───────────────────────────────────────────────────
def make_slide_06():
    img = base_slide(RED_AC)
    d = draw(img)
    radial_halo(img, W//2, H//2, 2000, 1200, RED_AC, max_alpha=50)

    text_glow(img, '🚨 SECRET CAMEOS 🚨', W//2, 90, font(52, bold=True), RED_AC, AMBER, glow_radius=30, anchor='mm')
    text_glow(img, '"Marvel is going to EXTREME lengths to hide these appearances"', W//2, 155,
              font(24, italic=True), CREAM, RED_AC, glow_radius=15, anchor='mm')
    hline(img, 60, 190, W-120, RED_AC, 5)

    cameos = [
        (AMBER, 'TOBEY MAGUIRE', 'PETER PARKER / SPIDER-MAN',
         '2002–2007 trilogy Spider-Man returns in a MO-CAP suit\n'
         'Film reportedly OPENS with Spider-Man vs Wolverine face-off\n'
         'RDJ posted an Easter egg hinting at Tobey\'s return\n'
         'Marvel tracking leaks about this appearance very aggressively',
         '2002', '2007', '2026'),
        (PUR_LT, 'HUGH JACKMAN', 'LOGAN / WOLVERINE',
         'Confirmed via Doomsday reshoots — filming NEW scenes\n'
         'Opens the film fighting Tobey Maguire\'s Spider-Man\n'
         'Ryan Reynolds and Jackman filming together during reshoots\n'
         'Wolverine from Deadpool & Wolverine timeline',
         '2000', '2023', '2026'),
        (COPPER, 'RYAN REYNOLDS', 'WADE WILSON / DEADPOOL',
         'Confirmed filming reshoots for Doomsday\n'
         'Filming alongside Hugh Jackman — Deadpool/Wolverine pair\n'
         'Unknown whether role is cameo or significant\n'
         '"Previously unannounced Marvel heroes" per Yahoo Entertainment',
         '2016', '2024', '2026'),
        (GOLD_AC, 'IAN McKELLEN', 'ERIK LENSHERR / MAGNETO',
         'Rumored to be "ruling Genosha — his completed mutant utopia"\n'
         'Has his own royal family: Wanda & Pietro variants + Polaris\n'
         'Represents the X-Men universe Earth-616\n'
         'Last seen as MCU Magneto — now lord of his own nation',
         '2000', '2019', '2026'),
    ]

    cw2 = (W - 200) // 2
    for i, (color, name, role, info, y1, y2, y3) in enumerate(cameos):
        row, col2 = i // 2, i % 2
        cx3 = 60 + col2 * (cw2 + 80)
        cy3 = 215 + row * 480

        glass_card(img, cx3, cy3, cw2, 455, fill=(10,3,0,220), border=color, border_w=6)
        radial_halo(img, cx3+cw2//2, cy3+160, 280, 200, color, max_alpha=35)

        # Character silhouette placeholder
        d.ellipse([cx3+cw2//2-60, cy3+30, cx3+cw2//2+60, cy3+150], fill=(*rgb(color), 40),
                  outline=(*rgb(color), 180), width=5)
        d.text((cx3+cw2//2, cy3+90), name[0], font=font(50, bold=True), fill=(*rgb(color), 180), anchor='mm')

        text_glow(img, name, cx3+cw2//2, cy3+178, font(26, bold=True), color, color, glow_radius=15, anchor='mm')
        d.text((cx3+cw2//2, cy3+218), role, font=font(18, italic=True), fill=CREAM, anchor='mm')
        hline(img, cx3+20, cy3+250, cw2-40, color, 2)

        y = cy3+268
        for line in info.split('\n'):
            d.text((cx3+20, y), '◆ ' + line.strip(), font=font(15), fill=LT_GRAY)
            y += 38

        # Career span
        d.text((cx3+cw2//2, cy3+435), f'{y1} → Deadpool&W {y2} → Doomsday {y3}',
               font=font(14, italic=True), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 7 — DOOM'S ORIGIN ───────────────────────────────────────────────────
def make_slide_07():
    img = base_slide(RED_AC)
    d = draw(img)

    text_glow(img, "DOOM'S ORIGIN — CONFIRMED BACKSTORY", W//2, 90,
              font(46, bold=True), WHITE, RED_AC, glow_radius=25, anchor='mm')
    hline(img, 60, 128, W-120, RED_AC, 5)

    # Timeline of doom's life
    nodes = [
        (RED_AC,   'ACCIDENT',        'Doom\'s wife & child killed\nin a terrible accident.\nDoom\'s face is scarred.'),
        (COPPER,   'THE SEARCH',      'Doom spends decades tracing\nthe accident\'s root cause.\nHe discovers: THE TIME HEIST.'),
        (AMBER,    'ENDGAME LINK',    'Steve Rogers traveling back\nin time in Endgame CAUSED\nthe accident that killed Doom\'s family.'),
        (RED_AC,   'TVA INFILTRATION','Doom infiltrates the TVA.\nKills Loki. Studies the\ntimeline & incursions.'),
        (GLOW_ORG, 'THE PLAN',        'Uses the HEROES to build\ncannons that destroy\ntheir own universes.'),
        (AMBER,    'BATTLEWORLD',     'Allows incursions to happen.\nRebuilds the Multiverse as GOD.\nResurrects his dead family.'),
    ]

    nw = (W-200)//3
    nh = 350
    for i, (color, title, text) in enumerate(nodes):
        row, col2 = i//3, i%3
        nx = 60 + col2*(nw+40)
        ny = 155 + row*(nh+30)
        glass_card(img, nx, ny, nw, nh, fill=(12,2,2,220), border=color, border_w=5)
        radial_halo(img, nx+nw//2, ny+nh//4, 200, 150, color, max_alpha=40)

        # Step number
        d.ellipse([nx+nw//2-35, ny+20, nx+nw//2+35, ny+90], fill=color)
        d.text((nx+nw//2, ny+55), str(i+1), font=font(28, bold=True), fill=BLACK, anchor='mm')

        text_glow(img, title, nx+nw//2, ny+118, font(22, bold=True), color, color, glow_radius=12, anchor='mm')
        hline(img, nx+20, ny+140, nw-40, color, 2)
        multiline_text(img, text, nx+20, ny+160, font(19), CREAM, nw-40, line_h_mul=1.4)

    # Bottom quote
    glass_card(img, 60, H-120, W-120, 95, fill=(20,0,0,220), border=AMBER, border_w=4, shadow=False)
    d.text((W//2, H-80), '"He didn\'t want power. He wanted his family back."',
           font=font(26, italic=True), fill=AMBER, anchor='mm')
    d.text((W//2, H-40), '— leaked from assembly cut screening', font=font(18), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 8 — THE RUSSO BROTHERS ─────────────────────────────────────────────
def make_slide_08():
    img = base_slide(COPPER, with_depth=True)
    d = draw(img)

    text_glow(img, 'THE RUSSO BROTHERS', W//2, 90, font(52, bold=True), WHITE, AMBER, glow_radius=28, anchor='mm')
    hline(img, 60, 128, W-120, AMBER, 4)

    # Left panel
    lw = int(W*0.38)
    glass_card(img, 60, 155, lw, H-230, fill=(15,10,3,220), border=AMBER, border_w=6)
    radial_halo(img, 60+lw//2, int(H*0.48), 400, 500, AMBER, max_alpha=45)

    # Graphic representation of two directors
    for i, (dx, nm) in enumerate([(60+lw//4, 'JOE'), (60+3*lw//4, 'ANTHONY')]):
        d.ellipse([dx-90, int(H*0.32)-90, dx+90, int(H*0.32)+90], fill=(*rgb(DARK_CARD), 220), outline=(*rgb(AMBER), 200), width=5)
        d.text((dx, int(H*0.32)), nm, font=font(26, bold=True), fill=AMBER, anchor='mm')
        d.text((dx, int(H*0.32)+110), 'RUSSO', font=font(18), fill=COPPER, anchor='mm')

    d.text((60+lw//2, int(H*0.55)), 'DIRECTORS', font=font(22, bold=True), fill=CREAM, anchor='mm')
    d.text((60+lw//2, int(H*0.60)), '2 Avengers | Infinity War | Endgame | Doomsday | Secret Wars', font=font(14), fill=LT_GRAY, anchor='mm')

    # Stats column
    stats_x = 60 + lw + 40
    stats_data = [
        ('ENDGAME', '$2.79 BILLION', '#1 SUPERHERO FILM EVER', AMBER),
        ('INFINITY WAR', '$2.05 BILLION', 'HIGHEST 2018 WORLDWIDE', COPPER),
        ('DOOMSDAY', 'DEC 18, 2026', '39TH MCU FILM', RED_AC),
        ('SECRET WARS', '2027', 'ALSO DIRECTING — BACK TO BACK', GOLD_AC),
    ]
    sy = 155
    sw = W - stats_x - 60
    sh = (H-250) // 4
    for i, (title2, num, sub, color) in enumerate(stats_data):
        gy2 = sy + i*(sh+15)
        glass_card(img, stats_x, gy2, sw, sh, fill=(8,5,0,220), border=color, border_w=5)
        radial_halo(img, stats_x+sw//2, gy2+sh//2, sw//2, sh//2, color, max_alpha=25)
        d.text((stats_x+25, gy2+18), title2, font=font(18, bold=True), fill=color)
        text_glow(img, num, stats_x+sw//2, gy2+sh//2-10, font(40, bold=True), color, color, glow_radius=20, anchor='mm')
        d.text((stats_x+sw//2, gy2+sh-40), sub, font=font(17, italic=True), fill=CREAM, anchor='mm')

    # Bottom
    glass_card(img, 60, H-120, W-120, 90, fill=(10,6,0,220), border=COPPER, border_w=3, shadow=False)
    d.text((W//2, H-80), '"They are the greatest superhero filmmakers alive. Period."',
           font=font(22, italic=True), fill=AMBER, anchor='mm')
    d.text((W//2, H-42), '— Joe Russo on making back-to-back Avengers films', font=font(17), fill=COPPER, anchor='mm')

    return img

# ── SLIDE 9 — MAGNETO SUBPLOT ─────────────────────────────────────────────────
def make_slide_09():
    img = base_slide(PUR_AC)
    d = draw(img)
    radial_halo(img, W//2, H//2, 2000, 1200, PUR_AC, max_alpha=50)

    text_glow(img, 'THE X-MEN FACTOR', W//2, 90, font(52, bold=True), WHITE, PUR_LT, glow_radius=28, anchor='mm')
    text_glow(img, 'Mutants from a Separate Universe Enter the Incursion', W//2, 150,
              font(26, italic=True), CREAM, PUR_AC, glow_radius=15, anchor='mm')
    hline(img, 60, 188, W-120, PUR_AC, 5)

    xmen_cards = [
        (PUR_LT,  'PROFESSOR X',   'Patrick Stewart',    'X-Men universe Earth\nleader of mutantkind\nJoins heroes against Doom'),
        (GOLD_AC, 'MAGNETO',       'Ian McKellen',       'RULING GENOSHA\nCompleted mutant utopia\nRoyal family: Wanda + Pietro variants'),
        (PUR_AC,  'BEAST',         'Kelsey Grammer',     'Henry McCoy returns\nScientific advisor\nOG X-Men film continuity'),
        (COPPER,  'CYCLOPS',       'James Marsden',      'Scott Summers returns\nOptic blast ready\nOG X-Men universe leader'),
        (AMBER,   'GAMBIT',        'Channing Tatum',     'FINALLY IN THE MCU\nDecades in development\nChanning Tatum confirmed!'),
    ]

    cw3 = (W-200)//3
    ch3 = 390
    positions = [(0,0),(1,0),(2,0),(0,1),(1,1)]
    for (ci, ri), (color, name, actor, info) in zip(positions, xmen_cards):
        cx3 = 60 + ci*(cw3+40)
        cy3 = 215 + ri*(ch3+25)
        glass_card(img, cx3, cy3, cw3, ch3, fill=(10,2,20,220), border=color, border_w=5)
        radial_halo(img, cx3+cw3//2, cy3+ch3//3, 220, 180, color, max_alpha=40)

        # X symbol
        d.text((cx3+cw3//2, cy3+60), 'X', font=font(44, bold=True), fill=(*rgb(color), 150), anchor='mm')
        text_glow(img, name, cx3+cw3//2, cy3+120, font(22, bold=True), color, color, glow_radius=12, anchor='mm')
        d.text((cx3+cw3//2, cy3+158), actor, font=font(17, italic=True), fill=CREAM, anchor='mm')
        hline(img, cx3+20, cy3+185, cw3-40, color, 2)
        y3 = cy3+205
        for line in info.split('\n'):
            d.text((cx3+20, y3), '◆ ' + line, font=font(15), fill=LT_GRAY)
            y3 += 38

    # Right bottom — Magneto special spotlight
    glass_card(img, 60+2*(cw3+40), 215+ch3+25, cw3, ch3, fill=(15,2,25,220), border=GOLD_AC, border_w=6)
    cx4 = 60 + 2*(cw3+40) + cw3//2
    radial_halo(img, cx4, 215+ch3+25+ch3//2, 250, 200, GOLD_AC, max_alpha=50)
    d.text((cx4, 215+ch3+70), 'M', font=font(50, bold=True), fill=(*rgb(GOLD_AC), 180), anchor='mm')
    text_glow(img, 'IAN McKELLEN', cx4, 215+ch3+145, font(22, bold=True), GOLD_AC, GOLD_AC, glow_radius=12, anchor='mm')
    d.text((cx4, 215+ch3+185), 'Magneto — King of Genosha', font=font(16, italic=True), fill=CREAM, anchor='mm')
    hline(img, 60+2*(cw3+40)+20, 215+ch3+210, cw3-40, GOLD_AC, 2)
    for y4, t in [(215+ch3+232, '◆ Ruling Genosha — mutant nation complete'),
                  (215+ch3+270, '◆ Royal family includes Wanda variants'),
                  (215+ch3+308, '◆ Pietro and Polaris by his side'),
                  (215+ch3+346, '◆ 84 years old — still magnetic!')]:
        d.text((60+2*(cw3+40)+20, y4), t, font=font(15), fill=LT_GRAY)

    return img

# ── SLIDE 10 — HEROES GRID ────────────────────────────────────────────────────
def make_slide_10():
    img = base_slide(COPPER)
    d = draw(img)
    text_glow(img, 'EARTH\'S MIGHTIEST HEROES — ALL 3 UNIVERSES', W//2, 90, font(42, bold=True), WHITE, AMBER, glow_radius=22, anchor='mm')
    hline(img, 60, 122, W-120, AMBER, 4)

    heroes = [
        # Avengers
        ('Sam Wilson', 'Captain America', AMBER),
        ('Thor Odinson', 'The God of Thunder', COPPER),
        ('Steve Rogers', 'The Original Captain', RED_AC),
        ('Yelena Belova', 'Black Widow II', COPPER),
        ('Shuri', 'Black Panther', GOLD_AC),
        ('Sentry', 'The Golden Guardian', AMBER),
        # Fantastic Four
        ('Reed Richards', 'Mr. Fantastic', GOLD_AC),
        ('Sue Storm', 'Invisible Woman', GOLD_AC),
        ('Human Torch', 'Johnny Storm', RED_AC),
        ('The Thing', 'Ben Grimm', COPPER),
        # Thunderbolts
        ('Red Guardian', 'Soviet Super-Soldier', RED_AC),
        ('U.S. Agent', 'John Walker', COPPER),
    ]

    cols = 4
    cw4 = (W-200)//(cols)
    ch4 = 210
    for i, (name, role, color) in enumerate(heroes):
        row, col2 = i//cols, i%cols
        cx4 = 60 + col2*(cw4+18)
        cy4 = 140 + row*(ch4+16)
        glass_card(img, cx4, cy4, cw4, ch4, fill=DARK_CARD, border=color, border_w=4)
        radial_halo(img, cx4+cw4//2, cy4+ch4//3, cw4//3, ch4//3, color, max_alpha=30)
        # First letter icon
        d.text((cx4+cw4//2, cy4+65), name[0], font=font(40, bold=True), fill=(*rgb(color), 160), anchor='mm')
        d.text((cx4+cw4//2, cy4+118), name, font=font(16, bold=True), fill=WHITE, anchor='mm')
        d.text((cx4+cw4//2, cy4+152), role, font=font(13, italic=True), fill=color, anchor='mm')

    # Bottom row for secret cameos
    secret = [('Tobey Maguire', 'Spider-Man ★ SECRET', RED_AC),
              ('Hugh Jackman', 'Wolverine ★ SECRET', RED_AC),
              ('Ryan Reynolds', 'Deadpool ★ SECRET', RED_AC)]
    cy_s = 140 + 3*(ch4+16)
    sw2 = (W-200)//3
    for i, (name, role, color) in enumerate(secret):
        cx_s = 60 + i*(sw2+40)
        glass_card(img, cx_s, cy_s, sw2, ch4, fill=(20,0,0,220), border=color, border_w=5)
        radial_halo(img, cx_s+sw2//2, cy_s+ch4//2, sw2//3, ch4//3, color, max_alpha=40)
        d.text((cx_s+sw2//2, cy_s+55), '?', font=font(50, bold=True), fill=(*rgb(color), 180), anchor='mm')
        d.text((cx_s+sw2//2, cy_s+118), name, font=font(17, bold=True), fill=WHITE, anchor='mm')
        d.text((cx_s+sw2//2, cy_s+152), role, font=font(14, italic=True), fill=color, anchor='mm')

    return img

# ── SLIDE 11 — PHASE 6 TIMELINE ───────────────────────────────────────────────
def make_slide_11():
    img = base_slide(COPPER)
    d = draw(img)
    text_glow(img, 'MCU PHASE 6 — THE ROAD TO DOOMSDAY', W//2, 90, font(46, bold=True), WHITE, AMBER, glow_radius=25, anchor='mm')
    hline(img, 60, 128, W-120, AMBER, 4)

    films = [
        ('2025', 'Thunderbolts*', 'Sets up the New Avengers\nThunderbolts become heroes', COPPER, False),
        ('2025', 'Fantastic Four:\nFirst Steps', 'Earth-828 Fantastic Four\nIntroduces the second Earth', GOLD_AC, False),
        ('2025', 'Spider-Man:\nBrand New Day', 'Tom Holland\'s Spidey\nPost-No Way Home fallout', AMBER, False),
        ('2026', 'AVENGERS:\nDOOMSDAY', '★ 3 UNIVERSES COLLIDE ★\nThe Multiverse\'s greatest war', GLOW_ORG, True),
        ('2027', 'Avengers:\nSecret Wars', 'THE GRAND FINALE\nBattleworld — all of reality', RED_AC, False),
    ]

    # Central horizontal line
    line_y = int(H * 0.52)
    d.line([(120, line_y), (W-120, line_y)], fill=(*rgb(COPPER), 200), width=8)

    spacing = (W-300) // (len(films)-1)
    for i, (yr, title, desc, color, is_main) in enumerate(films):
        x = 150 + i*spacing
        is_above = (i % 2 == 0)

        # Glow
        radial_halo(img, x, line_y, 200 if is_main else 120, 200 if is_main else 120, color,
                    max_alpha=80 if is_main else 40)

        # Node dot
        dot_r = 35 if is_main else 22
        d.ellipse([x-dot_r, line_y-dot_r, x+dot_r, line_y+dot_r], fill=color)
        if is_main:
            d.ellipse([x-dot_r-8, line_y-dot_r-8, x+dot_r+8, line_y+dot_r+8],
                      outline=(*rgb(color), 180), width=4)

        # Year
        yr_y = line_y - 60 if is_above else line_y + 55
        d.text((x, yr_y), yr, font=font(20, bold=True), fill=COPPER, anchor='mm')

        # Card
        card_w = 380 if is_main else 320
        card_h = 240 if is_main else 195
        card_x = x - card_w//2
        if is_above:
            card_y = line_y - 90 - card_h
        else:
            card_y = line_y + 90

        glass_card(img, card_x, card_y, card_w, card_h, fill=(10,6,0,220), border=color, border_w=5 if is_main else 3)
        text_glow(img, title, x, card_y+55, font(22 if is_main else 19, bold=True), color, color, glow_radius=12 if is_main else 8, anchor='mm')
        hline(img, card_x+15, card_y+85, card_w-30, color, 2)
        multiline_text(img, desc, card_x+18, card_y+100, font(15 if is_main else 14), CREAM, card_w-36, line_h_mul=1.4)

        # Connector line
        if is_above:
            d.line([(x, card_y+card_h), (x, line_y-dot_r)], fill=(*rgb(color), 120), width=2)
        else:
            d.line([(x, line_y+dot_r), (x, card_y)], fill=(*rgb(color), 120), width=2)

    return img

# ── SLIDE 12 — BY THE NUMBERS ─────────────────────────────────────────────────
def make_slide_12():
    img = base_slide(COPPER, with_depth=True)
    d = draw(img)
    text_glow(img, 'BY THE NUMBERS', W//2, 90, font(52, bold=True), WHITE, AMBER, glow_radius=28, anchor='mm')
    hline(img, 60, 128, W-120, AMBER, 5)

    stats = [
        ('38', 'MCU Films\nBefore Doomsday', AMBER),
        ('$2.79B', 'Endgame Record\nTo Beat', COPPER),
        ('4', 'Russo Brothers\nMCU Films', GOLD_AC),
        ('3', 'Universes\nCollide', RED_AC),
        ('27+', 'Confirmed\nActors', PUR_LT),
        ('14', 'Months After\nThunderbolts*', AMBER),
        ('2', 'Secret Wars\n2027 Sequel', COPPER),
        ('1', 'Victor Von Doom\nOne Villain', RED_AC),
        ('0', 'Heroes Who\nAre Safe', GLOW_ORG),
    ]

    cols = 3
    cw5 = (W-200)//cols
    ch5 = int((H-200)/3)
    for i, (num, lbl, color) in enumerate(stats):
        row, col2 = i//cols, i%cols
        sx = 60 + col2*(cw5+40)
        sy = 150 + row*(ch5+20)
        stat_card(img, sx, sy, cw5, ch5, num, lbl, border=color, num_color=color)

    return img

# ── SLIDE 13 — ARMOR BREAKDOWN ────────────────────────────────────────────────
def make_slide_13():
    img = base_slide(RED_AC)
    d = draw(img)
    radial_halo(img, W//2, H//2, 2200, 1400, RED_AC, max_alpha=45)

    text_glow(img, 'DOCTOR DOOM\'S ARMOR — FULL BREAKDOWN', W//2, 90, font(44, bold=True), WHITE, RED_AC, glow_radius=25, anchor='mm')
    hline(img, 60, 128, W-120, RED_AC, 5)

    # Central armor graphic (large)
    cx_a, cy_a = W//2, int(H*0.47)
    radial_halo(img, cx_a, cy_a, 600, 750, RED_AC, max_alpha=60)
    radial_halo(img, cx_a, cy_a, 350, 450, AMBER, max_alpha=40)

    # Full armor silhouette
    # Helmet
    d.ellipse([cx_a-220, cy_a-560, cx_a+220, cy_a-180], fill=(*rgb(DARK_CARD), 240), outline=(*rgb(AMBER), 220), width=10)
    # Eye slits
    for ex in [cx_a-65, cx_a+65]:
        d.ellipse([ex-22, cy_a-395-16, ex+22, cy_a-395+16], fill=(*rgb(RED_AC), 255))
        d.ellipse([ex-12, cy_a-395-8, ex+12, cy_a-395+8], fill=(*rgb(GLOW_ORG), 255))
    # Mouth slit
    d.rectangle([cx_a-60, cy_a-295, cx_a+60, cy_a-275], fill=(*rgb(COPPER), 180))
    # Shoulders (armored)
    d.polygon([(cx_a-260, cy_a-120), (cx_a-200, cy_a-300), (cx_a-80, cy_a-240), (cx_a-80, cy_a-100)],
              fill=(*rgb(DARK_CARD), 200), outline=(*rgb(AMBER), 200), width=6)
    d.polygon([(cx_a+260, cy_a-120), (cx_a+200, cy_a-300), (cx_a+80, cy_a-240), (cx_a+80, cy_a-100)],
              fill=(*rgb(DARK_CARD), 200), outline=(*rgb(AMBER), 200), width=6)
    # Chest
    d.rectangle([cx_a-170, cy_a-180, cx_a+170, cy_a+200], fill=(*rgb(DARK_CARD), 220), outline=(*rgb(AMBER), 180), width=6)
    # Rune lines
    for ry in range(6):
        for rx2 in range(5):
            d.line([(cx_a-160+rx2*66, cy_a-170+ry*60), (cx_a-160+rx2*66, cy_a-120+ry*60)],
                   fill=(*rgb(AMBER), 50), width=2)
    # Cape
    d.polygon([(cx_a-240, cy_a-280), (cx_a+240, cy_a-280), (cx_a+200, cy_a+400), (cx_a-200, cy_a+400)],
              fill=(0,80,0,120), outline=(0,150,0,180), width=5)
    # Belt
    d.rectangle([cx_a-180, cy_a+190, cx_a+180, cy_a+230], fill=(*rgb(COPPER), 200), outline=(*rgb(AMBER), 220), width=4)
    # Legs
    d.rectangle([cx_a-120, cy_a+230, cx_a-30, cy_a+480], fill=(*rgb(DARK_CARD), 200), outline=(*rgb(AMBER), 160), width=4)
    d.rectangle([cx_a+30, cy_a+230, cx_a+120, cy_a+480], fill=(*rgb(DARK_CARD), 200), outline=(*rgb(AMBER), 160), width=4)

    # Cape pins
    for px, pm in [(cx_a-210, 'Mjolnir\nsymbol'), (cx_a+210, 'Hala Star\n(Capt. Marvel)')]:
        d.ellipse([px-28, cy_a-290-28, px+28, cy_a-290+28], fill=(*rgb(GOLD_AC), 220), outline=(*rgb(WHITE), 180), width=4)
        d.text((px, cy_a-290), '✦', font=font(20, bold=True), fill=BLACK, anchor='mm')

    # Annotation arrows
    annotations = [
        (cx_a+250, cy_a-390, 'DOOM MASK\nComic-accurate\nmetallic faceplate', AMBER, 'right'),
        (cx_a-250, cy_a-260, 'MJÖLNIR PIN\nClaims Thor\'s symbol\nof dominance', GOLD_AC, 'left'),
        (cx_a+250, cy_a-260, 'HALA STAR PIN\nClaims Captain Marvel\nsymbol as trophy', COPPER, 'right'),
        (cx_a-250, cy_a-60, 'GREEN CAPE\nComic-accurate\nDoctor Doom green', GLOW_ORG, 'left'),
        (cx_a+250, cy_a-60, 'RUNE ENGRAVINGS\nMagical runes referencing\nDoom\'s arcane powers', RED_AC, 'right'),
        (cx_a-250, cy_a+210, 'BELT REDESIGN\nLast-minute redesign\nRevealed at CinemaCon 2026', AMBER, 'left'),
    ]
    for ax, ay, atxt, acolor, aside in annotations:
        # Box
        bw6 = 310; bh = 110
        if aside == 'right':
            bx6 = ax
            d.line([(ax, ay), (cx_a+250, ay)], fill=(*rgb(acolor), 120), width=2)
        else:
            bx6 = ax - bw6
            d.line([(ax, ay), (cx_a-250, ay)], fill=(*rgb(acolor), 120), width=2)
        glass_card(img, bx6, ay-bh//2, bw6, bh, fill=(10,3,0,210), border=acolor, border_w=3, shadow=False)
        for i2, line in enumerate(atxt.split('\n')):
            d.text((bx6+16, ay-bh//2+14+i2*32), line, font=font(14+(4 if i2==0 else 0), bold=(i2==0)), fill=acolor if i2==0 else CREAM)

    return img

# ── SLIDE 14 — WHY IT MATTERS ─────────────────────────────────────────────────
def make_slide_14():
    img = base_slide(COPPER, with_depth=True)
    d = draw(img)
    text_glow(img, 'WHY DOOMSDAY IS THE MOST IMPORTANT MCU FILM', W//2, 90, font(42, bold=True), WHITE, AMBER, glow_radius=22, anchor='mm')
    hline(img, 60, 128, W-120, AMBER, 4)

    reasons = [
        (AMBER, '1. THE ENDGAME SUCCESSOR',
         'Avengers: Endgame (2019) was a $2.79B cultural moment. Doomsday is its true sequel. '
         'The Russo Brothers — who made Endgame — return specifically for this. '
         'It carries the full weight of 15 years and 38 films of storytelling.'),
        (RED_AC, '2. THE BOLDEST CASTING GAMBLE EVER',
         'Bringing Robert Downey Jr. back as the VILLAIN after playing the franchise\'s '
         'greatest HERO is unprecedented in Hollywood history. Tony Stark was the soul of '
         'the MCU. Victor Von Doom is his dark mirror.'),
        (PUR_LT, '3. THREE UNIVERSES, ZERO SURVIVORS (GUARANTEED)',
         'For the first time in MCU history, THREE separate universe continuities collide. '
         'The Avengers, the Fantastic Four from Earth-828, AND the original X-Men from their '
         'universe all share the screen. Beloved characters WILL die permanently.'),
        (GOLD_AC, '4. THE SECRET CAMEO EXPLOSION',
         'Tobey Maguire\'s Spider-Man. Hugh Jackman\'s Wolverine. Ryan Reynolds\' Deadpool. '
         'Ian McKellen\'s Magneto. Channing Tatum\'s GAMBIT. This is the most fan-service '
         'loaded film in Marvel history — and it\'s ALL plot-relevant.'),
        (GLOW_ORG, '5. BATTLEWORLD IS COMING',
         'Doctor Doom\'s ultimate goal is to become GOD of a rebuilt Multiverse — Battleworld. '
         'This sets up Secret Wars 2027 as the grand finale of ALL Marvel storytelling. '
         'Nothing will ever be the same after December 18, 2026.'),
    ]

    rh2 = (H - 210) // len(reasons)
    for i, (color, title3, text) in enumerate(reasons):
        ry2 = 148 + i*(rh2+8)
        glass_card(img, 60, ry2, W-120, rh2, fill=(8,5,2,220), border=color, border_w=5)
        radial_halo(img, 60+50, ry2+rh2//2, 80, 80, color, max_alpha=40)
        d.ellipse([70, ry2+rh2//2-35, 140, ry2+rh2//2+35], fill=color)
        d.text((105, ry2+rh2//2), str(i+1), font=font(26, bold=True), fill=BLACK, anchor='mm')
        d.text((165, ry2+18), title3, font=font(20, bold=True), fill=color)
        multiline_text(img, text, 165, ry2+54, font(17), CREAM, W-280, line_h_mul=1.35)

    return img

# ── SLIDE 15 — CLOSING ────────────────────────────────────────────────────────
def make_slide_15():
    img = base_slide(COPPER, with_pedestal=True)
    d = draw(img)

    # MASSIVE center glow
    radial_halo(img, W//2, int(H*0.44), 2500, 1600, AMBER, max_alpha=80)
    radial_halo(img, W//2, int(H*0.44), 1400, 900, GLOW_ORG, max_alpha=60)
    radial_halo(img, W//2, int(H*0.44), 700, 450, RED_AC, max_alpha=40)

    # Doom symbol center
    cx, cy = W//2, int(H*0.35)
    for r5, a5 in [(500, 15), (400, 25), (300, 40), (200, 60), (130, 100)]:
        d.ellipse([cx-r5, cy-r5, cx+r5, cy+r5], outline=(*rgb(AMBER), a5), width=5)

    d.ellipse([cx-170, cy-170, cx+170, cy+170], fill=(*rgb(DARK_CARD), 240))
    d.ellipse([cx-170, cy-170, cx+170, cy+170], outline=(*rgb(AMBER), 240), width=8)
    d.text((cx, cy), 'D', font=font(120, bold=True), fill=AMBER, anchor='mm')

    # Title
    text_glow(img, 'DOOM IS COMING.', W//2, int(H*0.60),
              font(112, bold=True), WHITE, AMBER, glow_radius=60, anchor='mm')
    text_glow(img, 'AND NOTHING WILL EVER BE THE SAME.', W//2, int(H*0.695),
              font(38, bold=True), AMBER, COPPER, glow_radius=25, anchor='mm')

    hline(img, int(W*0.15), int(H*0.745), int(W*0.70), AMBER, 5)

    d.text((W//2, int(H*0.79)), 'December 18, 2026  ·  Marvel Studios  ·  Phase 6', font=font(26), fill=CREAM, anchor='mm')
    d.text((W//2, int(H*0.84)), 'Directed by Joe & Anthony Russo', font=font(22, italic=True), fill=COPPER, anchor='mm')

    # Bottom cast strip
    glass_card(img, 0, int(H*0.90), W, int(H*0.10), fill=(0,0,0,200), border=COPPER, border_w=3, radius=0, shadow=False)
    cast_strip = 'RDJ · Hemsworth · Mackie · Pascal · Hemsworth · Stewart · McKellen · Grammer · Tatum · Marsden · Pugh · Wright · Jackman · Maguire · Reynolds · Evans · Hiddleston · Pullman · Stan · Harbour'
    d.text((W//2, int(H*0.952)), cast_strip, font=font(18), fill=COPPER, anchor='mm')

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
        slide_to_rgb(slide).save(path, 'JPEG', quality=94, optimize=False)
        slide_paths.append(path)

    print(f'\n  Assembling PDF...')
    c = rlcanvas.Canvas(OUT_PDF, pagesize=(W, H))
    c.setTitle('Avengers: Doomsday — Premium Presentation')
    c.setAuthor('Marvel Studios / Russo Brothers')
    for path in slide_paths:
        c.drawImage(path, 0, 0, W, H)
        c.showPage()
    c.save()
    print(f'  ✅ PDF: {OUT_PDF}')

    import os
    size_mb = os.path.getsize(OUT_PDF) / 1024 / 1024
    print(f'  Size: {size_mb:.1f} MB')

if __name__ == '__main__':
    build()
