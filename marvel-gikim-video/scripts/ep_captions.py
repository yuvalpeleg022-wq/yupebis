# Episode captions: whisper segments → phrase groups (≤5 words, split on punctuation), spelling fixes, time offset.
import json, re, sys
ep, lead = sys.argv[1], float(sys.argv[2])
d = json.load(open(f"episodes/{ep}/cache/transcript.json"))
FIX = {"מרווין": "מארוול", "מרוויל": "מארוול", "הרכבנו": "הרחבנו", "תוריות": "טעויות", "יצרי": "יוצרי", "מעצמם": "מעצבים", "בגרפים": "גרפיים", "לארוך": "לערוך", "מסדרות": "ומסדרות", "מרווילים": "מארוול"}
groups = []
for s in d["segments"]:
    ws = []
    for w in s["words"]:
        raw = w["w"].strip(); core = re.sub(r"[,.?!:]", "", raw); tail = raw[len(core):] if raw.startswith(core) else ""
        ws.append({"w": FIX.get(core, core) + tail, "s": round(w["s"] + lead, 3), "e": round(w["e"] + lead, 3)})
    cur = []
    for i, w in enumerate(ws):
        cur.append(w)
        if len(cur) >= 5 or w["w"].endswith((",", ".", "?", "!")) or i == len(ws) - 1:
            groups.append(cur); cur = []
res = []
for gi, g in enumerate(groups):
    nxt = groups[gi + 1][0]["s"] if gi + 1 < len(groups) else 1e9
    res.append({"s": g[0]["s"], "e": round(min(nxt, g[-1]["e"] + .8), 3), "words": [{"w": x["w"], "s": x["s"]} for x in g]})
open(f"episodes/{ep}/captions.js", "w").write("window.CAPTIONS = " + json.dumps(res, ensure_ascii=False) + ";\n")
print(len(res), "groups; first", res[0]["s"], "last end", res[-1]["e"])
for c in res: print(f'{c["s"]:7.2f}', " ".join(x["w"] for x in c["words"]))
