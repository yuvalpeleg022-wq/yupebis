# Data Sources & Provenance

Three kinds of data, always distinguished in the game and the save file:
1. **Real-world** (`verified` / `reported`) — clubs, coaches, competition facts with cited sources.
2. **User-imported** (`imported`) — CSV/JSON supplied by the user.
3. **Generated** (`generated` / `fictional`) — game characters, always labelled FICTIONAL.

## What is in the built-in dataset (`packages/data-import/data/real-2026-27/`)
- `sources.json` — 52 sources, accessed 2026-11-03.
- `clubs.json` — 101 real clubs (NBA 30, EuroLeague 20, ACB 14 + EL clubs, BSL, GBL, IBPL, LBA, LNB, BBL partial lists).
- `coaches.json` — 112 real coaches: 75 head coaches at their real club, 18 assistants, 9 unattached, 10 pending verification. See COACH_DATA_REPORT.md.
- `players.json` — **empty**. No verified 2026-27 player rosters could be compiled in this session (see below).

## Method and limits
Direct page fetches (Wikipedia, NBA.com, EuroLeague.net, league sites) were **blocked by the development session's network policy**; research used web-search result summaries citing the listed sources, so records are `reported`, never `verified`. Roster searches returned conflicting or incomplete lists (and in one case a football squad), with no birth dates or statistics — not usable without inventing data, so none were added. Nationality, birth dates and career histories of coaches are left empty for the same reason. Coach game ratings are provisional estimates; player ratings for real players are derived only from real statistics.

## Real player dataset format (import at career creation)
```json
{ "sources": [{ "id": "s1", "title": "…", "url": "https://…", "publisher": "…", "accessedOn": "YYYY-MM-DD", "method": "…" }],
  "players": [{ "ref": "player:unique-id", "firstName": "…", "lastName": "…", "nationality": "USA", "birthDate": "YYYY-MM-DD",
    "heightCm": 201, "weightKg": 100, "position": "SF", "secondaryPosition": null, "club": "nba:bos", "jersey": 0,
    "status": "verified", "sources": ["s1"],
    "stats": { "season": 2025, "league": "nba", "gp": 70, "mpg": 34, "ppg": 26, "rpg": 8, "apg": 5, "spg": 1, "bpg": 0.6,
               "fgPct": 0.46, "tpPct": 0.36, "ftPct": 0.83, "tpaPg": 8, "ftaPg": 6 },
    "contract": null, "notes": "" }] }
```
Club refs are those in `clubs.json`. Players without `stats` get a league baseline rating (flagged). Every record is validated (Zod), duplicate refs and unknown clubs/sources are rejected.

## Authorized sources to enable for a full import
Wikipedia (CC BY-SA) team season pages and rosters; official league/club sites where their terms permit. Allow these domains in the cloud environment's network settings to let a future session fetch and verify primary pages. Do not scrape sites whose terms forbid it.

## Images, logos, branding
None are used. Club colours in the UI are neutral accents, not team branding.
