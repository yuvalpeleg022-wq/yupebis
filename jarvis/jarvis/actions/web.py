"""Browser actions: open URLs, Google, YouTube (straight to the first matching video)."""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
import webbrowser

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")
_DOMAIN = re.compile(r"^(?:https?://)?(?:www\.)?[\w\-]+(?:\.[\w\-]+)+(?:/\S*)?$")


def open_url(url: str) -> None:
    if not re.match(r"^[a-z][a-z0-9+.\-]*:", url):
        url = "https://" + url
    webbrowser.open(url, new=2)


def looks_like_domain(text: str) -> bool:
    return bool(_DOMAIN.match(text.strip())) and " " not in text.strip()


def google(query: str) -> str:
    url = "https://www.google.com/search?q=" + urllib.parse.quote_plus(query)
    open_url(url)
    return url


def first_result(query: str) -> str:
    """Jump straight to the top web result (DuckDuckGo's "\\" redirect)."""
    url = "https://duckduckgo.com/?q=" + urllib.parse.quote_plus("\\" + query)
    open_url(url)
    return url


def youtube_search_page(query: str) -> str:
    url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(query)
    open_url(url)
    return url


def find_youtube_video(query: str) -> tuple[str, str] | None:
    """Return (url, title) of the best matching video, or None."""
    try:
        import yt_dlp  # optional but most reliable
        opts = {"quiet": True, "skip_download": True, "extract_flat": True, "noplaylist": True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"ytsearch1:{query}", download=False)
        entries = info.get("entries") or []
        if entries:
            e = entries[0]
            vid = e.get("id")
            return f"https://www.youtube.com/watch?v={vid}", e.get("title") or query
    except Exception:
        pass
    try:
        req = urllib.request.Request(
            "https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(query),
            headers={"User-Agent": UA, "Accept-Language": "he,en;q=0.8"})
        html = urllib.request.urlopen(req, timeout=8).read().decode("utf-8", "replace")
        m = re.search(r"var ytInitialData = (\{.*?\});</script>", html)
        if m:
            data = json.loads(m.group(1))
            for vr in _walk(data, "videoRenderer"):
                vid = vr.get("videoId")
                if vid:
                    runs = (vr.get("title") or {}).get("runs") or [{}]
                    return f"https://www.youtube.com/watch?v={vid}", runs[0].get("text", query)
        m = re.search(r'"videoId":"([\w-]{11})"', html)
        if m:
            return f"https://www.youtube.com/watch?v={m.group(1)}", query
    except Exception:
        pass
    return None


def _walk(node, wanted):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == wanted and isinstance(v, dict):
                yield v
            else:
                yield from _walk(v, wanted)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v, wanted)


def play_youtube(query: str) -> str | None:
    """Open the first video for query. Returns its title, or None (search page opened instead)."""
    hit = find_youtube_video(query)
    if hit:
        open_url(hit[0] + "&autoplay=1")
        return hit[1]
    youtube_search_page(query)
    return None
