# Real-world dataset — 2026-27 season

Researched on 2026-11-03. See `DATA_SOURCES.md` and `COACH_DATA_REPORT.md` at the repository root of `gbm/`.

* `sources.json` — source registry (every fact references one or more source ids).
* `clubs.json` — real clubs (names, city, country, league). Finances, arena and reputation are **in-game values**.
* `coaches.json` — real coaches with evidence status. Only `reported`/`verified` coaches are assigned to clubs.
  Nationality, birth date and career history are left `null`/empty because they were not verified in this session.

Coach **game ratings** (skills, personality, philosophy) are provisional gameplay estimates, not real-world facts.
