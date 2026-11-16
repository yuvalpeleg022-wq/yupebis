import json, sys, urllib.parse, urllib.request, re, html
UA = {"User-Agent": "video-asset-fetch/1.0 (personal project)"}
def api(params):
    u = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({**params, "format": "json"})
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30))
def search(q, n=12, mime="bitmap"):
    r = api({"action": "query", "generator": "search", "gsrsearch": f"{q} filetype:{mime}", "gsrnamespace": 6, "gsrlimit": n,
             "prop": "imageinfo", "iiprop": "url|size|extmetadata|mime", "iiurlwidth": 1400})
    out = []
    for p in (r.get("query", {}).get("pages", {}) or {}).values():
        ii = p["imageinfo"][0]; m = ii.get("extmetadata", {})
        g = lambda k: re.sub("<[^>]+>", "", html.unescape(m.get(k, {}).get("value", "")))[:80]
        out.append({"title": p["title"], "w": ii["width"], "h": ii["height"], "mime": ii.get("mime"), "thumb": ii.get("thumburl"), "url": ii["url"],
                    "page": ii["descriptionurl"], "license": g("LicenseShortName"), "artist": g("Artist"), "desc": g("ImageDescription")[:60]})
    return out
if __name__ == "__main__":
    mime = sys.argv[2] if len(sys.argv) > 2 else "bitmap"
    for x in search(sys.argv[1], 12, mime):
        print(f'{x["w"]}x{x["h"]} | {x["license"]} | {x["artist"][:25]} | {x["title"][5:70]}')
