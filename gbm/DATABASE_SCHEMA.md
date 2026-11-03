# Database Schema

SQLite via sql.js (WASM), identical on Windows, Android and browser. Migrations in `packages/database/src/schema.ts` (tracked with `PRAGMA user_version`, each applied in a transaction). Saves are written in one transaction; foreign-key and integrity checks run on load (`integrityCheck`).

| Migration | Contents |
|---|---|
| 1 | Initial schema (below) |
| 2 | `players.rating_basis`, `clubs.roster_source`, `game_saves.roster_policy` |
| 3 | `competition_regulations`, `competition_entries` |

## Tables
- **Career**: `game_saves` (one row: career meta, user club, date, phase, seed, save version, board confidence, manager reputation/attributes, policies), `game_settings`, `id_counters`.
- **Provenance**: `data_sources` (id, title, url, publisher, accessed_on, method), `data_issues` (entity, field, severity, message, candidates, status).
- **Competitions**: `competition_rules` (rule sets), `leagues` (format JSON, active), `competitions` (club ↔ league per current season, primary flag), `competition_regulations` (league, from_season, provenance, definition JSON), `competition_entries` (season, league, club, reason, rule, status, detail — full membership history), `fixtures`, `matches`, `match_events` (user games only), `match_player_stats` (PK match+player), `playoff_series`, `standings` (season snapshots), `seasons` (champion/runner-up/regular-season winner), `awards`.
- **Clubs**: `clubs` (incl. tactics JSON, verification JSON, roster source), `training_programs`, `club_rosters` (rotation: starter slot, target minutes), `club_finances` (every transaction).
- **Players**: `players`, `player_attributes` (PK player+attribute, CHECK 1..100), `player_contracts` (CHECK end ≥ start, salary ≥ 0), `player_injuries`, `player_seasons` (aggregates per season/club/stage, kept forever), `player_career_history`, `draft_classes`, `transfers`, `transfer_negotiations`, `scouting_reports`.
- **Staff**: `club_staff` (attributes/verification JSON, market exclusion), `staff_career_history`, `staff_negotiations`.
- **Manager**: `manager_history`, `job_offers`, `news_events`.

Indexes on players(club), players(name), contracts(club, active), contracts(player), fixtures(date), fixtures(league, season), matches(season, league), match_player_stats(player), staff(club), finances(club, season), news(date), entries(club, season).

## Save slots & recovery
`<career>.gbm` (manual), `<career>.auto.gbm` (every 7 game days and on suspend/close), `<career>.bak.gbm` (previous manual save). Native adapters write to a temp file then rename. Loading picks the newest valid slot and falls back to the backup if damaged (tested by corrupting the main save).
