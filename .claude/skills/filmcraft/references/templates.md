# Deliverable Templates

Fill-in industry-standard documents. Use these to *produce* the artifact, not just describe it. Each is copy-pasteable and follows real professional format.

---

## 1. Logline

One sentence. Formula: **When [inciting incident], a [flawed protagonist] must [goal/action] before [stakes/ticking clock] — or [cost of failure].**

- Name the protagonist by defining trait, not by name ("a washed-up boxer," not "Rocky").
- Include the irony/hook — the thing that makes this story only-this-story.
- No character names, no subplot, no ending. One sentence, present tense.

> *A timid hobbit must carry a corrupting ring into the heart of enemy territory to destroy it, before its dark lord reclaims it and enslaves the world.*

Test: if the logline could describe ten other films, it's too generic. Add the specific.

---

## 2. Treatment (prose synopsis)

Present-tense prose that tells the whole story, ending included. Lengths: **one-pager** (~1 page, for a first look), **short treatment** (2–5 pp), **full treatment** (10–30 pp, scene-by-scene). Structure:

```
TITLE
Logline (1 sentence)

[Opening] — who, where, the world, the flaw. Establish normal.
[Act 1 turn] — the inciting incident and what the hero decides.
[Act 2] — escalating obstacles, the midpoint reversal, the relationships,
          the low point where the old self fails.
[Act 3] — the climax that tests the theme; how it resolves; the final image.

Theme — one line: what the story argues about being human.
Tone/comps — "[Film A] meets [Film B]"; the audience and format.
```

Rules: dramatize, don't list ("she realizes he lied" not "the theme of trust develops"). Present tense. Name only principal characters. The one-pager sells; the full treatment de-risks.

---

## 3. Screenplay format (US standard / master-scene)

Courier 12pt, 1 page ≈ 1 minute. The industry-standard *application* is **Final Draft** (`.fdx` is what agencies and production offices expect); **Fountain** (below) is the plain-text alternative. Elements:

```
INT. DINER — NIGHT                          ← Scene heading (slugline): INT/EXT. LOCATION — TIME

Rain sheets the window. MARIA (40s, exhausted, still     ← Action: present tense, only what's
in her nurse's scrubs) slides into a booth. She doesn't     seen and heard. Introduce a character
look up when the door chimes.                               in CAPS on first appearance.

                    MARIA                     ← Character cue (centered, caps)
          (not looking up)                    ← Parenthetical: sparing, only if not obvious
     You're late. You're always late.         ← Dialogue

                    DANIEL
     Traffic.

Maria finally looks up. It isn't Daniel.      ← Action beat between lines = the turn

                    MARIA
     ...Who are you?

                                        CUT TO:   ← Transition (right-aligned; use sparingly)
```

- **Slugline** every new location/time. **INT./EXT.**, LOCATION, **DAY/NIGHT**.
- Action in **present tense**, lean. Never write what can't be filmed ("she remembers her mother" — unfilmable; show it).
- **CAPS** a character on first entry; optionally CAPS key SFX/props.
- Dialogue centered-ish; parentheticals rare and short.
- **(V.O.)** = voice-over (narration, phone). **(O.S.)** = off-screen (in the scene, out of frame). **(CONT'D)** when a character continues past an action beat.
- Cut transitions sparingly — the cut is implied by every new slugline.

### Fountain (plain-text screenplay markup)
Write screenplays in any editor; Fountain renders to proper format.
```
INT. DINER - NIGHT

Rain sheets the window. MARIA slides into a booth.

MARIA
(not looking up)
You're late.

DANIEL
Traffic.

CUT TO:
```
Rules: scene headings start with INT/EXT (or force with a leading `.`). A line in ALL CAPS followed by dialogue = character cue. `(parenthetical)` on its own line. `> CENTERED <` for centered text, `> CUT TO:` forces a transition. `=` starts a synopsis, `#` a section header (outline only, not printed).

---

## 4. Beat sheet (Save the Cat, blank + percentages)

Fill each beat with one to three sentences. Page numbers below are Snyder's own canonical positions on the **110-page** model (the `%` are those pages as a fraction of 110, so they scale to any length). Treat them as targets, not tripwires — the beats are diagnostics, not a metronome.

```
1.  Opening Image (p.1, ~1%)         — the "before" snapshot; tone and flaw.
2.  Theme Stated (p.5, ~5%)          — someone voices the lesson; hero ignores it.
3.  Set-Up (p.1–10, ~1–10%)          — the world, the flaw, what's missing.
4.  Catalyst (p.12, ~11%)            — the inciting incident; life changes.
5.  Debate (p.12–25, ~11–23%)        — "should I?" resistance.
6.  Break into Two (p.25, ~23%)      — hero chooses the new world. Act 2.
7.  B Story (p.30, ~27%)             — the relationship that carries the theme.
8.  Fun and Games (p.30–55, ~27–50%) — the "promise of the premise"; the trailer moments.
9.  Midpoint (p.55, ~50%)            — false victory OR false defeat; stakes raised.
10. Bad Guys Close In (p.55–75, ~50–68%) — external and internal pressure mount.
11. All Is Lost (p.75, ~68%)         — the low point; a "whiff of death."
12. Dark Night of the Soul (p.75–85, ~68–77%) — the hero at rock bottom.
13. Break into Three (p.85, ~77%)    — the insight; the fix. Act 3.
14. Finale (p.85–110, ~77–100%)      — climax; theme proven; the world changed.
15. Final Image (p.110, ~100%)       — the "after"; mirror of the opening.
```

Also usable: **Dan Harmon Story Circle** (8 steps: You / Need / Go / Search / Find / Take / Return / Change) for tighter or serialized work; **8-sequence** method for taming Act 2. See `references/craft-principles.md`.

---

## 5. Shot list

One row per shot. The bridge from script to schedule.

| # | Scene | Shot size | Angle | Movement | Lens | Subject / action | Notes |
|---|-------|-----------|-------|----------|------|------------------|-------|
| 1 | 14 | WS | Eye | Static | 24mm | Maria enters, sits | Establish geography |
| 2 | 14 | MCU | Eye | Slow push | 50mm | Maria, "You're late" | Push lands on reveal |
| 3 | 14 | CU | OTS | Static | 85mm | Not-Daniel's face | Hold — the turn |

Columns pros use: shot #, scene, **size** (EWS/WS/MS/MCU/CU/ECU), **angle** (eye/high/low/OTS/POV/Dutch), **movement** (static/pan/tilt/dolly/track/crane/Steadicam/handheld/zoom), **lens** (mm), subject/action, and notes (motivation, VFX, sound, continuity). Every shot should have a *reason* in the Notes.

---

## 6. Script breakdown sheet

Per scene, list every element to shoot it. Foundation of schedule and budget.

```
SCENE #: 14              PAGE: 12          INT/EXT: INT      DAY/NIGHT: NIGHT
LOCATION: Roadside diner
SYNOPSIS: Maria waits for Daniel; a stranger arrives instead.
─────────────────────────────────────────────────────────────
CAST:              Maria, Stranger
BACKGROUND/EXTRAS: Diner cook, 2 patrons
PROPS:             Coffee cups, Maria's phone, menu
WARDROBE:          Maria — nurse scrubs (continuity: wet from rain)
MAKEUP/HAIR:       Maria — tired, rain-damp
VEHICLES:          Stranger's sedan (EXT, parked)
SFX/VFX:           Rain on window (rain rig)
STUNTS:            —
SOUND:             Rain, diner ambience, door chime
SPECIAL EQUIP:     Rain bar, 50mm + 85mm
NOTES:             Night exterior visible through window — light for it
```

Traditional color-coding (elements by category) feeds a stripboard. One breakdown per scene; nothing downstream is trustworthy without it.

---

## 7. Call sheet (daily)

What every cast/crew member needs for one shoot day.

```
PRODUCTION: [Title]              DAY: 3 of 18          DATE: [absolute]
CALL: 07:00     SHOOT CALL: 08:30     EST. WRAP: 19:00
SUNRISE: 06:12   SUNSET: 19:48   WEATHER: 14°C, rain a.m.
LOCATION: Roadside Diner, [address]   NEAREST HOSPITAL: [name, address, phone]
─────────────────────────────────────────────────────────────
SCENES TODAY:
 Sc 14  INT DINER NIGHT   pg 1/8   Maria meets the stranger   Cast: 1,7
 Sc 15  EXT LOT  NIGHT    pg 2/8   Stranger arrives           Cast: 7
─────────────────────────────────────────────────────────────
CAST:        # | Actor | Role | Pickup | H/MU | Set | Notes
             1 | ...   | Maria| 06:30  | 07:00| 08:30
─────────────────────────────────────────────────────────────
CREW CALLS:  Camera 07:00 · G&E 06:30 · Sound 07:30 · AD 06:45 ...
ADVANCE SCHEDULE (tomorrow): Sc 22, 23 — EXT ROAD DAY
NOTES: Meal at 13:00 (6-hr). Rain cover on standby.
```

Non-negotiable fields: date/day, calls, location + **nearest hospital**, scenes with page-eighths, cast with H/MU and set times, crew calls, meal time (late meal = penalty), weather/sun, tomorrow's advance.

---

## 8. Coverage report (script evaluation)

How a reader grades a script. See `references/review-and-formats.md` for the full method.

```
TITLE:          [x]         WRITER: [x]        GENRE: [x]     PAGES: [x]
LOGLINE:        [one sentence]
─────────────────────────────────────────────────────────────
SYNOPSIS:       [½–2 pp neutral beat-by-beat, INCLUDING the ending]
─────────────────────────────────────────────────────────────
COMMENTS:       [1–3 pp: what works, what's broken, is it fixable,
                should we want it — big-picture before line-level]
─────────────────────────────────────────────────────────────
                     EXCELLENT | GOOD | FAIR | POOR
Premise / concept        [ ]
Structure / plot         [ ]
Characterization         [ ]
Dialogue                 [ ]
Marketability            [ ]
─────────────────────────────────────────────────────────────
SCRIPT:  PASS | CONSIDER | RECOMMEND
WRITER:  PASS | CONSIDER | RECOMMEND
```

Rules: critique the script that exists (don't fill in the holes); evaluate against what a producer would make, not personal taste; every comment names *where*, *what's broken*, and *why it breaks the experience*.

---

## 9. Pitch deck / one-pager

For selling a project. Sequence:

```
1. TITLE + logline + comps ("[Film A] meets [Film B]") + format/length
2. TONE — a mood board / one paragraph on the feel; the genre promise
3. STORY — the treatment in one page (with the ending — buyers need it)
4. CHARACTERS — the 3–5 principals, one line of want + flaw each
5. THEME — what it's really about
6. WHY NOW / WHY YOU — the market case and the filmmaker's connection
7. PACKAGE — attached talent, budget tier, comparable performance, ask
```

The one-pager is items 1–5 compressed. Lead with the hook; a buyer decides in the first ten seconds.
