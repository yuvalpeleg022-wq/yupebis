#!/usr/bin/env python3
"""MARVEL COSMIC GREEN — CREATOR STYLE renderer.

Usage:
    python3 render.py <project.json> [--preview START END] [--stills t1,t2,...] [--out PATH]

All times inside project.json are SOURCE times (seconds in the original
talking-head video). The edit list (keep ranges) maps them to output time.
"""
import argparse, json, math, os, subprocess, sys, wave
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))


def rel(base, p):
    return p if os.path.isabs(p) else os.path.normpath(os.path.join(base, p))


# ---------------------------------------------------------------- easing
def clamp01(x):
    return max(0.0, min(1.0, x))


def ease_out_cubic(x):
    x = clamp01(x); return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp01(x); return x * x * (3 - 2 * x)


def ease_out_back(x, k=1.70158):
    x = clamp01(x); x -= 1; return 1 + (k + 1) * x ** 3 + k * x ** 2


# ---------------------------------------------------------------- edit list
class Timeline:
    def __init__(self, keeps, fps):
        self.fps = fps
        self.ranges = []  # (src_f0, src_f1, out_f0)
        o = 0
        for s, e in keeps:
            f0, f1 = int(round(s * fps)), int(round(e * fps))
            self.ranges.append((f0, f1, o)); o += f1 - f0
        self.n_out = o

    def src_frame(self, of):
        for f0, f1, o0 in self.ranges:
            if o0 <= of < o0 + (f1 - f0):
                return f0 + (of - o0)
        return self.ranges[-1][1] - 1

    def range_index(self, of):
        for i, (f0, f1, o0) in enumerate(self.ranges):
            if o0 <= of < o0 + (f1 - f0):
                return i, (of - o0) / max(1, f1 - f0 - 1)
        return len(self.ranges) - 1, 1.0

    def to_out(self, t):
        """source seconds -> output seconds (times inside cut gaps snap to next kept frame)."""
        f = t * self.fps
        for f0, f1, o0 in self.ranges:
            if f < f0:
                return o0 / self.fps
            if f <= f1:
                return (o0 + f - f0) / self.fps
        return self.n_out / self.fps

    def cut_points_out(self):
        return [o0 / self.fps for _, _, o0 in self.ranges[1:]]


def refine_keeps(keeps, wav_path, search=0.12):
    """Move every cut boundary to the quietest 10 ms window nearby."""
    with wave.open(wav_path) as w:
        sr = w.getframerate(); ch = w.getnchannels()
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32)
    a = a.reshape(-1, ch).mean(1)
    hop = sr // 100
    rms = np.sqrt(np.convolve(a ** 2, np.ones(hop) / hop, mode="same"))

    def q(t):
        lo, hi = int((t - search) * sr), int((t + search) * sr)
        lo = max(lo, 0); hi = min(hi, len(rms) - 1)
        if hi <= lo:
            return t
        return (lo + int(np.argmin(rms[lo:hi]))) / sr
    out = []
    for i, (s, e) in enumerate(keeps):
        out.append([s if i == 0 else q(s), e if i == len(keeps) - 1 else q(e)])
    return out


# ---------------------------------------------------------------- background
def fbm(h, w, rng, scales=(3, 6, 12, 24, 48), gains=(1, .55, .3, .16, .08)):
    acc = np.zeros((h, w), np.float32)
    for sc, g in zip(scales, gains):
        n = rng.random((max(2, int(h / w * sc)) + 1, sc + 1)).astype(np.float32)
        acc += g * cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)
    acc -= acc.min(); acc /= acc.max()
    return acc


class CosmicBackground:
    def __init__(self, P, W, H, fps):
        self.P, self.W, self.H, self.fps = P, W, H, fps
        rng = np.random.default_rng(P["seed"])
        self.CW, self.CH = W + 320, H + 420
        # palette gradient (hex stops from the preset) -> 1024-entry LUT
        hexrgb = lambda h: [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        stops = P["gradient"]  # [[position, "#rrggbb"], ...]
        xs = np.linspace(0, 1, 1024)
        self.lut = np.stack([np.interp(xs, [p for p, _ in stops], [hexrgb(c)[k] for _, c in stops]) for k in range(3)], -1).astype(np.float32)
        self.n1 = fbm(self.CH, self.CW, rng)
        self.n2 = fbm(self.CH, self.CW, rng, scales=(2, 5, 10, 20, 40))
        sm = fbm(self.CH, self.CW, rng, scales=(4, 9, 18, 36, 72), gains=(1, .6, .35, .2, .1))
        self.smoke = np.clip((sm - 0.42) * 2.0, 0, 1).astype(np.float32) ** 1.4
        # brighter atmospheric centre (behind the speaker's head)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        gx, gy = P["center_glow_pos"]
        g = np.exp(-(((xx - gx) / (W * 0.55)) ** 2 + ((yy - gy) / (H * 0.38)) ** 2))
        self.center = (g * P["center_glow"]).astype(np.float32)
        self.lum = np.array(hexrgb(P["luminous"]), np.float32)

        # volumetric rays (computed at half res, polar lookup)
        hw, hh = W // 2, H // 2
        yy, xx = np.mgrid[0:hh, 0:hw].astype(np.float32)
        ox, oy = P["rays_origin"][0] / 2, P["rays_origin"][1] / 2
        ang = np.arctan2(yy - oy, xx - ox)
        dist = np.sqrt((xx - ox) ** 2 + (yy - oy) ** 2)
        self.ray_idx = ((ang + math.pi) / (2 * math.pi) * 2048).astype(np.int32)
        self.ray_fall = (np.exp(-dist / (hh * 0.75)) * np.clip(dist / 120, 0, 1)).astype(np.float32)
        r1 = rng.random(129).astype(np.float32)
        r1 = cv2.resize(r1[None], (2048 * 3, 1), interpolation=cv2.INTER_CUBIC)[0]
        r2 = cv2.resize(rng.random(520).astype(np.float32)[None], (2048 * 3, 1), interpolation=cv2.INTER_CUBIC)[0]
        self.ray_tab = np.clip((0.6 * r1 + 0.4 * r2 - 0.45) * 2.4, 0, 1) ** 2

        # stars
        ns = P["stars"]
        self.st_x = rng.random(ns) * self.CW; self.st_y = rng.random(ns) * self.CH
        self.st_b = (rng.random(ns) ** 3) * 0.9 + 0.08
        self.st_ph = rng.random(ns) * 6.283; self.st_sp = rng.random(ns) * 2.5 + 0.5
        self.st_depth = rng.random(ns) * 0.8 + 0.2
        # dust
        nd = P["dust"]
        self.du_x = rng.random(nd) * W; self.du_y = rng.random(nd) * H
        self.du_vx = (rng.random(nd) - 0.5) * 14; self.du_vy = -(rng.random(nd) * 22 + 6)
        self.du_r = rng.random(nd) * 2.2 + 0.8; self.du_b = rng.random(nd) * 0.5 + 0.25
        self.du_ph = rng.random(nd) * 6.283
        nb = P["bokeh"]
        self.bk_x = rng.random(nb) * W; self.bk_y = rng.random(nb) * H
        self.bk_r = rng.random(nb) * 26 + 10; self.bk_vy = -(rng.random(nb) * 8 + 3)
        self.bk_b = rng.random(nb) * 0.10 + 0.04
        # vignette
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.45) / (H * 0.7)) ** 2)
        self.vig = (1 - P["vignette"] * np.clip(d, 0, 1.4) ** 2.2).clip(0.15, 1)[..., None].astype(np.float32)

    def crop(self, tex, ox, oy):
        ox = int(ox) % (self.CW - self.W); oy = int(oy) % (self.CH - self.H)
        return tex[oy:oy + self.H, ox:ox + self.W]

    def frame(self, t, cam=(0, 0)):
        P, W, H = self.P, self.W, self.H
        dx, dy = P["nebula_drift_px_s"]
        cx, cy = cam
        b = 1 + P["breathing"] * math.sin(t * 0.7)
        a = self.crop(self.n1, 160 + dx * t + cx * 0.3, 210 + dy * t + cy * 0.3)
        c = self.crop(self.n2, 160 - dx * 0.6 * t + cx * 0.2, 210 - dy * 0.5 * t + cy * 0.2)
        sm = self.crop(self.smoke, 160 + 4 * math.sin(t * 0.2) + cx * 0.5, 210 + P["smoke_rise_px_s"] * t + cy * 0.5)
        lo, hi = P["density_range"]
        n = (0.62 * a + 0.38 * c - lo) / (hi - lo)
        n = np.clip(n * (0.55 + 0.45 * self.center / max(P["center_glow"], 1e-3)) * b + self.center
                    + sm * P["smoke_amount"] * (0.85 + 0.15 * math.sin(t * 0.9)), 0, 1)
        img = self.lut[(n * 1023).astype(np.int32)]
        # rays
        shift = int(t * 9) % 2048
        rays = self.ray_tab[self.ray_idx + shift] * self.ray_fall
        rays = cv2.resize(rays, (W, H), interpolation=cv2.INTER_LINEAR)
        img += rays[..., None] * self.lum * P["rays_strength"] * (0.85 + 0.15 * math.sin(t * 0.5))
        # stars (parallax drift + twinkle)
        sx = ((self.st_x - 160 - cx * self.st_depth - 3 * t * self.st_depth) % self.CW).astype(np.int32)
        sy = ((self.st_y - 210 - cy * self.st_depth + 2 * t * self.st_depth) % self.CH).astype(np.int32)
        ok = (sx < W) & (sy < H)
        star = np.zeros((H, W), np.float32)
        tw = self.st_b * (0.65 + 0.35 * np.sin(self.st_ph + t * self.st_sp))
        np.add.at(star, (sy[ok], sx[ok]), tw[ok])
        star = cv2.GaussianBlur(star, (0, 0), 0.9) * 3.2
        img += star[..., None] * np.array([0.75, 0.92, 0.8], np.float32) * P["star_gain"]
        # dust + bokeh (half res)
        hw, hh = W // 2, H // 2
        dl = np.zeros((hh, hw), np.float32)
        x = (self.du_x + self.du_vx * t + 10 * np.sin(self.du_ph + t * 0.6)) % W
        y = (self.du_y + self.du_vy * t) % H
        for xi, yi, r, bb, ph in zip(x, y, self.du_r, self.du_b, self.du_ph):
            cv2.circle(dl, (int(xi / 2), int(yi / 2)), max(1, int(r / 2 + 0.5)), float(bb * (0.7 + 0.3 * math.sin(ph + t * 2))), -1, cv2.LINE_AA)
        bl = np.zeros((hh // 2, hw // 2), np.float32)
        for xi, yi, r, vy, bb in zip(self.bk_x, self.bk_y, self.bk_r, self.bk_vy, self.bk_b):
            cv2.circle(bl, (int(xi / 4), int(((yi + vy * t) % H) / 4)), int(r / 4), float(bb), -1, cv2.LINE_AA)
        bl = cv2.resize(cv2.GaussianBlur(bl, (0, 0), 2.2), (hw, hh))
        dl = cv2.GaussianBlur(dl, (0, 0), 0.8) + bl
        dl = cv2.resize(dl, (W, H), interpolation=cv2.INTER_LINEAR)
        img += dl[..., None] * self.lum * P["dust_gain"]
        img *= self.vig
        return img


# ---------------------------------------------------------------- speaker matte
class Matte:
    def __init__(self, mask_dir, S, W, H):
        self.dir, self.S, self.W, self.H = mask_dir, S, W, H
        self.cache = {}
        self.k_er = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (S["fill_erode_px"],) * 2)

    def raw(self, i):
        p = os.path.join(self.dir, f"{i:05d}.png")
        while not os.path.exists(p) and i > 0:
            i -= 1; p = os.path.join(self.dir, f"{i:05d}.png")
        return cv2.imread(p, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255

    def refined(self, i):
        if i in self.cache:
            return self.cache[i]
        a = self.raw(i)
        H = self.H
        b = (a > self.S["matte_threshold"]).astype(np.uint8)
        # keep only the person (large components) so stray specks can't trigger a fill
        n, lab, st, _ = cv2.connectedComponentsWithStats(b, connectivity=8)
        if n > 1:
            big = [k for k in range(1, n) if st[k, cv2.CC_STAT_AREA] > max(5000, 0.15 * st[1:, cv2.CC_STAT_AREA].max())]
            b = np.isin(lab, big).astype(np.uint8)
        # column fill: a seated talking-head fills the frame below its top silhouette
        has = b.any(0)
        first = np.where(has, np.argmax(b, axis=0), H).astype(np.float32)
        # shoulders can't drop faster than a natural slope going outward from the face
        cx = int(self.S["face_anchor"][0]); ymin = self.S.get("shoulder_min_y", 1000); slope = self.S.get("shoulder_slope", 1.2)
        for x in range(cx + 1, self.W):
            if first[x - 1] >= ymin and first[x] > first[x - 1] + slope:
                first[x] = first[x - 1] + slope
        for x in range(cx - 1, -1, -1):
            if first[x + 1] >= ymin and first[x] > first[x + 1] + slope:
                first[x] = first[x + 1] + slope
        has = first < H
        rows = np.arange(H)[:, None]
        solid = ((rows >= first[None, :]) & has[None, :]).astype(np.uint8)
        interior = cv2.erode(solid, self.k_er).astype(np.float32)
        interior = cv2.GaussianBlur(interior, (0, 0), 4)
        r = np.maximum(a, interior)
        self.cache[i] = r
        if len(self.cache) > 6:
            self.cache.pop(min(self.cache))
        return r

    def get(self, i):
        w = self.S["temporal_smooth"]
        return w[0] * self.refined(max(0, i - 1)) + w[1] * self.refined(i) + w[2] * self.refined(i + 1 if os.path.exists(os.path.join(self.dir, f"{i+1:05d}.png")) else i)


def grade_speaker(rgb, S):
    x = rgb * S["exposure"]
    x = (x - 0.5) * S["contrast"] + 0.5
    lum = (x * np.array([0.299, 0.587, 0.114], np.float32)).sum(-1, keepdims=True)
    x = lum + (x - lum) * S["saturation"]
    x += np.clip(1 - lum, 0, 1) ** 3 * np.array(S["shadow_tint"], np.float32)
    return np.clip(x, 0, 1)


def edge_light(alpha, direction, width):
    dx, dy = direction
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    sh = cv2.warpAffine(alpha, M, (alpha.shape[1], alpha.shape[0]), borderMode=cv2.BORDER_REPLICATE)
    rim = np.clip(alpha - sh, 0, 1)
    return cv2.GaussianBlur(rim, (0, 0), width)


# ---------------------------------------------------------------- sprites
class Sprite:
    def __init__(self, path):
        im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        self.rgb = im[:, :, 2::-1].astype(np.float32) / 255
        self.a = im[:, :, 3].astype(np.float32) / 255
        self.cache = {}

    def scaled(self, h):
        h = max(8, int(round(h / 4) * 4))
        if h not in self.cache:
            s = h / self.a.shape[0]
            w = max(4, int(self.a.shape[1] * s))
            interp = cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC
            rgb = cv2.resize(self.rgb, (w, h), interpolation=interp)
            a = np.clip(cv2.resize(self.a, (w, h), interpolation=interp), 0, 1)
            self.cache[h] = (rgb, a)
            if len(self.cache) > 40:
                self.cache.pop(next(iter(self.cache)))
        return self.cache[h]


def paste(dst, rgb, a, x0, y0, opacity=1.0, mode="over"):
    H, W = dst.shape[:2]
    h, w = a.shape
    xa, ya = max(0, x0), max(0, y0)
    xb, yb = min(W, x0 + w), min(H, y0 + h)
    if xb <= xa or yb <= ya:
        return
    sa = a[ya - y0:yb - y0, xa - x0:xb - x0, None] * opacity
    d = dst[ya:yb, xa:xb]
    if mode == "add":
        d += rgb[ya - y0:yb - y0, xa - x0:xb - x0] * sa
    elif mode == "mul":
        d *= 1 - sa * (1 - rgb)
    else:
        d[:] = d * (1 - sa) + rgb[ya - y0:yb - y0, xa - x0:xb - x0] * sa


def render_character(dst, spr, ov, t, C):
    """ov: overlay dict with out-times t_in/t_out. Draws into dst (float RGB)."""
    ti, to = ov["t_in"], ov["t_out"]
    if t < ti or t > to:
        return
    ein, eout = C["enter_s"], C["exit_s"]
    p_in = ease_out_cubic((t - ti) / ein)
    p_out = ease_in_out((t - (to - eout)) / eout) if t > to - eout else 0.0
    life = clamp01((t - ti) / max(0.01, to - ti))
    h = ov["h"] * (1 + C["idle_zoom"] * life)
    enter = ov.get("enter", "slide-left")
    x, yb = ov["x"], ov["bottom"]
    opacity = min(p_in * 1.4, 1.0) * (1 - p_out)
    if enter == "slide-left":
        x -= (1 - p_in) * 520
    elif enter == "slide-right":
        x += (1 - p_in) * 520
    elif enter == "rise":
        yb += (1 - p_in) * 700
    elif enter == "zoom":
        h *= 1 + 0.28 * (1 - p_in)
    h *= 1 - 0.06 * p_out
    yb -= 14 * math.sin(t * 1.3 + x * 0.01) + 22 * life
    rgb, a = spr.scaled(h)
    hh, ww = a.shape
    x0, y0 = int(x - ww / 2), int(yb - hh)
    # motion blur while sliding fast
    v = (1 - p_in)
    if v > 0.05 and enter in ("slide-left", "slide-right", "rise"):
        k = int(10 + 50 * v)
        ker = np.zeros((k, k), np.float32)
        if enter == "rise": ker[:, k // 2] = 1
        else: ker[k // 2, :] = 1
        ker /= ker.sum()
        rgb = cv2.filter2D(rgb, -1, ker); a = cv2.filter2D(a, -1, ker)
    # drop shadow on the background
    pad = 40
    sh = cv2.copyMakeBorder(a, pad, pad, pad, pad, cv2.BORDER_CONSTANT, 0)
    sh_s = cv2.GaussianBlur(sh, (0, 0), 16)
    paste(dst, np.zeros(sh.shape + (3,), np.float32), sh_s, x0 - pad + 22, y0 - pad + 26, C["shadow_opacity"] * opacity)
    # outer glow
    glow = cv2.GaussianBlur(sh, (0, 0), 22)
    gcol = np.ones(sh.shape + (3,), np.float32) * np.array(C["glow_color"], np.float32)
    paste(dst, gcol, glow, x0 - pad, y0 - pad, C["glow_strength"] * opacity * (ov.get("glow", 1.0)), mode="add")
    # rim light + slight environment grade
    rim = edge_light(a, (7, 9), 2.0)
    body = rgb * np.array([0.94, 1.0, 0.96], np.float32) * ov.get("exposure", 1.0)
    body = body + rim[..., None] * np.array(C["glow_color"], np.float32) * C["rim_strength"]
    paste(dst, np.clip(body, 0, 1.5), a, x0, y0, opacity)


# ---------------------------------------------------------------- text
def render_text_rgba(text, font_path, size, fill, stroke, stroke_color, shadow, glow=None, max_width=None):
    font = ImageFont.truetype(font_path, size)
    lines = [text]
    if max_width:
        tmp = ImageDraw.Draw(Image.new("L", (10, 10)))
        if tmp.textlength(text, font=font, direction="rtl") > max_width:
            words = text.split(" "); best = None
            for k in range(1, len(words)):
                l1, l2 = " ".join(words[:k]), " ".join(words[k:])
                m = max(tmp.textlength(l1, font=font, direction="rtl"), tmp.textlength(l2, font=font, direction="rtl"))
                if best is None or m < best[0]:
                    best = (m, [l1, l2])
            if best: lines = best[1]
    lh = int(size * 1.12)
    pad = stroke + 40
    tmp = ImageDraw.Draw(Image.new("L", (10, 10)))
    wmax = max(int(tmp.textlength(l, font=font, direction="rtl")) for l in lines)
    Wd, Hd = wmax + 2 * pad, lh * len(lines) + 2 * pad
    def layer(fillc, strokec, sw):
        im = Image.new("RGBA", (Wd, Hd), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        for i, l in enumerate(lines):
            d.text((Wd / 2, pad + lh * i + lh / 2), l, font=font, anchor="mm", direction="rtl",
                   fill=fillc, stroke_width=sw, stroke_fill=strokec)
        return im
    out = Image.new("RGBA", (Wd, Hd), (0, 0, 0, 0))
    if shadow:
        (ox, oy), blur, op = shadow
        s = layer((0, 0, 0, 255), (0, 0, 0, 255), stroke)
        a = s.getchannel("A").filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * op))
        sh = Image.new("RGBA", (Wd, Hd), (0, 0, 0, 0)); sh.putalpha(a)
        out.alpha_composite(sh, (ox, oy)) if ox >= 0 and oy >= 0 else out.alpha_composite(sh)
    if glow:
        col, blur, op = glow
        g = layer(tuple(col) + (255,), tuple(col) + (255,), stroke)
        a = g.getchannel("A").filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(min(255, v * op)))
        gl = Image.new("RGBA", (Wd, Hd), tuple(col) + (0,)); gl.putalpha(a)
        out.alpha_composite(gl)
    out.alpha_composite(layer(tuple(fill) + (255,), tuple(stroke_color) + (255,), stroke))
    arr = np.asarray(out).astype(np.float32) / 255
    return arr[..., :3].copy(), arr[..., 3].copy()


def draw_rgba_scaled(dst, rgb, a, cx, cy, scale, opacity):
    if opacity <= 0.003:
        return
    if abs(scale - 1) > 0.01:
        h, w = a.shape
        nw, nh = max(2, int(w * scale)), max(2, int(h * scale))
        rgb = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_LINEAR)
        a = cv2.resize(a, (nw, nh), interpolation=cv2.INTER_LINEAR)
    h, w = a.shape
    paste(dst, rgb, a, int(cx - w / 2), int(cy - h / 2), opacity)


# ---------------------------------------------------------------- fx
def ring(dst, cx, cy, r, thick, col, strength):
    H, W = dst.shape[:2]
    l = np.zeros((H // 2, W // 2), np.float32)
    cv2.circle(l, (int(cx / 2), int(cy / 2)), int(r / 2), 1.0, max(1, int(thick / 2)), cv2.LINE_AA)
    l = cv2.GaussianBlur(l, (0, 0), 5)
    l = cv2.resize(l, (W, H))
    dst += l[..., None] * np.array(col, np.float32) * strength


class Burst:
    def __init__(self, cx, cy, n, seed):
        rng = np.random.default_rng(seed)
        ang = rng.random(n) * 6.283; sp = rng.random(n) * 900 + 250
        self.vx, self.vy = np.cos(ang) * sp, np.sin(ang) * sp
        self.cx, self.cy = cx, cy; self.r = rng.random(n) * 3 + 1.5

    def draw(self, dst, age, life, col):
        if age < 0 or age > life:
            return
        H, W = dst.shape[:2]
        k = 1 - age / life
        d = (1 - math.exp(-3.2 * age)) / 3.2
        l = np.zeros((H // 2, W // 2), np.float32)
        for vx, vy, r in zip(self.vx, self.vy, self.r):
            cv2.circle(l, (int((self.cx + vx * d) / 2), int((self.cy + vy * d) / 2)), max(1, int(r * (0.5 + k) / 2)), float(k), -1, cv2.LINE_AA)
        l = cv2.resize(cv2.GaussianBlur(l, (0, 0), 1.2), (W, H))
        dst += l[..., None] * np.array(col, np.float32) * 1.3


def glitch(img, amount, rng):
    H, W = img.shape[:2]
    o = int(14 * amount)
    out = img.copy()
    out[:, :, 0] = np.roll(img[:, :, 0], o, axis=1)
    out[:, :, 2] = np.roll(img[:, :, 2], -o, axis=1)
    for _ in range(int(7 * amount)):
        y = rng.integers(0, H - 60); h = rng.integers(8, 60); s = rng.integers(-60, 60)
        out[y:y + h] = np.roll(out[y:y + h], int(s * amount), axis=1)
    return out


# ---------------------------------------------------------------- audio
def synth_audio(proj, tl, base, P_audio, out_wav, sr=48000):
    src = rel(base, proj["source_video"])
    tmp = out_wav + ".src.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "2", "-ar", str(sr), tmp], check=True)
    with wave.open(tmp) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, 2) / 32768
    fade = int(0.012 * sr)
    parts = []
    for f0, f1, _ in tl.ranges:
        s0, s1 = int(f0 / tl.fps * sr), int(f1 / tl.fps * sr)
        seg = a[s0:s1].copy()
        ramp = np.linspace(0, 1, fade)[:, None]
        seg[:fade] *= ramp; seg[-fade:] *= ramp[::-1]
        parts.append(seg)
    voice = np.concatenate(parts)
    n = int(tl.n_out / tl.fps * sr)
    voice = np.pad(voice, ((0, max(0, n - len(voice))), (0, 0)))[:n]
    vwav = out_wav + ".voice.wav"; vproc = out_wav + ".voice_proc.wav"
    write_wav(vwav, voice, sr)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vwav, "-af", P_audio["voice_chain"], "-ar", str(sr), vproc], check=True)
    with wave.open(vproc) as w:
        voice = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, 2) / 32768
    voice = np.pad(voice, ((0, max(0, n - len(voice))), (0, 0)))[:n]

    rng = np.random.default_rng(3)
    db = lambda d: 10 ** (d / 20)
    fx = np.zeros((n, 2), np.float32)
    T = np.arange(n) / sr

    def add(sig, t0, gain, pan=0.0):
        i0 = int(t0 * sr)
        if i0 >= n: return
        if i0 < 0: sig = sig[-i0:]; i0 = 0
        m = min(len(sig), n - i0)
        fx[i0:i0 + m, 0] += sig[:m] * gain * (1 - max(0, pan))
        fx[i0:i0 + m, 1] += sig[:m] * gain * (1 + min(0, pan))

    def bandnoise(dur, f_start, f_end, q=0.25):
        m = int(dur * sr)
        noise = rng.standard_normal(m).astype(np.float32)
        out = np.zeros(m, np.float32)
        y1 = y2 = 0.0
        # swept 2-pole resonant bandpass (state variable filter)
        low = band = 0.0
        fcs = np.geomspace(f_start, f_end, m)
        for i in range(m):
            f = 2 * math.sin(math.pi * fcs[i] / sr)
            low += f * band
            high = noise[i] - low - q * band
            band += f * high
            out[i] = band
        return out / (np.abs(out).max() + 1e-6)

    def whoosh(dur=0.55):
        s = bandnoise(dur, 300, 3800, 0.5)
        env = np.sin(np.linspace(0, math.pi, len(s))) ** 1.6
        return s * env

    def impact(dur=1.4):
        m = int(dur * sr); t = np.arange(m) / sr
        f = 70 * np.exp(-t * 2.2) + 32
        body = np.sin(2 * math.pi * np.cumsum(f) / sr) * np.exp(-t * 2.6)
        click = rng.standard_normal(m) * np.exp(-t * 60) * 0.5
        tail = bandnoise(dur, 900, 120, 0.8) * np.exp(-t * 3.5) * 0.35
        return (body + click + tail).astype(np.float32)

    def riser(dur=1.3):
        m = int(dur * sr); t = np.arange(m) / sr
        s = bandnoise(dur, 200, 5000, 0.35) * (t / dur) ** 2
        tone = np.sin(2 * math.pi * np.cumsum(np.geomspace(110, 880, m)) / sr) * (t / dur) ** 3 * 0.35
        return (s + tone).astype(np.float32)

    def energy(dur=0.9):
        m = int(dur * sr); t = np.arange(m) / sr
        s = sum(np.sin(2 * math.pi * f * t * (1 + 0.15 * t)) for f in (523, 784, 1046, 1568)) / 4
        return (s * np.exp(-t * 4.5) * np.minimum(1, t * 40)).astype(np.float32)

    def tick():
        return whoosh(0.22) * 0.8

    # drone bed (original, procedural)
    lfo = 0.6 + 0.4 * np.sin(2 * math.pi * 0.07 * T)
    drone = (np.sin(2 * math.pi * 55 * T) * 0.5 + np.sin(2 * math.pi * 82.41 * T + 0.3) * 0.32
             + np.sin(2 * math.pi * 110.2 * T) * 0.12 * (0.5 + 0.5 * np.sin(2 * math.pi * 0.11 * T)))
    dn = rng.standard_normal(n).astype(np.float32)
    k = np.ones(400) / 400
    air = np.convolve(dn, k, mode="same") * 6
    bed = (drone * lfo + air * 0.25).astype(np.float32)
    env = np.minimum(1, T / 1.5) * np.minimum(1, (T[-1] - T) / 1.2)
    fx[:, 0] += bed * env * db(P_audio["drone_db"]); fx[:, 1] += bed * env * db(P_audio["drone_db"])

    for c in proj.get("sfx", []):
        t = tl.to_out(c["t"]) + c.get("offset", 0.0)
        kind = c["type"]; g = db(P_audio[kind + "_db"] + c.get("gain_db", 0))
        sig = {"whoosh": whoosh, "impact": impact, "riser": riser, "energy": energy}[kind]()
        if kind == "riser":
            t -= len(sig) / sr
        add(sig, t, g, c.get("pan", 0.0))
    for ct in tl.cut_points_out():
        add(tick(), ct - 0.11, db(P_audio["cut_tick_db"]))

    mix = voice + fx
    peak = np.abs(mix).max()
    lim = P_audio["final_limit"]
    if peak > lim:
        mix = np.tanh(mix / lim) * lim  # soft-clip safety
    tail = int(0.45 * sr)
    mix[-tail:] *= np.linspace(1, 0, tail)[:, None]
    write_wav(out_wav, mix, sr)
    for p in (tmp, vwav, vproc):
        os.remove(p)


def write_wav(path, x, sr):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------- main render
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--preview", nargs=2, type=float, help="output-time range to render")
    ap.add_argument("--stills", help="comma separated output times; writes PNGs and exits")
    ap.add_argument("--out")
    ap.add_argument("--no-audio", action="store_true")
    args = ap.parse_args()

    proj_path = os.path.abspath(args.project); base = os.path.dirname(proj_path)
    proj = json.load(open(proj_path))
    preset = json.load(open(rel(HERE, proj.get("preset", "preset.json"))))
    O, BGP, S, C, CAP, AUD = preset["output"], preset["background"], preset["speaker"], preset["characters"], preset["captions"], preset["audio"]
    W, H, fps = O["width"], O["height"], O["fps"]
    src = rel(base, proj["source_video"])
    masks = rel(base, proj["mask_dir"])
    work = rel(base, proj.get("work_dir", "work")); os.makedirs(work, exist_ok=True)

    # 1. edit list
    wav16 = os.path.join(work, "src_audio.wav")
    if not os.path.exists(wav16):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", wav16], check=True)
    keeps = refine_keeps(proj["keep"], wav16)
    tl = Timeline(keeps, fps)
    json.dump({"keeps_refined": keeps, "duration_out": tl.n_out / fps}, open(os.path.join(work, "edl.json"), "w"), indent=1)
    print(f"edit: {len(keeps)} ranges, output {tl.n_out / fps:.2f}s", flush=True)

    # 2. pre-render captions / cards, map times
    font = rel(HERE, CAP["font"])
    caps = []
    for c in proj["captions"]:
        rgb, a = render_text_rgba(c["text"], font, CAP["size"], CAP["highlight"] if c.get("hl") else CAP["fill"],
                                  CAP["stroke"], CAP["stroke_color"],
                                  (tuple(CAP["shadow_offset"]), CAP["shadow_blur"], CAP["shadow_opacity"]),
                                  max_width=CAP["max_width"])
        caps.append(dict(t0=tl.to_out(c["start"]), t1=tl.to_out(c["end"]), rgb=rgb, a=a))
    for i, c in enumerate(caps):  # never overlap
        if i + 1 < len(caps):
            c["t1"] = min(c["t1"] + CAP["max_hold_s"], caps[i + 1]["t0"])
    cards = []
    for cd in proj.get("cards", []):
        items = []
        for ln in cd["lines"]:
            col = ln.get("color", [255, 255, 255])
            rgb, a = render_text_rgba(ln["text"], rel(HERE, ln.get("font", CAP["font"])), ln["size"], col, ln.get("stroke", 8), [0, 0, 0],
                                      ((0, 6), 8, 0.7), glow=(ln.get("glow", [60, 255, 140]), ln.get("glow_blur", 18), ln.get("glow_op", 1.6)))
            items.append((rgb, a, ln["dy"]))
        cards.append(dict(t0=tl.to_out(cd["start"]), t1=tl.to_out(cd["end"]), y=cd["y"], items=items, panel=cd.get("panel")))

    sprites = {k: Sprite(rel(base, v)) for k, v in proj["assets"].items()}
    ovs = []
    for o in proj.get("overlays", []):
        d = dict(o); d["t_in"] = tl.to_out(o["in"]); d["t_out"] = tl.to_out(o["out"]); ovs.append(d)
    fxs = []
    for e in proj.get("fx", []):
        d = dict(e); d["t"] = tl.to_out(e["t"]); fxs.append(d)
        if e["type"] == "burst":
            d["obj"] = Burst(e["x"], e["y"], e.get("n", 70), int(e["t"] * 100))
    punches = [dict(p, t=tl.to_out(p["t"])) for p in proj.get("punch", [])]
    dims = [dict(d, t0=tl.to_out(d["start"]), t1=tl.to_out(d["end"])) for d in proj.get("bg_dim", [])]

    bg = CosmicBackground(BGP, W, H, fps)
    matte = Matte(masks, S, W, H)
    rng = np.random.default_rng(11)

    if args.stills:
        frames_out = sorted(int(float(t) * fps) for t in args.stills.split(","))
    elif args.preview:
        frames_out = list(range(int(args.preview[0] * fps), min(tl.n_out, int(args.preview[1] * fps))))
    else:
        frames_out = list(range(tl.n_out))
    need_src = {}
    for of in frames_out:
        need_src.setdefault(tl.src_frame(of), []).append(of)

    out_path = args.out or rel(base, proj.get("output", "output/final.mp4"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    enc = None
    if not args.stills:
        silent = out_path + ".video.mp4"
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                                "-c:v", "libx264", "-preset", O["x264_preset"], "-crf", str(O["crf"]), "-pix_fmt", "yuv420p",
                                "-x264-params", "aq-mode=3", silent], stdin=subprocess.PIPE)

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    fa = S["face_anchor"]
    last_src = max(need_src)
    si = 0; pending = {}
    import time as _t; t_start = _t.time(); done = 0
    while si <= last_src:
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        if si in need_src:
            frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
            for of in need_src[si]:
                img = compose(of, si, frame, tl, bg, matte, S, C, sprites, ovs, fxs, punches, dims, caps, cards, CAP, fa, rng, fps)
                out8 = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
                if args.stills:
                    cv2.imwrite(os.path.join(work, f"still_{of / fps:06.2f}.png"), out8[:, :, ::-1])
                else:
                    pending[of] = out8
            while not args.stills and frames_out and frames_out[0] in pending:
                enc.stdin.write(pending.pop(frames_out.pop(0)).tobytes()); done += 1
                if done % 60 == 0:
                    el = _t.time() - t_start
                    print(f"{done} frames  {el / done:.2f}s/f", flush=True)
        si += 1
    dec.stdout.close(); dec.wait()
    if args.stills:
        print("stills written to", work); return
    enc.stdin.close(); enc.wait()

    if args.preview or args.no_audio:
        os.replace(silent, out_path); print("wrote", out_path); return
    aud = os.path.join(work, "mix.wav")
    synth_audio(proj, tl, base, AUD, aud)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", aud, "-c:v", "copy", "-c:a", "aac", "-b:a", O["audio_bitrate"],
                    "-shortest", "-movflags", "+faststart", out_path], check=True)
    os.remove(silent)
    print("wrote", out_path)


_VIG = {}


def finish_vignette(H, W):
    """Gentle global vignette + bottom grade that unifies speaker, desk and background."""
    if (H, W) not in _VIG:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / (W * 0.8)) ** 2 + ((yy - H * 0.42) / (H * 0.75)) ** 2)
        v = 1 - 0.22 * np.clip(d, 0, 1.3) ** 2.5
        v *= 1 - 0.30 * np.clip((yy - H * 0.86) / (H * 0.14), 0, 1) ** 1.5
        _VIG[(H, W)] = v[..., None].astype(np.float32)
    return _VIG[(H, W)]


def compose(of, si, frame, tl, bg, matte, S, C, sprites, ovs, fxs, punches, dims, caps, cards, CAP, fa, rng, fps):
    H, W = frame.shape[:2]
    t = of / fps
    # ---- camera: alternating base zoom per jump-cut segment + slow push + punches + shake
    ri, prog = tl.range_index(of)
    alt = S["base_zoom_alternation"]
    s = alt[ri % len(alt)] + S["slow_push"] * prog
    for p in punches:
        u = (t - p["t"]) / p.get("dur", 0.45)
        if 0 <= u <= 1:
            s += p["amount"] * math.sin(math.pi * min(1, u * 1.6)) ** 0.6 * (1 - u) ** 0.5
    sx = sy = 0.0
    for e in fxs:
        if e["type"] == "shake":
            u = (t - e["t"]) / e["dur"]
            if 0 <= u <= 1:
                amp = e["amp"] * (1 - u) ** 1.5
                sx += amp * math.sin(t * 91.3) ; sy += amp * math.cos(t * 77.7)
    s = max(s, 1 + 2.2 * max(abs(sx), abs(sy)) / W)

    # ---- background
    img = bg.frame(t, (sx * 0.4, sy * 0.4))
    dim = 1.0
    for d in dims:
        if d["t0"] <= t <= d["t1"]:
            ramp = min(1, (t - d["t0"]) / 0.3, (d["t1"] - t) / 0.3)
            dim = min(dim, 1 - (1 - d["amount"]) * ramp)
    img *= dim

    # ---- characters behind the speaker
    for o in ovs:
        if o.get("layer", "behind") == "behind":
            render_character(img, sprites[o["asset"]], o, t, C)
    # light flashes hit the environment fully (the speaker only gets a faint neutral wash later)
    for e in fxs:
        if e["type"] == "flash":
            u = (t - e["t"]) / e.get("dur", 0.3)
            if 0 <= u <= 1:
                img += np.array(e.get("color", [0.42, 0.72, 0.52]), np.float32) * (1 - u) ** 2 * e.get("strength", 0.5)
    # pulses / bursts in the background layer
    for e in fxs:
        if e["type"] == "pulse" and e.get("layer", "behind") == "behind":
            u = (t - e["t"]) / e.get("dur", 0.7)
            if 0 <= u <= 1:
                ring(img, e["x"], e["y"], 60 + 1100 * ease_out_cubic(u), 40 * (1 - u) + 6, [0.38, 0.78, 0.52], 1.1 * (1 - u))

    # ---- speaker
    M = np.float32([[s, 0, fa[0] * (1 - s) + sx], [0, s, fa[1] * (1 - s) + sy]])
    rgb = frame.astype(np.float32) / 255
    alpha = matte.get(si)
    # remove leftover slivers of the old wall: neutral, bright pixels close to the silhouette edge
    fg = (alpha > 0.5).astype(np.uint8)
    dist = cv2.distanceTransform(fg, cv2.DIST_L2, 3)
    lum = rgb.mean(-1)
    wall = ((dist < S.get("wall_band_px", 28)) & (lum > S.get("wall_lum", 0.5)) & ((rgb[..., 0] - rgb[..., 2]) < S.get("wall_chroma", 0.07))).astype(np.float32)
    wall = cv2.GaussianBlur(cv2.dilate(wall, np.ones((3, 3), np.uint8)), (0, 0), 1.5)
    alpha = alpha * (1 - np.clip(wall * 1.2, 0, 1))
    rgb = cv2.warpAffine(rgb, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    alpha = cv2.warpAffine(alpha, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    # choke the matte slightly and decontaminate edge colours (removes old-wall halo)
    ck = S.get("choke_px", 7)
    alpha = cv2.erode(alpha, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ck, ck)))
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.3)
    lo, hi = S.get("edge_ramp", [0.35, 0.95])
    alpha = np.clip((alpha - lo) / (hi - lo), 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    h2, w2 = H // 2, W // 2
    a_s = cv2.resize(alpha, (w2, h2), interpolation=cv2.INTER_AREA)
    core = (a_s > 0.985).astype(np.float32)
    core = cv2.erode(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    rgb_s = cv2.resize(rgb, (w2, h2), interpolation=cv2.INTER_AREA)
    num = cv2.GaussianBlur(rgb_s * core[..., None], (0, 0), 7)
    den = cv2.GaussianBlur(core, (0, 0), 7)[..., None]
    F = cv2.resize(num / (den + 1e-4), (W, H), interpolation=cv2.INTER_LINEAR)
    den_f = cv2.resize(den[..., 0], (W, H), interpolation=cv2.INTER_LINEAR)
    wdec = (np.clip((0.98 - alpha) / 0.5, 0, 1) * np.clip(den_f * 6, 0, 1))[..., None]
    rgb = rgb * (1 - wdec) + np.clip(F, 0, 1) * wdec
    rgb = grade_speaker(rgb, S)
    # light wrap from the environment
    small = cv2.resize(img, (W // 8, H // 8), interpolation=cv2.INTER_AREA)
    env = cv2.resize(cv2.GaussianBlur(small, (0, 0), 3), (W, H))
    soft = cv2.resize(cv2.GaussianBlur(cv2.resize(alpha, (W // 4, H // 4)), (0, 0), 4), (W, H))
    wrap = np.clip(alpha - soft, 0, 1)[..., None] * 2.2 * S["light_wrap"]
    rgb = rgb * (1 - wrap) + np.clip(env * 1.6, 0, 1) * wrap
    # rim lights (top-left key, right fill)
    r1 = edge_light(alpha, (6, 8), 2.2)
    r2 = edge_light(alpha, (-7, 3), 2.0)
    rim = np.array(S["rim_color"], np.float32)
    rgb = rgb + (r1 * S["rim_strength"] + r2 * S["rim_strength"] * 0.55)[..., None] * rim
    # soft contact shadow of the speaker on the environment (depth + separation)
    sh = cv2.resize(alpha, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    sh = cv2.warpAffine(sh, np.float32([[1, 0, 5], [0, 1, 6]]), (W // 4, H // 4), borderMode=cv2.BORDER_REPLICATE)
    sh = cv2.resize(cv2.GaussianBlur(sh, (0, 0), 7), (W, H))
    img = img * (1 - S.get("drop_shadow", 0.35) * sh[..., None])
    img = img * (1 - alpha[..., None]) + rgb * alpha[..., None]

    # ---- front layer characters
    for o in ovs:
        if o.get("layer") == "front":
            render_character(img, sprites[o["asset"]], o, t, C)

    # ---- fx on top
    for e in fxs:
        u = (t - e["t"]) / e.get("dur", 0.3)
        if e["type"] == "flash" and 0 <= u <= 1:
            k = (1 - u) ** 2 * e.get("strength", 0.5) * 0.3
            img += np.array([0.9, 1.0, 0.93], np.float32) * k
        elif e["type"] == "pulse" and e.get("layer") == "front" and 0 <= u <= 1:
            ring(img, e["x"], e["y"], 60 + 1100 * ease_out_cubic(u), 40 * (1 - u) + 6, [0.38, 0.78, 0.52], 1.1 * (1 - u))
        elif e["type"] == "burst":
            e["obj"].draw(img, t - e["t"], e.get("dur", 0.9), [0.5, 0.85, 0.6])
        elif e["type"] == "glitch" and 0 <= u <= 1:
            img = glitch(img, 1 - u, rng)

    # ---- cards
    for cd in cards:
        if cd["t0"] <= t <= cd["t1"]:
            pin = ease_out_back((t - cd["t0"]) / 0.32)
            pout = clamp01((t - (cd["t1"] - 0.25)) / 0.25)
            op = clamp01((t - cd["t0"]) / 0.12) * (1 - pout)
            sc = (0.7 + 0.3 * pin) * (1 - 0.1 * pout)
            for k, (crgb, ca, dy) in enumerate(cd["items"]):
                pk = ease_out_back((t - cd["t0"] - 0.07 * k) / 0.32)
                draw_rgba_scaled(img, crgb, ca, W / 2, cd["y"] + dy * sc, sc * (0.75 + 0.25 * pk), op * clamp01(pk * 3))

    # ---- captions
    for c in caps:
        if c["t0"] <= t < c["t1"]:
            u = (t - c["t0"]) / CAP["pop_s"]
            sc = CAP["pop_from"] + (1 - CAP["pop_from"]) * ease_out_back(u, 2.2)
            op = clamp01(u * 2.2) * clamp01((c["t1"] - t) / 0.05)
            draw_rgba_scaled(img, c["rgb"], c["a"], W / 2, CAP["center_y"], sc, op)

    # ---- intro / outro fades
    img *= finish_vignette(H, W)
    T = tl.n_out / fps
    img *= clamp01(t / 0.25) * clamp01((T - t) / 0.45)
    return img


if __name__ == "__main__":
    main()
