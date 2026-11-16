# Subject cutouts for 2.5D parallax: assets/images/cut/<name>.png (RGBA, long side <= 1600)
import glob, os, sys
from PIL import Image
from rembg import new_session, remove
sess = new_session("isnet-general-use")
os.makedirs("assets/images/cut", exist_ok=True)
files = sorted(glob.glob("assets/images/*.jpg") + glob.glob("assets/images/heroes/*.jpg"))
for f in files:
    name = os.path.splitext(os.path.basename(f))[0]; out = f"assets/images/cut/{name}.png"
    if name in ("logo",) or os.path.exists(out): continue
    im = Image.open(f).convert("RGB"); im.thumbnail((1600, 1600))
    cut = remove(im, session=sess, post_process_mask=True)
    cut.save(out); a = cut.getchannel("A"); cov = sum(a.histogram()[128:]) / (a.width * a.height)
    print(f"{name}: {cut.size} coverage {cov:.2f}", flush=True)
print("CUTOUTS DONE", flush=True)
