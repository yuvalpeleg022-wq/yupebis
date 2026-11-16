import json, sys, time, urllib.error
sys.path.insert(0, "scripts")
from commons_search import search
queries = sys.argv[2:]; out = sys.argv[1]
res = {}
try: res = json.load(open(out))
except Exception: pass
for q in queries:
    if q in res: continue
    for attempt in range(5):
        try:
            res[q] = search(q, 14); break
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(10 * (attempt + 1)); continue
            raise
    json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
    print(f"== {q}: {len(res.get(q, []))}")
    for x in res.get(q, []): print(f'   {x["w"]}x{x["h"]} | {x["license"]} | {x["title"][5:80]}')
    time.sleep(4)
