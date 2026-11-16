# Paced, resumable Commons search + download. Writes one JSON line per downloaded file to cache/heroes/manifest.jsonl.
import json, os, sys, time, urllib.parse, urllib.request, urllib.error, re, html
UA = {"User-Agent": "video-asset-fetch/1.0 (personal project)"}
OUT = "cache/heroes"; os.makedirs(OUT, exist_ok=True)
MAN = f"{OUT}/manifest.jsonl"
done = set()
if os.path.exists(MAN):
    for l in open(MAN): done.add(json.loads(l)["title"])
def get(url, tries=12):
    for a in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except (urllib.error.HTTPError, urllib.error.URLError) as e:
            code = getattr(e, "code", None)
            if code in (429, None, 503): time.sleep(min(30 * (a + 1), 180)); continue
            raise
    raise RuntimeError("gave up " + url)
def search(q, n):
    u = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "generator": "search", "gsrsearch": f"{q} filetype:bitmap", "gsrnamespace": 6, "gsrlimit": n,
        "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 1280, "format": "json"})
    r = json.loads(get(u)); out = []
    for p in (r.get("query", {}).get("pages", {}) or {}).values():
        ii = p["imageinfo"][0]; m = ii.get("extmetadata", {})
        g = lambda k: re.sub("<[^>]+>", "", html.unescape(m.get(k, {}).get("value", ""))).strip()
        out.append({"title": p["title"], "w": ii["width"], "h": ii["height"], "thumb": ii.get("thumburl", "").split("?")[0].replace("thumb.wikimedia.org", "upload.wikimedia.org"),
                    "page": ii["descriptionurl"], "license": g("LicenseShortName"), "artist": g("Artist")[:120], "index": p.get("index", 99)})
    return sorted(out, key=lambda x: x["index"])
OK = re.compile(r"^(CC BY(-SA)? [0-9.]+|CC0|Public domain)", re.I)
plan = json.load(open(sys.argv[1]))   # [{"q": "...", "take": 2, "tag": "ironman", "prefer": "portrait"}]
for item in plan:
    try: res = search(item["q"], 20)
    except Exception as e: print("search fail", item["q"], e, flush=True); continue
    time.sleep(5)
    cands = [x for x in res if OK.match(x["license"]) and x["thumb"] and min(x["w"], x["h"]) >= 1000 and not any(b in x["title"].lower() for b in item.get("avoid", []))]
    if item.get("prefer") == "portrait": cands.sort(key=lambda x: (x["h"] < x["w"], x["index"]))
    took = sum(1 for l in open(MAN) if json.loads(l)["tag"] == item["tag"]) if os.path.exists(MAN) else 0
    for x in cands:
        if took >= item.get("take", 2): break
        if x["title"] in done: continue
        fn = f'{OUT}/{item["tag"]}_{took}.jpg'
        try: data = get(x["thumb"])
        except Exception as e: print("dl fail", x["title"], e, flush=True); continue
        open(fn, "wb").write(data); took += 1; done.add(x["title"])
        rec = {**x, "file": fn, "tag": item["tag"], "query": item["q"]}
        open(MAN, "a").write(json.dumps(rec, ensure_ascii=False) + "\n")
        print("got", fn, x["license"], "|", x["title"][5:80], flush=True); time.sleep(8)
print("ALL DONE", flush=True)
