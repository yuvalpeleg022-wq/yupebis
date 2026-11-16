import json, re, sys, time, urllib.request, urllib.error
UA = {"User-Agent": "video-asset-fetch/1.0 (personal project)"}
r = json.load(open("cache/commons_results.json"))
pick = [l.strip() for l in open(sys.argv[1]) if l.strip()]
allx = {x["title"]: x for q in r.values() for x in q}
man = []
for i, key in enumerate(pick):
    x = next((v for t, v in allx.items() if key in t), None)
    if not x: print("MISSING", key); continue
    fn = f"cache/cands/c{i:02d}.jpg"
    for a in range(8):
        try:
            data = urllib.request.urlopen(urllib.request.Request(x["thumb"].split("?")[0].replace("thumb.wikimedia.org","upload.wikimedia.org"), headers=UA), timeout=60).read(); break
        except (urllib.error.HTTPError, urllib.error.URLError) as e:
            if getattr(e,"code",429) == 429: time.sleep(10*(a+1)); continue
            raise
    open(fn, "wb").write(data); man.append({"file": fn, **x}); print(fn, x["title"][5:70]); time.sleep(3)
json.dump(man, open("cache/cands/index.json", "w"), ensure_ascii=False, indent=1)
