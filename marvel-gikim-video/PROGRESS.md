# PROGRESS – marvel-gikim-video (course trailer)   (updated 2026-11-16)
Phase: final render (4 versions)
User feedback: "סגנון עריכה שונה – יותר ריאליסטי, יותר טרנזישנים, 4 גרסאות"; earlier: "זה כמובן על מארוול".
Engine: src/real.html + src/real.js (?v=cinema|hype|doc|green) — canvas compositor, full-frame photos/footage,
  2.5D parallax from rembg cutouts (assets/images/cut), 15 transition types, per-version grade/camera/pacing/typography.
  Old HUD-style engine (src/index.html + src/app.js) kept for reference.
Versions → renders/final/marvel-gikim_<v>.mp4
- cinema: teal-orange grade, letterbox, dissolves/light leaks/film burns, music Mixkit #676 (beat-aligned, 8-beat edit to final hit)
- hype: punchy grade, cuts ~0.9 s, whip/zoom/spin/glitch, word-by-word captions, music #680
- doc: natural warm grade, slow pans, push/wipe/iris/dissolve, lower-third subtitles, music #79
- green: brand green duotone, ink reveals/glitch/green leaks, metallic titles, music #140
Pipeline: scripts/build_all.sh → render (EDL_OUT) → scripts/mix_v.py (VO + ducked music + CC0 SFX on the version's own transitions) → scripts/finalize.py (encode, loudness −14 LUFS / ≤−1.5 dBTP measured on MP4)
Open questions for user: "תהיו איתנים" vs "תהיו איתנו"; which version to continue with.
Key decisions: Marvel-only imagery; only freely licensed photos (CC BY / CC BY-SA / CC0) + NASA footage; credits in renders/final/CREDITS.txt.
