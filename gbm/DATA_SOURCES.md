# Data Sources & Provenance

Three kinds of data, always distinguished in the game and the save file:
1. **Real-world** (`verified` / `reported`) — clubs, coaches, competition facts with cited sources.
2. **User-imported** (`imported`) — CSV/JSON supplied by the user.
3. **Generated** (`generated` / `fictional`) — game characters, always labelled FICTIONAL.

## What is in the built-in dataset (`packages/data-import/data/real-2026-27/`)
- `sources.json` — 52 sources, accessed 2026-11-03.
- `clubs.json` — 101 real clubs (NBA 30, EuroLeague 20, ACB 14 + EL clubs, BSL, GBL, IBPL, LBA, LNB, BBL partial lists).
- `coaches.json` — 112 real coaches: 75 head coaches at their real club, 18 assistants, 9 unattached, 10 pending verification. See COACH_DATA_REPORT.md.
- `players.json` — **192 real players** (74 `official`, 118 `cross_checked`) for NBA (108) and EuroLeague (83) clubs plus one ACB loan; 163 single-source candidates and 9 conflicts recorded in `player-research.json`. Birth dates, heights, nationalities and statistics were not available from any reachable source and are left empty. See REAL_PLAYER_DATA_REPORT.md.

## Method and limits
Direct page fetches (Wikipedia, NBA.com, EuroLeague.net, league sites) were **blocked by the development session's network policy**; research used web-search result summaries citing the listed sources, so records are `reported`, never `verified`. Roster searches returned partial lists; only players whose club assignment is official or agreed by ≥2 sources were imported, with every unknown fact left empty and ratings marked provisional. A GitHub-hosted dataset scraped from Basketball-Reference was reachable but unlicensed, so it was not used. Nationality, birth dates and career histories of coaches are left empty for the same reason. Coach game ratings are provisional estimates; player ratings for real players are derived only from real statistics.

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
