"""Download each film's poster from Wikipedia into marvel/posters/<id>.jpg."""
import json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'posters')
UA = {'User-Agent': 'MarvelGikimFanSite/1.0 (https://github.com/yuvalpeleg022-wq/yupebis)'}

html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
films = re.findall(r"\{ id:'([^']+)'.*?wiki:'([^']+)'", html)
print(f'{len(films)} films')

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read()

def thumb(title):
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'redirects': 1, 'prop': 'pageimages',
                                'pilicense': 'any', 'pithumbsize': 500, 'titles': title})
    pages = json.loads(get('https://en.wikipedia.org/w/api.php?' + q)).get('query', {}).get('pages', {})
    for p in pages.values():
        if 'thumbnail' in p:
            return p['thumbnail']['source']
    d = json.loads(get('https://en.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(title.replace(' ', '_'))))
    return (d.get('thumbnail') or d.get('originalimage') or {}).get('source')

os.makedirs(OUT, exist_ok=True)
missing = []
for fid, title in films:
    path = os.path.join(OUT, fid + '.jpg')
    if os.path.exists(path) and '--force' not in sys.argv:
        continue
    try:
        src = thumb(title)
        if not src:
            raise ValueError('no image')
        data = get(src)
        if src.lower().endswith('.png'):
            from PIL import Image
            import io
            Image.open(io.BytesIO(data)).convert('RGB').save(path, 'JPEG', quality=88)
        else:
            open(path, 'wb').write(data)
        print('ok  ', fid, src)
    except Exception as e:
        missing.append(fid)
        print('miss', fid, title, e)
    time.sleep(0.3)
print('missing:', missing)
