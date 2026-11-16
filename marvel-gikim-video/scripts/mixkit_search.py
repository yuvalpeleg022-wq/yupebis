# Search Mixkit stock video pages, collect clips (JSON-LD), download 720p thumbnails for review.
import json, os, re, sys, time, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (video-asset-fetch)"}
OUT = "cache/mixkit"; os.makedirs(f"{OUT}/thumbs", exist_ok=True)
qs = sys.argv[2:]; per = int(sys.argv[1]); allc = {}
try: allc = json.load(open(f"{OUT}/clips.json"))
except Exception: pass
for q in qs:
    url = f"https://mixkit.co/free-stock-video/{q}/"
    try: s = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode("utf-8", "ignore")
    except Exception as e: print("fail", q, e); continue
    objs = re.findall(r'\{"@type":"VideoObject".*?"about":\[[^\]]*\]\}', s)
    got = 0
    for o in objs:
        try: d = json.loads(o)
        except Exception: continue
        m = re.search(r'/videos/(\d+)/', d.get("contentUrl", ""))
        if not m: continue
        vid = m.group(1)
        if vid not in allc: allc[vid] = {"id": vid, "name": d.get("name"), "desc": d.get("description"), "url": d["contentUrl"], "thumb": d.get("thumbnailUrl"), "page": d.get("@id", "").replace("#video", ""), "q": q}
        if got < per:
            fn = f"{OUT}/thumbs/{q}__{vid}.jpg"
            if not os.path.exists(fn):
                try: open(fn, "wb").write(urllib.request.urlopen(urllib.request.Request(d["thumbnailUrl"], headers=UA), timeout=30).read())
                except Exception as e: print("thumb fail", vid, e)
            got += 1
    print(f"{q}: {len(objs)} clips, {got} thumbs", flush=True); time.sleep(1)
json.dump(allc, open(f"{OUT}/clips.json", "w"), indent=1)
