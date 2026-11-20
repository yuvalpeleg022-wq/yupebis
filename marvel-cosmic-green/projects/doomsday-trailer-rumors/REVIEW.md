# Transcript review — Avengers: Doomsday trailer rumors

Transcribed with Whisper **small** (the only Whisper model reachable from this
environment: Hugging Face downloads are blocked by its network policy), then cross-checked with a
second decoding pass that used a Marvel-terms prompt. Every caption below
appears in the video. Lines marked ⚠ were not clearly heard: please confirm or
correct them, and I'll re-render (captions live in `project.json`).

| Source time | Caption in video | Raw ASR output | Status |
|---|---|---|---|
| 0:05 | הטריילר הבא של הנוקמים: דומסדיי | הטריילה רבה שהנקומים דומסדי | ⚠ "הטריילה רבה" read as **הטריילר הבא** (the same pattern appears 5×) |
| 0:15 | ומה עדיין בגדר שמועה | ומה בידיים לגדר שמוע | ⚠ "עדיין" is a best guess |
| 0:20 | לפי המדליף קריפטיק HD קוואליטי | קריפטיק hd-quality | ⚠ leaker's name: spelled as heard |
| 0:31 | ולא בהודעה רשמית של מארוול | ולא בעודר / בהודע רשמית | ⚠ "בהודעה" is a best guess |
| 0:40 | עדיין אין אישור רשמי | עדיין אלה כחשיר / אלא כחשור | ⚠ read as "אין אישור" |
| 0:42 | אבל ייתכן שמארוול שומרת… | אבל לתארן / יתכן | ✓ second pass clearly "ייתכן" |
| 0:47 | מקור בשם ג'יימס מק | ג'יימס מק / ג'יימס מיק | ⚠ name: spelled as heard |
| 1:00–1:02 | *(no caption)* | "עד כאן הייתי מרוול גיקים" (hallucinated repeatedly) | ⚠ **short phrase I could not resolve**, so it's left uncaptioned. What do you say here? |
| 1:10 | עד כאן מארוול גיקים, תודה רבה | עד כאן מרוול גיקים | ⚠ channel name as heard |

Everything else matched between both passes, with ASR spelling fixed:
מרוול→מארוול, דיבוחים→דיווחים, הדיבוף→הדיבוב, הבן נאומים→הבינלאומיים,
דטפול→דדפול, ספאדאמנג'דומי מגוויר→ספיידרמן של טובי מגוויר,
תהפות→את ההפתעות, לשיבור→לשבור, המעריסים→המעריצים.

## Edit decisions

* Trimmed dead air: start (0:00–0:00.75), 1.3 s at 0:17, 1.2 s at 0:33, 1.5 s at 0:45 and the silent tail.
  Final length ≈ 67.9 s (source 74.1 s). No words were removed.
* Doctor Doom image → "הנוקמים: דומסדיי" (0:06), "אוונג'רס: דומסדיי כבר הושלם" (0:22),
  the big reveal on "עשוי לשבור את הרשת" (0:49–0:52) and "חשיפת דמויות" (0:56).
* Deadpool + Spider-Man (Tobey Maguire) → the line naming them (0:36–0:39), and again on
  "מפתיעות / חזרות" (0:57–1:00).
* Info cards: "שמועה • לא אושר רשמית" while you say it's only rumours (0:28),
  "הטריילר הבא 25.11" on the release date (1:02).
