#!/usr/bin/env python3
"""
Avengers: Doomsday — 15-slide PDF in dark copper glow style
Uses reportlab; outputs a PDF readable on any mobile device.
"""

from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
import math

# ── SETUP ─────────────────────────────────────────────────────────────────────
W, H = 13.3 * inch, 7.5 * inch

# Register fonts
FONTS = {
    'sans':      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    'sans-b':    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    'sans-bi':   '/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf',
    'sans-i':    '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf',
}
for name, path in FONTS.items():
    pdfmetrics.registerFont(TTFont(name, path))

# Colors
BG      = HexColor('#000000')
WHITE   = HexColor('#FFFFFF')
COPPER  = HexColor('#C87941')
AMBER   = HexColor('#E8923A')
CREAM   = HexColor('#F5E6D0')
GRAY    = HexColor('#CCCCCC')
DCARD   = HexColor('#111111')
DCARD2  = HexColor('#0A0A0A')
RED_AC  = HexColor('#C02020')
PUR_AC  = HexColor('#7B1FA2')
PUR_LT  = HexColor('#AB47BC')
GOLD_AC = HexColor('#D4AF37')

# ── DRAWING HELPERS ───────────────────────────────────────────────────────────

def bg_black(c):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

def floor_glow(c, accent=COPPER):
    """Gradient-like floor strip at bottom 25%"""
    fh = H * 0.25
    fy = 0
    steps = 16
    for i in range(steps):
        t = i / steps
        alpha = (1 - t) * 0.55
        r = accent.red + (BG.red - accent.red) * t
        g = accent.green + (BG.green - accent.green) * t
        b = accent.blue + (BG.blue - accent.blue) * t
        strip_h = fh / steps
        col = Color(r, g, b, alpha=alpha)
        c.setFillColor(col)
        c.rect(0, fy + i * strip_h, W, strip_h + 1, fill=1, stroke=0)
    # Bright copper line at junction
    c.setFillColor(Color(accent.red, accent.green, accent.blue, alpha=0.9))
    c.rect(0, H * 0.75, W, 2, fill=1, stroke=0)

def light_beams(c, accent=COPPER):
    """Two diagonal volumetric light shafts"""
    c.saveState()
    for xf, wf in [(0.54, 0.018), (0.74, 0.012)]:
        c.setFillColor(Color(accent.red, accent.green, accent.blue, alpha=0.06))
        c.saveState()
        c.translate(W * xf, H / 2)
        c.rotate(30)
        c.rect(-W * wf / 2, -H * 0.8, W * wf, H * 1.6, fill=1, stroke=0)
        c.restoreState()
    c.restoreState()

def halo(c, cx, cy, rw, rh2, col, alpha=0.30):
    """Soft radial glow halo"""
    c.saveState()
    steps = 10
    for i in range(steps, 0, -1):
        t = i / steps
        a = alpha * (1 - t) * 1.5
        a = min(a, alpha)
        c.setFillColor(Color(col.red, col.green, col.blue, alpha=a))
        c.ellipse(cx - rw * t / 2, cy - rh2 * t / 2,
                  cx + rw * t / 2, cy + rh2 * t / 2, fill=1, stroke=0)
    c.restoreState()

def pedestal_ring(c, col=COPPER):
    cx, cy = W / 2, H * 0.72
    c.setFillColor(Color(col.red, col.green, col.blue, alpha=0.35))
    c.ellipse(cx - 2.5*inch, cy - 0.35*inch, cx + 2.5*inch, cy + 0.35*inch, fill=1, stroke=0)
    c.setFillColor(Color(col.red, col.green, col.blue, alpha=0.20))
    c.ellipse(cx - 1.5*inch, cy - 0.18*inch, cx + 1.5*inch, cy + 0.18*inch, fill=1, stroke=0)

def card(c, x, y, w, h, fc=DCARD, border=AMBER, bw=2, alpha=0.88):
    """Dark floating card with colored border"""
    # Shadow
    c.setFillColor(Color(0, 0, 0, alpha=0.55))
    c.roundRect(x + 6, y - 6, w, h, 4, fill=1, stroke=0)
    # Fill
    c.setFillColor(Color(fc.red, fc.green, fc.blue, alpha=alpha))
    c.roundRect(x, y, w, h, 4, fill=1, stroke=0)
    # Border glow (softer outer)
    c.setStrokeColor(Color(border.red, border.green, border.blue, alpha=0.35))
    c.setLineWidth(bw + 2)
    c.roundRect(x, y, w, h, 4, fill=0, stroke=1)
    # Border
    c.setStrokeColor(border)
    c.setLineWidth(bw)
    c.roundRect(x, y, w, h, 4, fill=0, stroke=1)

def depth_panels(c, accent=COPPER):
    card(c, 0.4*inch, H*0.12, 3.5*inch, 5.0*inch, fc=DCARD2, border=accent, bw=1, alpha=0.55)
    card(c, W - 3.9*inch, H*0.15, 3.5*inch, 4.8*inch, fc=DCARD2, border=accent, bw=1, alpha=0.55)

def hline(c, x, y, w, col=COPPER, lw=1.2):
    c.setStrokeColor(col)
    c.setLineWidth(lw)
    c.line(x, y, x + w, y)

def title_text(c, text, x, y, w, sz=52, col=WHITE, font='sans-b', align='center'):
    c.setFont(font, sz)
    c.setFillColor(col)
    if align == 'center':
        c.drawCentredString(x + w / 2, y, text)
    elif align == 'left':
        c.drawString(x, y, text)
    else:
        c.drawRightString(x + w, y, text)

def wrap_text(c, text, x, y, w, sz=14, col=GRAY, font='sans', line_h=None):
    """Simple word-wrap text drawing"""
    if line_h is None:
        line_h = sz * 1.4
    c.setFont(font, sz)
    c.setFillColor(col)
    words = text.split()
    line = ''
    cur_y = y
    for word in words:
        test = (line + ' ' + word).strip()
        if c.stringWidth(test, font, sz) <= w:
            line = test
        else:
            if line:
                c.drawString(x, cur_y, line)
                cur_y -= line_h
            line = word
    if line:
        c.drawString(x, cur_y, line)
    return cur_y - line_h

def bullet_list(c, items, x, y, w, sz=14, col=GRAY, bullet_col=AMBER, line_h=None):
    if line_h is None:
        line_h = sz * 1.55
    cur_y = y
    c.setFont('sans', sz)
    for item in items:
        c.setFillColor(bullet_col)
        c.drawString(x, cur_y, '◆')
        c.setFillColor(col)
        # Word-wrap item text
        tw = w - 0.35*inch
        words = item.split()
        line = ''
        first_line = True
        iy = cur_y
        for word in words:
            test = (line + ' ' + word).strip()
            if c.stringWidth(test, 'sans', sz) <= tw:
                line = test
            else:
                if line:
                    c.drawString(x + 0.3*inch, iy, line)
                    iy -= line_h
                    if first_line:
                        first_line = False
                line = word
        if line:
            c.drawString(x + 0.3*inch, iy, line)
            iy -= line_h
        cur_y = min(iy, cur_y - line_h)
    return cur_y

def stat_block(c, x, y, w, h, number, label, border=AMBER, num_col=AMBER, nsz=44):
    card(c, x, y, w, h, border=border, alpha=0.88)
    # Number
    c.setFont('sans-b', nsz)
    c.setFillColor(num_col)
    c.drawCentredString(x + w/2, y + h - nsz*1.3, number)
    # Label
    c.setFont('sans', 12)
    c.setFillColor(WHITE)
    for i, ln in enumerate(label.split('\n')):
        c.drawCentredString(x + w/2, y + h - nsz*1.3 - 18 - i*16, ln)

def char_card_pdf(c, x, y, w, h, name, actor, border=AMBER):
    card(c, x, y, w, h, border=border, alpha=0.88)
    ih = h * 0.62
    # Image area glow
    halo(c, x + w/2, y + ih/2 + (h-ih), w * 0.5, ih * 0.5, AMBER, 0.25)
    hline(c, x, y + (h - ih), w, border, 0.8)
    # Name
    c.setFont('sans-b', 13)
    c.setFillColor(WHITE)
    c.drawCentredString(x + w/2, y + (h - ih) - 18, name)
    # Actor
    c.setFont('sans-i', 11)
    c.setFillColor(border)
    c.drawCentredString(x + w/2, y + (h - ih) - 34, actor)

def base_slide(c, accent=COPPER, with_depth=False):
    bg_black(c)
    floor_glow(c, accent)
    light_beams(c, accent)
    if with_depth:
        depth_panels(c, accent)

# ── SLIDES ────────────────────────────────────────────────────────────────────

def slide01(c):
    base_slide(c, COPPER)
    pedestal_ring(c, COPPER)
    # Big halo behind logo
    halo(c, W/2, H*0.55, 4.5*inch, 3.5*inch, AMBER, 0.35)
    # Logo symbol
    c.setFont('sans-b', 86)
    c.setFillColor(AMBER)
    c.drawCentredString(W/2, H*0.63, '⬡  A  ⬡')
    # Title
    c.setFont('sans-b', 58)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H*0.40, 'AVENGERS: DOOMSDAY')
    # Copper glow line under title
    hline(c, 1.5*inch, H*0.38, W - 3*inch, AMBER, 1.5)
    # Subtitle
    c.setFont('sans-i', 20)
    c.setFillColor(CREAM)
    c.drawCentredString(W/2, H*0.30, '"The Beginning of the End of the Multiverse Saga"')
    # Bottom info
    c.setFont('sans', 14)
    c.setFillColor(COPPER)
    c.drawCentredString(W/2, 0.35*inch, 'Marvel Studios  ·  Phase 6  ·  December 18, 2026')

def slide02(c):
    base_slide(c, COPPER, with_depth=True)
    card(c, 1.3*inch, 0.85*inch, W - 2.6*inch, H - 1.4*inch, border=AMBER, bw=2)
    c.setFont('sans-b', 40)
    c.setFillColor(WHITE)
    c.drawString(1.7*inch, H - 1.25*inch, 'WHAT IS THIS FILM?')
    hline(c, 1.7*inch, H - 1.45*inch, W - 3.4*inch)
    c.setFont('sans-i', 18)
    c.setFillColor(CREAM)
    c.drawString(1.7*inch, H - 1.75*inch, 'The 39th Marvel Cinematic Universe Feature Film')
    bullet_list(c, [
        'Directed by Joe & Anthony Russo — back in the MCU after Endgame',
        'Doctor Doom (Robert Downey Jr.) replaces Kang as the central villain',
        'Follows Thunderbolts* and Fantastic Four — bridges Phase 5 → Phase 6',
        'Sets the stage for the grand finale: Avengers: Secret Wars (2027)',
        'Largest ensemble cast in MCU history across 3 parallel universes',
    ], 1.7*inch, H - 2.15*inch, W - 3.5*inch, sz=15, line_h=24)
    # Stat bar
    for i, (v, l) in enumerate([('39th', 'MCU Film'), ('Phase 6', 'Timeline'), ('Dec 2026', 'Release')]):
        bx = 1.3*inch + i * (W - 2.6*inch) / 3
        bw2 = (W - 2.6*inch) / 3 - 0.1*inch
        c.setFillColor(Color(0.1, 0.04, 0, alpha=0.95))
        c.roundRect(bx, 0.95*inch, bw2, 0.45*inch, 3, fill=1, stroke=0)
        c.setStrokeColor(COPPER)
        c.setLineWidth(1)
        c.roundRect(bx, 0.95*inch, bw2, 0.45*inch, 3, fill=0, stroke=1)
        c.setFont('sans-b', 13)
        c.setFillColor(AMBER)
        c.drawCentredString(bx + bw2/2, 1.12*inch, f'{v}  ·  {l}')

def slide03(c):
    bg_black(c)
    floor_glow(c, RED_AC)
    light_beams(c, RED_AC)
    depth_panels(c, RED_AC)
    card(c, 1.5*inch, 0.7*inch, W - 3.0*inch, H - 1.3*inch, border=RED_AC, bw=2, alpha=0.88)
    halo(c, W/2, H*0.52, 5*inch, 3.5*inch, RED_AC, 0.35)
    pedestal_ring(c, RED_AC)
    c.setFont('sans-b', 64)
    c.setFillColor(RED_AC)
    c.drawCentredString(W/2, H*0.72, '⚔')
    c.setFont('sans-b', 50)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H*0.57, 'VICTOR VON DOOM')
    hline(c, 1.8*inch, H*0.54, W - 3.6*inch, RED_AC)
    c.setFont('sans-i', 18)
    c.setFillColor(CREAM)
    c.drawCentredString(W/2, H*0.50, 'The Supreme Villain of the Multiverse Saga')
    for i, (ttl, bod) in enumerate([
        ('RDJ Returns', 'Robert Downey Jr.\nback as villain'),
        ('Reality Threat', 'Bends all rules\nacross universes'),
        ('Replaced Kang', 'The true villain\nbehind the Saga'),
    ]):
        cx = 1.8*inch + i * 3.5*inch
        card(c, cx, 1.0*inch, 3.2*inch, 2.1*inch, fc=HexColor('#300505'), border=RED_AC, bw=1.5, alpha=0.90)
        c.setFont('sans-b', 15)
        c.setFillColor(RED_AC)
        c.drawCentredString(cx + 1.6*inch, 2.85*inch, ttl)
        c.setFont('sans', 12)
        c.setFillColor(GRAY)
        for j, ln in enumerate(bod.split('\n')):
            c.drawCentredString(cx + 1.6*inch, 2.55*inch - j*16, ln)

def slide04(c):
    base_slide(c, COPPER, with_depth=True)
    # Left photo panel
    card(c, 0.5*inch, 0.8*inch, 5.0*inch, 5.6*inch, fc=HexColor('#151008'), border=AMBER, bw=2)
    halo(c, 3.0*inch, H*0.48, 3*inch, 4*inch, AMBER, 0.28)
    c.setFont('sans-b', 40)
    c.setFillColor(AMBER)
    c.drawCentredString(3.0*inch, H*0.50, '[ RDJ ]')
    c.setFont('sans-i', 15)
    c.setFillColor(CREAM)
    c.drawCentredString(3.0*inch, H*0.41, 'Tony Stark → Doctor Doom')
    # Right text panel
    card(c, 6.1*inch, 0.8*inch, 6.6*inch, 5.6*inch, border=AMBER, bw=2)
    c.setFont('sans-b', 32)
    c.setFillColor(WHITE)
    c.drawString(6.4*inch, H - 1.2*inch, 'RDJ: IRON MAN → IRON DOOM')
    hline(c, 6.4*inch, H - 1.45*inch, 6.2*inch)
    bullet_list(c, [
        'Returns to MCU — but NOT as Tony Stark',
        'Cast as Victor Von Doom — Marvel\'s iconic armored tyrant',
        'Same actor, completely different soul — cold and calculating',
        'Doom seeks to reshape reality across the entire multiverse',
        'Return revealed at San Diego Comic-Con 2024',
    ], 6.4*inch, H - 1.85*inch, 6.2*inch, sz=13, line_h=22)
    c.setFont('sans-i', 17)
    c.setFillColor(AMBER)
    c.drawCentredString(9.4*inch, 2.1*inch, '"He saved us once.')
    c.drawCentredString(9.4*inch, 1.85*inch, 'Now he threatens everything."')
    # Timeline
    hline(c, 0.5*inch, 0.65*inch, W - 1.0*inch, COPPER, 1.5)
    for i, (lbl, yr) in enumerate([('Iron Man', '2008'), ('Endgame', '2019'), ('Doctor Doom', '2026')]):
        xp = 1.5*inch + i * 4.6*inch
        c.setFillColor(AMBER)
        c.circle(xp, 0.65*inch, 5, fill=1, stroke=0)
        c.setFont('sans-b', 12)
        c.setFillColor(AMBER)
        c.drawCentredString(xp, 0.38*inch, f'{lbl}  {yr}')

def slide05(c):
    base_slide(c, COPPER)
    c.setFont('sans-b', 42)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 0.65*inch, 'THE RUSSO BROTHERS')
    hline(c, 1.0*inch, H - 0.85*inch, W - 2.0*inch)
    card(c, 0.5*inch, 1.1*inch, 5.8*inch, 5.5*inch, fc=HexColor('#151008'), border=AMBER, bw=2)
    halo(c, 3.4*inch, H*0.46, 3.5*inch, 3*inch, AMBER, 0.28)
    c.setFont('sans-b', 34)
    c.setFillColor(AMBER)
    c.drawCentredString(3.4*inch, H*0.54, '[ Joe & Anthony Russo ]')
    c.setFont('sans-i', 14)
    c.setFillColor(CREAM)
    c.drawCentredString(3.4*inch, H*0.44, 'Directors & Producers')
    # Divider
    c.setStrokeColor(COPPER)
    c.setLineWidth(2)
    c.line(6.55*inch, 1.1*inch, 6.55*inch, 6.6*inch)
    card(c, 6.7*inch, 1.1*inch, 6.1*inch, 5.5*inch, border=AMBER, bw=2)
    stats = [('4', 'MCU Films\nDirected'), ('$2.79B', 'Endgame\nBox Office'),
             ('#1', 'Highest-Grossing\nSuperhero Film'), ('2027', 'Directing\nSecret Wars')]
    for i, (num, lbl) in enumerate(stats):
        row, col2 = i // 2, i % 2
        cx = 6.9*inch + col2 * 3.0*inch
        cy = 1.3*inch + row * 2.55*inch
        stat_block(c, cx, cy, 2.7*inch, 2.2*inch, num, lbl, nsz=32)

def slide06(c):
    base_slide(c, COPPER)
    c.setFont('sans-b', 38)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 0.55*inch, 'THE HEROES')
    hline(c, 0.5*inch, H - 0.75*inch, W - 1.0*inch)
    chars = [('Captain America', 'Anthony Mackie'), ('Thor', 'Chris Hemsworth'),
             ('Spider-Man', 'Tom Holland'), ('Shuri', 'Letitia Wright'),
             ('Loki', 'Tom Hiddleston'), ('Ant-Man', 'Paul Rudd'),
             ('Yelena', 'Florence Pugh'), ('Sentry', 'Lewis Pullman'), ('Namor', 'Tenoch Huerta')]
    cw, ch = 4.1*inch, 2.1*inch
    for i, (ch2, act) in enumerate(chars):
        r2, c2 = i // 3, i % 3
        char_card_pdf(c, 0.3*inch + c2*(cw+0.18*inch), H*0.85 - r2*(ch+0.18*inch) - ch, cw, ch, ch2, act)

def slide07(c):
    bg_black(c)
    floor_glow(c, GOLD_AC)
    light_beams(c, GOLD_AC)
    depth_panels(c, GOLD_AC)
    card(c, 1.0*inch, 0.65*inch, W - 2.0*inch, 4.3*inch, fc=HexColor('#121005'), border=GOLD_AC, bw=2.5)
    halo(c, W/2, H*0.65, 6*inch, 3*inch, GOLD_AC, 0.30)
    pedestal_ring(c, GOLD_AC)
    c.setFont('sans-b', 44)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 1.0*inch, 'THE FANTASTIC FOUR')
    hline(c, 1.3*inch, H - 1.25*inch, W - 2.6*inch, GOLD_AC)
    c.setFont('sans-i', 18)
    c.setFillColor(CREAM)
    c.drawCentredString(W/2, H - 1.6*inch, '"Marvel\'s First Family enters the Multiverse"')
    c.setFont('sans-b', 24)
    c.setFillColor(GOLD_AC)
    c.drawCentredString(W/2, H - 2.3*inch, '[ FANTASTIC FOUR — PHASE 6 ]')
    for i, (ch2, act) in enumerate([('Reed Richards', 'Pedro Pascal'), ('Sue Storm', 'Vanessa Kirby'),
                                    ('Human Torch', 'Joseph Quinn'), ('The Thing', 'Ebon Moss-Bachrach')]):
        cw2, ch3 = 3.0*inch, 1.95*inch
        cx = 0.35*inch + i * (cw2 + 0.2*inch)
        char_card_pdf(c, cx, 0.75*inch, cw2, ch3, ch2, act, border=GOLD_AC)

def slide08(c):
    bg_black(c)
    floor_glow(c, PUR_AC)
    light_beams(c, PUR_AC)
    depth_panels(c, PUR_AC)
    card(c, 1.5*inch, 0.75*inch, W - 3.0*inch, H - 1.3*inch, border=PUR_AC, bw=2)
    halo(c, W/2, H*0.52, 5*inch, 3.5*inch, PUR_LT, 0.32)
    pedestal_ring(c, PUR_AC)
    c.setFont('sans-b', 80)
    c.setFillColor(PUR_LT)
    c.drawCentredString(W/2, H*0.70, 'X')
    c.setFont('sans-b', 46)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H*0.54, 'THE X-MEN ARRIVE')
    hline(c, 1.8*inch, H*0.51, W - 3.6*inch, PUR_AC)
    for i, (ch2, act) in enumerate([('Professor X', 'Patrick Stewart'), ('Beast', 'Kelsey Grammer')]):
        cx = 2.5*inch + i * 5.5*inch
        card(c, cx, 1.3*inch, 4.8*inch, 2.2*inch, fc=HexColor('#1A0525'), border=PUR_AC, bw=1.5)
        c.setFont('sans-b', 20)
        c.setFillColor(WHITE)
        c.drawCentredString(cx + 2.4*inch, 3.2*inch, ch2)
        c.setFont('sans-i', 15)
        c.setFillColor(PUR_LT)
        c.drawCentredString(cx + 2.4*inch, 2.9*inch, act)
    c.setFont('sans-i', 19)
    c.setFillColor(PUR_LT)
    c.drawCentredString(W/2, 0.9*inch, '"The Multiverse makes everything possible."')

def slide09(c):
    base_slide(c, COPPER, with_depth=True)
    card(c, 0.5*inch, 0.65*inch, W - 1.0*inch, H - 1.2*inch, border=AMBER, bw=2)
    c.setFont('sans-b', 42)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 1.1*inch, 'THE PLOT')
    hline(c, 0.8*inch, H - 1.35*inch, W - 1.6*inch)
    plot = ("When an unprecedented threat fractures the boundaries between parallel universes, "
            "Earth's Mightiest Heroes are forced to unite across dimensions. Victor Von Doom — "
            "the brilliant megalomaniacal ruler of Latveria — has discovered a way to harness "
            "the energy of collapsed timelines, granting him control over reality itself.\n\n"
            "As Doom's plan to merge all universes under his iron rule accelerates, the Avengers, "
            "the Fantastic Four, and allies from across the multiverse must face a villain who is "
            "always ten steps ahead. The fate of every universe — past, present, and future — "
            "hangs in the balance, leading to the cataclysmic finale: Secret Wars (2027).")
    c.setFont('sans', 14)
    c.setFillColor(GRAY)
    text_obj = c.beginText(0.9*inch, H - 1.75*inch)
    text_obj.setFont('sans', 14)
    text_obj.setFillColor(GRAY)
    text_obj.setLeading(22)
    for word_line in plot.split('\n'):
        if word_line == '':
            text_obj.textLine('')
            continue
        # manual wrap
        words = word_line.split()
        line = ''
        for word in words:
            test = (line + ' ' + word).strip()
            if c.stringWidth(test, 'sans', 14) <= W - 2.0*inch:
                line = test
            else:
                text_obj.textLine(line)
                line = word
        if line:
            text_obj.textLine(line)
    c.drawText(text_obj)
    # Bottom callouts
    for i, (num, lbl) in enumerate([('3', 'Universes'), ('39', 'MCU Films'), ('1', 'Villain')]):
        cx = 1.0*inch + i * 4.0*inch
        c.setFillColor(Color(0.1, 0.04, 0, alpha=0.95))
        c.roundRect(cx, 0.8*inch, 3.5*inch, 0.55*inch, 3, fill=1, stroke=0)
        c.setStrokeColor(COPPER)
        c.setLineWidth(1)
        c.roundRect(cx, 0.8*inch, 3.5*inch, 0.55*inch, 3, fill=0, stroke=1)
        c.setFont('sans-b', 20)
        c.setFillColor(AMBER)
        c.drawCentredString(cx + 1.75*inch, 1.02*inch, f'{num}  ◆  {lbl}')

def slide10(c):
    base_slide(c, COPPER, with_depth=True)
    c.setFont('sans-b', 40)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 0.55*inch, 'THE THUNDERBOLTS')
    hline(c, 0.5*inch, H - 0.75*inch, W - 1.0*inch)
    c.setFont('sans-i', 17)
    c.setFillColor(CREAM)
    c.drawCentredString(W/2, H - 1.05*inch, '"The Government\'s Secret Weapon"')
    chars = [('Yelena Belova', 'Florence Pugh'), ('Red Guardian', 'David Harbour'),
             ('U.S. Agent', 'Wyatt Russell'), ('Ghost', 'Hannah John-Kamen'),
             ('Sentry', 'Lewis Pullman'), ('Winter Soldier', 'Sebastian Stan')]
    cw, ch = 4.1*inch, 2.65*inch
    for i, (ch2, act) in enumerate(chars):
        r2, c2 = i // 3, i % 3
        char_card_pdf(c, 0.3*inch + c2*(cw+0.18*inch), H*0.84 - r2*(ch+0.16*inch) - ch, cw, ch, ch2, act)

def slide11(c):
    base_slide(c, COPPER)
    c.setFont('sans-b', 38)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 0.55*inch, 'RELEASE DATE')
    hline(c, 0.5*inch, H - 0.75*inch, W - 1.0*inch)
    halo(c, W/2, H*0.60, 7*inch, 2*inch, AMBER, 0.30)
    c.setFont('sans-b', 58)
    c.setFillColor(AMBER)
    c.drawCentredString(W/2, H*0.63, 'DECEMBER 18, 2026')
    # Left card
    card(c, 0.5*inch, 2.25*inch, 5.6*inch, 3.5*inch, border=AMBER, bw=2)
    halo(c, 3.3*inch, 4.0*inch, 3*inch, 2*inch, AMBER, 0.25)
    c.setFont('sans-b', 26)
    c.setFillColor(WHITE)
    c.drawCentredString(3.3*inch, 5.35*inch, 'AVENGERS: DOOMSDAY')
    c.setFont('sans', 13)
    c.setFillColor(GRAY)
    c.drawCentredString(3.3*inch, 4.95*inch, 'Marvel Studios · Phase 6 · MCU #39')
    c.setFont('sans-b', 22)
    c.setFillColor(AMBER)
    c.drawCentredString(3.3*inch, 4.55*inch, '★ December 18, 2026 ★')
    # VS
    c.setFont('sans-b', 30)
    c.setFillColor(AMBER)
    c.drawCentredString(W/2, 4.0*inch, 'VS')
    # Right card
    SIL = HexColor('#707070')
    card(c, W/2 + 0.7*inch, 2.25*inch, 5.6*inch, 3.5*inch, fc=HexColor('#0F0F0F'), border=SIL, bw=1.5)
    c.setFont('sans-b', 26)
    c.setFillColor(SIL)
    c.drawCentredString(W/2 + 3.5*inch, 5.35*inch, 'DUNE: PART THREE')
    c.setFont('sans', 13)
    c.setFillColor(SIL)
    c.drawCentredString(W/2 + 3.5*inch, 4.95*inch, 'Warner Bros. · Epic Sci-Fi')
    # Warning
    c.setFillColor(Color(0.19, 0.094, 0, alpha=0.95))
    c.roundRect(0.5*inch, 0.65*inch, W - 1.0*inch, 0.65*inch, 3, fill=1, stroke=0)
    c.setStrokeColor(AMBER)
    c.setLineWidth(1)
    c.roundRect(0.5*inch, 0.65*inch, W - 1.0*inch, 0.65*inch, 3, fill=0, stroke=1)
    c.setFont('sans-b', 20)
    c.setFillColor(AMBER)
    c.drawCentredString(W/2, 0.92*inch, '⚠  DOOMSDAY 2026 — BATTLE FOR IMAX SCREENS')

def slide12(c):
    base_slide(c, COPPER)
    c.setFont('sans-b', 40)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 0.55*inch, 'PHASE 6 TIMELINE')
    hline(c, 0.5*inch, H - 0.75*inch, W - 1.0*inch)
    tly = H * 0.44
    # Timeline line
    c.setStrokeColor(COPPER)
    c.setLineWidth(2.5)
    c.line(0.7*inch, tly, W - 0.7*inch, tly)
    films = [('Brave New\nWorld', '2025'), ('Thunderbolts*', '2025'), ('Fantastic\nFour', '2025'),
             ('Spider-Man:\nBrand New Day', '2026'), ('AVENGERS:\nDOOMSDAY ★', 'Dec 2026'), ('Secret\nWars', '2027')]
    sx, ex = 0.9*inch, W - 0.9*inch
    sp2 = (ex - sx) / (len(films) - 1)
    for i, (ttl, yr) in enumerate(films):
        x = sx + i * sp2
        star = (i == 4)
        dc = AMBER if star else COPPER
        ds = 10 if star else 7
        if star:
            halo(c, x, tly, 1.5*inch, 1.5*inch, AMBER, 0.30)
        c.setFillColor(dc)
        c.circle(x, tly, ds, fill=1, stroke=0)
        lines = ttl.split('\n')
        if i % 2 == 0:
            base_y = tly + 0.35*inch
        else:
            base_y = tly - 0.55*inch - (len(lines) - 1) * 16
        c.setFont('sans-b' if star else 'sans', 13 if star else 11)
        c.setFillColor(AMBER if star else WHITE)
        for j, ln in enumerate(lines):
            c.drawCentredString(x, base_y + j * 16, ln)
        yr_y = base_y - 0.3*inch if i % 2 == 0 else base_y - 0.3*inch
        if i % 2 == 0:
            yr_y = tly + 0.75*inch + (len(lines)-1)*16
        else:
            yr_y = tly - 0.75*inch - (len(lines)-1)*16
        c.setFont('sans', 11)
        c.setFillColor(COPPER)
        c.drawCentredString(x, yr_y, yr)

def slide13(c):
    base_slide(c, COPPER, with_depth=True)
    c.setFont('sans-b', 40)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 0.55*inch, 'BY THE NUMBERS')
    hline(c, 0.5*inch, H - 0.75*inch, W - 1.0*inch)
    stats = [('39', 'MCU Film\nNumber'), ('$2.79B', 'Endgame\nBenchmark'), ('4', 'Russo Bros\nFilms'),
             ('3', 'Universes\nCollide'), ('2026', 'Release\nYear'), ('1', 'Victor\nVon Doom')]
    cw2, ch2 = 4.0*inch, 2.7*inch
    for i, (num, lbl) in enumerate(stats):
        r2, c2 = i // 3, i % 3
        stat_block(c, 0.3*inch + c2*(cw2+0.25*inch), H*0.86 - r2*(ch2+0.18*inch) - ch2, cw2, ch2, num, lbl, nsz=44)

def slide14(c):
    base_slide(c, COPPER, with_depth=True)
    card(c, 0.6*inch, 0.65*inch, W - 1.2*inch, H*0.72, border=AMBER, bw=2)
    c.setFont('sans-b', 42)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H - 1.0*inch, 'WHY IT MATTERS')
    hline(c, 0.9*inch, H - 1.25*inch, W - 1.8*inch)
    body = ("Avengers: Doomsday is not merely a sequel — it is a culmination. After 15 years and "
            "38 films, the Marvel Cinematic Universe converges here. Every thread, every sacrifice, "
            "every choice leads to this confrontation.\n\nThe decision to bring Robert Downey Jr. back "
            "as Victor Von Doom is Marvel's boldest creative gamble yet. The Russo Brothers return "
            "to deliver what promises to eclipse even Endgame in scope and emotional weight. "
            "This is where the Multiverse Saga ends — and everything changes.")
    text_obj = c.beginText(0.9*inch, H - 1.65*inch)
    text_obj.setFont('sans', 14)
    text_obj.setFillColor(GRAY)
    text_obj.setLeading(22)
    for word_line in body.split('\n'):
        if word_line == '':
            text_obj.textLine('')
            continue
        words = word_line.split()
        line = ''
        for word in words:
            test = (line + ' ' + word).strip()
            if c.stringWidth(test, 'sans', 14) <= W - 2.0*inch:
                line = test
            else:
                text_obj.textLine(line)
                line = word
        if line:
            text_obj.textLine(line)
    c.drawText(text_obj)
    for i, (ic, lbl) in enumerate([('★', 'MCU Veterans + New Heroes'),
                                   ('◈', 'Multiverse Saga Endgame'),
                                   ('◎', "RDJ's Most Complex Role")]):
        cx = 0.7*inch + i * 4.1*inch
        card(c, cx, 0.7*inch, 3.7*inch, 1.35*inch, fc=HexColor('#1A0A00'), border=COPPER, bw=1.5)
        c.setFont('sans-b', 26)
        c.setFillColor(AMBER)
        c.drawString(cx + 0.25*inch, 1.15*inch, ic)
        c.setFont('sans', 13)
        c.setFillColor(GRAY)
        c.drawString(cx + 0.75*inch, 1.22*inch, lbl)

def slide15(c):
    base_slide(c, COPPER)
    pedestal_ring(c, COPPER)
    halo(c, W/2, H*0.50, 9*inch, 5.5*inch, AMBER, 0.28)
    halo(c, W/2, H*0.50, 5.5*inch, 3*inch, AMBER, 0.22)
    c.setFont('sans-b', 88)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, H*0.52, 'DOOM IS COMING.')
    hline(c, 2*inch, H*0.43, W - 4*inch, AMBER, 2)
    c.setFont('sans', 18)
    c.setFillColor(COPPER)
    c.drawCentredString(W/2, H*0.33, 'December 18, 2026  ·  Marvel Studios')

# ── MAIN ─────────────────────────────────────────────────────────────────────
SLIDES = [slide01, slide02, slide03, slide04, slide05, slide06, slide07, slide08,
          slide09, slide10, slide11, slide12, slide13, slide14, slide15]

def build():
    out = '/home/user/yupebis/avengers_doomsday.pdf'
    c = canvas.Canvas(out, pagesize=(W, H))
    c.setTitle('Avengers: Doomsday — Presentation')
    c.setAuthor('Marvel Studios')
    for i, fn in enumerate(SLIDES, 1):
        print(f'  Slide {i:02d}/15 — {fn.__name__}')
        fn(c)
        c.showPage()
    c.save()
    print(f'\n✅ PDF saved: {out}')
    return out

if __name__ == '__main__':
    build()
