# Build word-timed caption groups (video time) from the transcript, with spelling fixes.
import json, re
OFF = 2.6
d = json.load(open("cache/transcript.json"))
W = [dict(w=x["w"], s=round(x["s"]-OFF, 3), e=round(x["e"]-OFF, 3)) for s in d["segments"] for x in s["words"]]
fix = {"מרוויל": "מארוול", "הרשימה": "הרשמה"}
out = []
i = 0
while i < len(W):
    w = dict(W[i]); w["w"] = fix.get(w["w"].rstrip(",.?"), w["w"].rstrip(",.?")) + ("," if w["w"].endswith(",") else "") + ("." if w["w"].endswith(".") else "")
    nxt = W[i+1] if i+1 < len(W) else None
    # merge "מ" + "-0" / "ל" + "-1000" and "של"+"לקחתם" -> "שלקחתי"
    if nxt and w["w"] in ("מ", "ל") and nxt["w"].startswith("-"):
        w["w"] = w["w"] + nxt["w"].rstrip(","); w["e"] = nxt["e"]; i += 1
    elif nxt and w["w"] == "של" and nxt["w"].startswith("לקחתם"):
        w["w"] = "שלקחתי"; w["e"] = nxt["e"]; i += 1
    out.append(w); i += 1

norm = lambda x: re.sub(r"[,.?!:]", "", x)
phr = [l.strip() for l in open("plan/caption_phrases.txt", encoding="utf-8") if l.strip()]
k = 0; cap = []
for p in phr:
    ws = p.split(); g = []
    for pw in ws:
        assert norm(pw) == norm(out[k]["w"]), (pw, out[k]["w"], k)
        g.append({"w": pw, "s": out[k]["s"], "e": out[k]["e"]}); k += 1
    cap.append(g)
assert k == len(out), (k, len(out))
res = []
for gi, g in enumerate(cap):
    nxt = cap[gi+1][0]["s"] if gi+1 < len(cap) else 1e9
    end = min(nxt, g[-1]["e"] + 0.9)
    res.append({"s": g[0]["s"], "e": round(end, 3), "words": [{"w": x["w"], "s": x["s"]} for x in g]})
open("src/captions.js", "w").write("window.CAPTIONS = " + json.dumps(res, ensure_ascii=False) + ";\n")
print(len(res), "groups")
for c in res: print(f'{c["s"]:6.2f}-{c["e"]:6.2f}', " ".join(x["w"] for x in c["words"]))
