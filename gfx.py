"""
Shared graphics engine — 3840x2160 (4K) slide builder using Pillow.
Provides draw helpers used by all slide builders.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance
import numpy as np
import math, os, textwrap, requests

W, H = 3840, 2160
SCALE = W / 1920  # relative to 1080p baseline

# ── COLORS (R,G,B,A) ─────────────────────────────────────────────────────────
BLACK     = (0,   0,   0,   255)
WHITE     = (255, 255, 255, 255)
COPPER    = (200, 121,  65,  255)
AMBER     = (232, 146,  58,  255)
GLOW_ORG  = (255, 120,  32,  255)
CREAM     = (245, 230, 208, 255)
LT_GRAY   = (204, 204, 204, 255)
DARK_CARD = (17,  17,  17,  230)
DARK2     = (10,  10,  10,  200)
RED_AC    = (192,  32,  32,  255)
PUR_AC    = (123,  31, 162,  255)
PUR_LT    = (171,  71, 188,  255)
GOLD_AC   = (212, 175,  55,  255)

def rgb(color):   return color[:3]
def rgba(color):  return color

# ── FONT LOADING ─────────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts/truetype/liberation/'
_font_cache = {}

def font(size, bold=False, italic=False):
    key = (size, bold, italic)
    if key in _font_cache:
        return _font_cache[key]
    if bold and italic:
        path = FONT_DIR + 'LiberationSans-BoldItalic.ttf'
    elif bold:
        path = FONT_DIR + 'LiberationSans-Bold.ttf'
    elif italic:
        path = FONT_DIR + 'LiberationSans-Italic.ttf'
    else:
        path = FONT_DIR + 'LiberationSans-Regular.ttf'
    try:
        f = ImageFont.truetype(path, int(size * SCALE))
    except Exception:
        f = ImageFont.load_default()
    _font_cache[key] = f
    return f

# ── CANVAS ───────────────────────────────────────────────────────────────────
def new_slide():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    return img

def draw(img):
    return ImageDraw.Draw(img, 'RGBA')

# ── BACKGROUND ELEMENTS ──────────────────────────────────────────────────────
def bg_black(img):
    img.paste((0, 0, 0), [0, 0, W, H])

def floor_glow(img, accent=COPPER):
    """Gradient floor strip — copper glow at junction, fades to black below."""
    d = draw(img)
    floor_y = int(H * 0.75)
    steps = 80
    for i in range(steps):
        t = i / steps
        # gradient: copper at top → black at bottom
        alpha = int(200 * (1 - t))
        r = int(accent[0] * (1-t) * 0.6)
        g = int(accent[1] * (1-t) * 0.6)
        b = int(accent[2] * (1-t) * 0.6)
        strip_h = (H - floor_y) // steps + 1
        d.rectangle([0, floor_y + i * strip_h, W, floor_y + (i+1) * strip_h], fill=(r,g,b,alpha))
    # Bright copper line at junction
    for lw in range(6, 0, -1):
        alpha = int(255 * (lw / 6) * 0.9)
        d.line([(0, floor_y - lw), (W, floor_y - lw)],
               fill=(accent[0], accent[1], accent[2], alpha), width=1)

def starfield(img, count=120):
    """Subtle star particles on black BG."""
    d = draw(img)
    import random; random.seed(42)
    for _ in range(count):
        x = random.randint(0, W)
        y = random.randint(0, int(H * 0.75))
        size = random.choice([1, 1, 1, 2])
        alpha = random.randint(40, 140)
        d.ellipse([x-size, y-size, x+size, y+size], fill=(255,255,255,alpha))

def light_beams(img, accent=COPPER):
    """2 volumetric diagonal light shafts."""
    overlay = Image.new('RGBA', (W, H), (0,0,0,0))
    d = ImageDraw.Draw(overlay, 'RGBA')
    for xf, wf, alpha in [(0.54, 0.025, 22), (0.73, 0.015, 15)]:
        cx = int(W * xf)
        bw = int(W * wf)
        # Rotated polygon
        angle = math.radians(30)
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        pts = [
            (-bw//2, -H), (bw//2, -H),
            (bw//2 + int(H*sin_a), H), (-bw//2 + int(H*sin_a), H)
        ]
        pts = [(int(cx + p[0]*cos_a - p[1]*sin_a), int(H//2 + p[0]*sin_a + p[1]*cos_a)) for p in pts]
        d.polygon(pts, fill=(accent[0], accent[1], accent[2], alpha))
    img.alpha_composite(overlay)

def radial_halo(img, cx, cy, rx, ry, color, max_alpha=80, steps=30):
    """Soft radial glow."""
    overlay = Image.new('RGBA', (W, H), (0,0,0,0))
    d = ImageDraw.Draw(overlay, 'RGBA')
    for i in range(steps, 0, -1):
        t = i / steps
        alpha = int(max_alpha * (1 - t) * 2.5)
        alpha = min(alpha, max_alpha)
        rxi = int(rx * t)
        ryi = int(ry * t)
        d.ellipse([cx-rxi, cy-ryi, cx+rxi, cy+ryi],
                  fill=(color[0], color[1], color[2], alpha))
    img.alpha_composite(overlay)

def pedestal_ring(img, cx=None, cy=None, color=COPPER):
    if cx is None: cx = W // 2
    if cy is None: cy = int(H * 0.76)
    overlay = Image.new('RGBA', (W, H), (0,0,0,0))
    d = ImageDraw.Draw(overlay, 'RGBA')
    # Outer glow rings
    for rx, ry, alpha in [(900, 130, 40), (750, 105, 60), (600, 85, 80), (450, 65, 50)]:
        d.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], outline=(color[0],color[1],color[2],alpha), width=6)
    # Bright ring
    d.ellipse([cx-500, cy-70, cx+500, cy+70], outline=(color[0],color[1],color[2],180), width=4)
    img.alpha_composite(overlay)

# ── CARD SYSTEM ───────────────────────────────────────────────────────────────
def glass_card(img, x, y, w, h, fill=DARK_CARD, border=AMBER, border_w=6, radius=18, shadow=True):
    overlay = Image.new('RGBA', (W, H), (0,0,0,0))
    d = ImageDraw.Draw(overlay, 'RGBA')
    # Shadow
    if shadow:
        for i in range(20, 0, -1):
            alpha = int(180 * (i/20) ** 1.5)
            d.rounded_rectangle([x+i*2, y+i*2, x+w+i*2, y+h+i*2], radius=radius+i,
                                 fill=(0,0,0,alpha))
    # Card fill
    d.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=fill)
    # Border glow (outer, softer)
    for gw in [border_w+12, border_w+6]:
        alpha = int(80 * (1 - gw/30))
        d.rounded_rectangle([x, y, x+w, y+h], radius=radius+2,
                             outline=(border[0],border[1],border[2],alpha), width=gw)
    # Crisp border
    d.rounded_rectangle([x, y, x+w, y+h], radius=radius,
                         outline=(border[0],border[1],border[2],220), width=border_w)
    img.alpha_composite(overlay)

def depth_panels(img, accent=COPPER):
    glass_card(img, 60, int(H*0.12), 640, int(H*0.72), fill=DARK2, border=accent, border_w=3)
    glass_card(img, W-700, int(H*0.15), 640, int(H*0.70), fill=DARK2, border=accent, border_w=3)

# ── TEXT SYSTEM ───────────────────────────────────────────────────────────────
def text_glow(img, text, x, y, fnt, color, glow_color, glow_radius=30, anchor='mm'):
    """Draw text with outer glow."""
    glow_layer = Image.new('RGBA', (W, H), (0,0,0,0))
    gd = ImageDraw.Draw(glow_layer, 'RGBA')
    gd.text((x, y), text, font=fnt, fill=(*rgb(glow_color), 180), anchor=anchor)
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(glow_radius))
    # Draw glow multiple times for intensity
    for _ in range(3):
        img.alpha_composite(glow_layer)
    # Draw crisp text on top
    d = draw(img)
    d.text((x, y), text, font=fnt, fill=color, anchor=anchor)

def hline(img, x, y, w, color=COPPER, thickness=4):
    d = draw(img)
    for i in range(3, 0, -1):
        alpha = int(color[3] * 0.3 * (i/3))
        d.line([(x, y), (x+w, y)], fill=(*rgb(color), alpha), width=thickness+i*3)
    d.line([(x, y), (x+w, y)], fill=color, width=thickness)

def multiline_text(img, text, x, y, fnt, color, max_w, line_h_mul=1.4, anchor='lt'):
    d = draw(img)
    _, _, fw, fh = d.textbbox((0,0), 'A', font=fnt)
    line_h = int(fh * line_h_mul)
    lines = []
    for paragraph in text.split('\n'):
        if not paragraph.strip():
            lines.append('')
            continue
        words = paragraph.split()
        line = ''
        for word in words:
            test = (line + ' ' + word).strip()
            _, _, tw, _ = d.textbbox((0,0), test, font=fnt)
            if tw <= max_w:
                line = test
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
    cur_y = y
    for ln in lines:
        d.text((x, cur_y), ln, font=fnt, fill=color)
        cur_y += line_h
    return cur_y

def bullet_item(img, text, x, y, fnt, text_color=LT_GRAY, bullet_color=AMBER, max_w=None, line_h_mul=1.4):
    d = draw(img)
    _, _, fw, fh = d.textbbox((0,0), 'A', font=fnt)
    line_h = int(fh * line_h_mul)
    bullet_w = int(fh * 1.8)
    d.text((x, y), '◆', font=fnt, fill=bullet_color)
    if max_w is None:
        d.text((x + bullet_w, y), text, font=fnt, fill=text_color)
        return y + line_h
    # Word wrap
    words = text.split()
    line = ''
    cur_y = y
    first = True
    for word in words:
        test = (line + ' ' + word).strip()
        _, _, tw, _ = d.textbbox((0,0), test, font=fnt)
        if tw <= max_w - bullet_w:
            line = test
        else:
            if line:
                d.text((x + bullet_w if first else x + bullet_w, cur_y), line, font=fnt, fill=text_color)
                cur_y += line_h
                first = False
            line = word
    if line:
        d.text((x + bullet_w, cur_y), line, font=fnt, fill=text_color)
        cur_y += line_h
    return cur_y

def stat_card(img, x, y, w, h, number, label, border=AMBER, num_color=AMBER):
    glass_card(img, x, y, w, h, border=border)
    radial_halo(img, x+w//2, y+h//2, w//2, h//2, border, max_alpha=35)
    d = draw(img)
    num_f = font(48, bold=True)
    lbl_f = font(16)
    # Number
    text_glow(img, number, x+w//2, y+int(h*0.38), num_f, num_color, border, glow_radius=25)
    # Label
    for i, ln in enumerate(label.split('\n')):
        d.text((x+w//2, y+int(h*0.65)+i*36), ln, font=lbl_f, fill=WHITE, anchor='mm')

def char_card(img, x, y, w, h, name, actor, border=AMBER, photo=None):
    glass_card(img, x, y, w, h, border=border)
    ih = int(h * 0.62)
    # Photo area
    if photo and os.path.exists(photo):
        try:
            ph = Image.open(photo).convert('RGBA').resize((w, ih), Image.LANCZOS)
            # Darken bottom of photo
            mask = Image.new('L', (w, ih), 0)
            dm = ImageDraw.Draw(mask)
            for yi in range(ih):
                alpha = int(200 * (yi / ih) ** 1.5)
                dm.line([(0,yi),(w,yi)], fill=alpha)
            dark = Image.new('RGBA', (w, ih), (0,0,0,0))
            dark.putalpha(mask)
            ph.alpha_composite(dark)
            img.alpha_composite(ph, (x, y))
        except Exception:
            photo = None
    if not photo or not os.path.exists(str(photo)):
        radial_halo(img, x+w//2, y+ih//2, int(w*0.4), int(ih*0.45), border, max_alpha=55)
    # Separator line
    hline(img, x, y+ih, w, border, 3)
    # Name
    d = draw(img)
    d.text((x+w//2, y+ih+int(h*0.06)), name, font=font(15, bold=True), fill=WHITE, anchor='mm')
    d.text((x+w//2, y+ih+int(h*0.19)), actor, font=font(12, italic=True), fill=border, anchor='mm')

# ── IMAGE DOWNLOADING ─────────────────────────────────────────────────────────
def download_image(url, path, timeout=12):
    """Download image to path. Returns True if successful."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; research/1.0)'}
        r = requests.get(url, timeout=timeout, headers=headers)
        if r.status_code == 200 and len(r.content) > 5000:
            with open(path, 'wb') as f:
                f.write(r.content)
            Image.open(path).verify()  # Validate it's an image
            return True
    except Exception:
        pass
    return False

def fit_image(img, src_path, x, y, w, h, darken=0.55, overlay_color=None):
    """Fit image into box, darken, optionally tint."""
    try:
        ph = Image.open(src_path).convert('RGBA')
        # Crop to aspect ratio
        src_ar = ph.width / ph.height
        tgt_ar = w / h
        if src_ar > tgt_ar:
            new_w = int(ph.height * tgt_ar)
            off = (ph.width - new_w) // 2
            ph = ph.crop((off, 0, off + new_w, ph.height))
        else:
            new_h = int(ph.width / tgt_ar)
            off = (ph.height - new_h) // 2
            ph = ph.crop((0, off, ph.width, off + new_h))
        ph = ph.resize((w, h), Image.LANCZOS)
        # Darken
        enhancer = ImageEnhance.Brightness(ph)
        ph = enhancer.enhance(darken)
        # Overlay tint
        if overlay_color:
            tint = Image.new('RGBA', (w, h), (*overlay_color[:3], 60))
            ph.alpha_composite(tint)
        img.alpha_composite(ph, (x, y))
        return True
    except Exception:
        return False

def slide_to_rgb(slide_img):
    """Convert RGBA slide to RGB for PDF saving."""
    bg = Image.new('RGB', (W, H), (0, 0, 0))
    bg.paste(slide_img.convert('RGB'), (0, 0))
    return bg
