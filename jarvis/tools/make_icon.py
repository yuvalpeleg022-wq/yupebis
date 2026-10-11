"""Draws the arc-reactor app icon → assets/icon.png + assets/icon.ico (needs Pillow)."""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

S = 512
out = Path(__file__).resolve().parent.parent / "assets"
out.mkdir(exist_ok=True)
base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(base)
c = S / 2
d.ellipse([8, 8, S - 8, S - 8], fill=(6, 10, 16, 255))
gold, hot = (255, 176, 64, 255), (255, 232, 180, 255)
d.ellipse([40, 40, S - 40, S - 40], outline=gold, width=10)
for i in range(36):  # segmented band
    if i % 9 == 0:
        continue
    a0 = i * 10
    d.arc([70, 70, S - 70, S - 70], a0, a0 + 7, fill=gold, width=26)
d.ellipse([140, 140, S - 140, S - 140], outline=gold, width=6)
tri = [(c + math.cos(math.radians(-90 + j * 120)) * 150, c + math.sin(math.radians(-90 + j * 120)) * 150)
       for j in range(3)]  # Mk VI triangle
d.polygon(tri, outline=hot, width=12)
d.ellipse([c - 62, c - 62, c + 62, c + 62], outline=hot, width=14)
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([c - 90, c - 90, c + 90, c + 90], fill=(255, 220, 150, 200))
glow = glow.filter(ImageFilter.GaussianBlur(40))
img = Image.alpha_composite(base, glow)
img = Image.alpha_composite(img, base.filter(ImageFilter.GaussianBlur(6)))
img = Image.alpha_composite(img, base)
img.save(out / "icon.png")
img.save(out / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icon written to", out)
