import sys, glob
from PIL import Image, ImageDraw, ImageFont
files = sorted(glob.glob(sys.argv[1])); out = sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
W, H = 300, 400; f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
rows = (len(files)+cols-1)//cols; sheet = Image.new("RGB", (cols*(W+6), rows*(H+6)), (25,25,25))
for i, p in enumerate(files):
    im = Image.open(p).convert("RGB"); im.thumbnail((W, H)); x, y = (i%cols)*(W+6), (i//cols)*(H+6)
    sheet.paste(im, (x+(W-im.width)//2, y+(H-im.height)//2)); d = ImageDraw.Draw(sheet)
    lab = p.split("/")[-1].split(".")[0] + f" {Image.open(p).size[0]}x{Image.open(p).size[1]}"; d.rectangle((x, y, x+len(lab)*12, y+26), fill=(0,0,0)); d.text((x+4, y+2), lab, font=f, fill=(255,255,255))
sheet.save(out, quality=85); print(out, len(files))
