# PROGRESS – marvel-gikim-video (course trailer)
Phase: final render
Format: 9:16 1080x1920, 30 fps, ~79.5 s. VO = user's recording (source/voice.m4a), lead silence trimmed 2.6 s.
Done:
- Transcript (ivrit-ai whisper-large-v3-turbo) → src/captions.js via plan/caption_phrases.txt (fixes: מארוול, הרשמה, שלקחתי)
- 13 scenes in src/app.js (deterministic renderFrame(t)); src/render.js renders ranges; scripts/preview.mjs contact sheets
- Assets: Commons photos (cache/cands, cache/heroes → assets/images), NASA footage frame sequences (assets/footage/*)
- Mix: scripts/mix.py → audio/mix_raw.wav (VO + Mixkit #676 ducked + bundled CC0 SFX), music start 13.075 s
Next step: final render → mux → loudness measured on MP4 → QA → credits
Open questions for user: "תהיו איתנים" vs "תהיו איתנו" (ASR heard איתנים); music choice; vertical-only OK?
Key decisions: Marvel-only imagery (user: "זה כמובן על מארוול"); only freely licensed photos (CC BY / CC BY-SA / CC0 / NASA PD).
