# Build CREDITS.txt + manifest.json from the assets actually referenced in src/assets.js.
import json, os, re
A = json.loads(re.sub(r"^window\.A = |;\s*$", "", open("src/assets.js").read().strip()))
used = set(v for k, v in A.items() if isinstance(v, str)) | set(p for l in A.get("heroes", {}).values() for p in l)
res = json.load(open("cache/commons_results.json")); allx = {x["title"]: x for q in res.values() for x in q}
pick = [l.strip() for l in open("cache/cands/pick.txt") if l.strip()]
meta = {}
for i, key in enumerate(pick):
    x = next((v for t, v in allx.items() if key in t), None)
    if x: meta[f"c{i:02d}.jpg"] = x
roles = {}
for l in open("scripts/make_assets.py"):
    for m in re.finditer(r'"(\w+)": \((\d+),', l): roles[m.group(1)] = int(m.group(2))
items = []
for role, i in roles.items():
    p = f"../assets/images/{role}.jpg"
    if p in used and f"c{i:02d}.jpg" in meta: items.append({**meta[f"c{i:02d}.jpg"], "file": p[3:], "role": role})
if os.path.exists("cache/heroes/manifest.jsonl"):
    for l in open("cache/heroes/manifest.jsonl"):
        m = json.loads(l); p = "../assets/images/heroes/" + os.path.basename(m["file"])
        if p in used: items.append({**m, "file": p[3:], "role": m["tag"]})
seen, lines = set(), []
for x in items:
    if x["page"] in seen: continue
    seen.add(x["page"]); lines.append(f'- {x["title"][5:].rsplit(".", 1)[0]} — {re.sub(r"\s+", " ", x["artist"]).strip()[:80]} — {x["license"]} — {x["page"]}')
nasa = ["- \"The Aurora Named STEVE\" — NASA Goddard Space Flight Center; the aurora shot inside it is credited 'courtesy of Notanee Bourassa' (third-party footage: NASA media guidelines note such material may carry its own rights) — https://images.nasa.gov/details/GSFC_20180314_Aurora_m12865_Steve",
        "- \"Dust and Drama in the Orion Nebula\" — NASA/JPL-Caltech, ESA (Herschel/Spitzer/WISE data) — NASA media guidelines — https://images.nasa.gov/details/JPL-20221122-SOLSYSf-0001-Orion Dust and Death"]
txt = ["CREDITS – Marvel Gikim course trailer", "",
       "Photos (Wikimedia Commons; cosplay and Comic-Con photography, used under their licences; modified: cropped, colour-graded, subject cut-outs for parallax):", *lines, "",
       "Footage (modified: cropped, colour-graded, slowed):", *nasa, "",
       "Music (Mixkit Stock Music Free License — checked 16 Nov 2026: social media video posts and educational use allowed; https://mixkit.co/license/#musicFree):",
       "- Cinema version: \"Epical Drums 01\" — Mixkit #676",
       "- Hype version: \"Epical Drums 05\" — Mixkit #680",
       "- Documentary version: \"The Journey\" — Mixkit #79",
       "- Green version: \"Cyberpunk City\" by Alejandro Magaña (A. M.) — Mixkit #140",
       "Sound effects: Freesound (CC0) and Kenney (CC0) sounds bundled with the sound-effects skill — no attribution required.",
       "Fonts: Karantina, Heebo, Bebas Neue — SIL Open Font License 1.1 (via Fontsource).",
       "Transcription: ivrit-ai/whisper-large-v3-turbo-ct2 (run locally).", "",
       "Marvel and its characters are trademarks of Marvel/Disney. This is an unofficial fan production, not affiliated with or endorsed by Marvel."]
os.makedirs("renders/final", exist_ok=True)
open("renders/final/CREDITS.txt", "w").write("\n".join(txt) + "\n")
json.dump(items, open("manifest.json", "w"), ensure_ascii=False, indent=1)
print("\n".join(txt[:6 + len(lines)])); print(f"... {len(lines)} photo credits")
