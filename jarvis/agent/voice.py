"""ElevenLabs speech out (TTS) and in (Scribe). The API key stays on this server; the browser never sees it."""
import json
import os
import urllib.error
import urllib.request
import uuid

API = os.environ.get("ELEVENLABS_API_BASE", "https://api.elevenlabs.io") + "/v1"
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")    # "George" — calm British male
TTS_MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_v3")                # v3 speaks Hebrew and 70+ languages
STT_MODEL = "scribe_v1"
MAX_CHARS = 600                                                             # cost guard per reply


class VoiceError(Exception):
    pass


def _key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise VoiceError("No ELEVENLABS_API_KEY in .env.")
    return key


def status():
    ok = bool(os.environ.get("ELEVENLABS_API_KEY"))
    return {"tts": ok, "stt": ok, "reason": "" if ok else "No ELEVENLABS_API_KEY in .env."}


def _post(url, body, headers):
    req = urllib.request.Request(url, data=body, method="POST", headers={"xi-api-key": _key(), **headers})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise VoiceError(f"ElevenLabs HTTP {e.code}: {detail}") from None
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise VoiceError(f"Can't reach ElevenLabs: {getattr(e, 'reason', e)}") from None


def speak(text):
    """Text -> mp3 bytes."""
    text = text.strip()[:MAX_CHARS]
    body = json.dumps({"text": text, "model_id": TTS_MODEL}).encode()
    return _post(f"{API}/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128", body,
                 {"Content-Type": "application/json", "Accept": "audio/mpeg"})


LANG3 = {"he": "heb", "en": "eng", "es": "spa", "ar": "ara", "ru": "rus", "fr": "fra", "de": "deu",
         "it": "ita", "pt": "por", "ja": "jpn", "zh": "zho"}


def listen(audio, content_type="audio/webm", lang="auto"):
    """Recorded audio bytes -> {"text", "language"}. Scribe detects the language when lang is auto."""
    boundary = "jarvis" + uuid.uuid4().hex
    ext = "ogg" if "ogg" in content_type else "mp4" if "mp4" in content_type else "webm"
    fields = [("model_id", STT_MODEL), ("tag_audio_events", "false")]
    if lang in LANG3:
        fields.append(("language_code", LANG3[lang]))
    parts = b"".join(
        f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields)
    parts += (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="turn.{ext}"\r\n'
              f"Content-Type: {content_type}\r\n\r\n").encode() + audio + f"\r\n--{boundary}--\r\n".encode()
    raw = _post(f"{API}/speech-to-text", parts, {"Content-Type": f"multipart/form-data; boundary={boundary}"})
    res = json.loads(raw)
    return {"text": (res.get("text") or "").strip(), "language": res.get("language_code", "")}
