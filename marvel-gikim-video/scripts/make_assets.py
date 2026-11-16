# Map storyboard roles -> image files (copied from Commons candidates), with fallbacks for missing downloads.
import json, os, shutil
roles = {  # role: (candidate index, fallback role)
  "loki_window": (0, None), "loki_think": (1, None), "loki_dagger": (2, None), "loki_cross": (3, None),
  "loki_wondercon": (4, None), "loki_young": (5, None), "loki_stage": (6, None), "doom_studio": (7, None),
  "doom_supercon": (8, "doom_studio"), "doom_galaxy": (9, "doom_studio"), "doom_galaxy2": (10, "doom_studio"),
  "doom_nycc12": (11, "doom_studio"), "doom_nycc22": (12, "doom_studio"), "doom_pax": (13, "doom_studio"),
  "hiddleston_wide": (14, "loki_stage"), "hiddleston_crop": (16, "loki_stage"), "hiddleston_b": (16, "loki_stage"), "hiddleston_16": (17, "loki_stage"),
  "crowd_hall_v": (18, "loki_window"), "crowd_hall": (19, "loki_window"), "crowd": (20, "loki_window"), "sails": (21, "loki_window"),
  "booth_studios": (22, "loki_wondercon"), "booth": (23, "loki_wondercon"), "panel17": (24, "loki_stage"), "avengers_booth": (25, "loki_wondercon"), "booth_mefcc": (26, "loki_wondercon"),
}
idx = {}
try: idx = {os.path.basename(m["file"]): m for m in json.load(open("cache/cands/index.json"))}
except Exception: pass
os.makedirs("assets/images", exist_ok=True)
A, have = {}, {}
for role, (i, fb) in roles.items():
    src = f"cache/cands/c{i:02d}.jpg"
    if os.path.exists(src):
        dst = f"assets/images/{role}.jpg"; shutil.copyfile(src, dst); have[role] = dst
for role, (i, fb) in roles.items():
    r = role
    while r not in have and roles[r][1]: r = roles[r][1]
    A[role] = "../" + have[r]
A["logo"] = "../assets/images/logo_circle.png"; A["doom_cut"] = "../assets/images/doom_cutout.png"
A["seq"] = {"aurora": [138, "../assets/footage/aurora/"], "orion1": [144, "../assets/footage/orion1/"], "orion2": [84, "../assets/footage/orion2/"]}
heroes = {}
if os.path.exists("cache/heroes/manifest.jsonl"):
    os.makedirs("assets/images/heroes", exist_ok=True)
    for l in open("cache/heroes/manifest.jsonl"):
        m = json.loads(l)
        if os.path.basename(m["file"]) in {"ironman_0.jpg", "ironman_1.jpg"}: continue
        dst = "assets/images/heroes/" + os.path.basename(m["file"])
        if os.path.exists(m["file"]): shutil.copyfile(m["file"], dst); heroes.setdefault(m["tag"], []).append("../" + dst)
A["heroes"] = heroes
open("src/assets.js", "w").write("window.A = " + json.dumps(A, indent=1) + ";\n")
print("have", len(have), "of", len(roles), "-> fallbacks for:", [r for r in roles if r not in have])
