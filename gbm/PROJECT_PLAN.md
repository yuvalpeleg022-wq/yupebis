# Project Plan & Checklist

Legend: [x] done and tested · [~] partial · [ ] not started

## Phase 1 — Foundation
- [x] pnpm monorepo, TypeScript, Vite, React, Tailwind, Zustand, Zod, Recharts
- [x] Tauri 2 desktop project (compiles; installer built in CI) · [x] Capacitor Android project (APK built in CI)
- [x] Database abstraction (sql.js + storage adapters) · [x] design system · [x] desktop sidebar & mobile bottom-nav shells

## Phase 2 — Data
- [x] Normalized schema + migrations · [x] coach/club real dataset with provenance · [x] player CSV/JSON import, duplicate detection, validation, logs
- [~] Real player rosters: 192 players imported (NBA 108, EuroLeague 83, ACB 1); 2 of 101 clubs complete; no birth dates/stats (sources blocked) → provisional ratings. Domestic, EuroCup, BCL rosters not yet researched
- [x] Search & filters (clubs, free agents, coaches, prospects)

## Phase 3 — Game engine
- [x] Position-weighted ratings · [x] possession simulation (NBA/FIBA/NCAA timing) · [x] box scores & play-by-play · [x] standings & tiebreakers · [x] schedules & playoffs · [x] tests

## Phase 4 — Management
- [x] Squad, lineup/rotation, tactics + fit · [x] contracts & negotiations · [x] free agency, releases · [x] finances · [x] training focus · [~] scouting (estimates; assignments planned)
- [ ] Trades, paid transfers, loans, buyouts, options, waivers, draft picks
- [x] Coaching staff market (roles, willingness, negotiations, promotion/demotion, termination)

## Phase 5 — AI
- [x] AI rotations, tactics, roster filling, renewals, budgets, personalities · [x] AI coach hiring/firing · [x] workload by match importance
- [ ] AI trades

## Phase 6 — Career
- [x] Season advancement, rollover, aging, development, retirement, rookies & youth intake, awards, history
- [x] Single-club career: club selection, job market, offers, resignation, dismissal
- [x] Qualification engine: European places, licences, wildcards, qualifying rounds, promotion/relegation, rules editor, dashboard
- [ ] NBA draft, domestic cups, All-Star events

## Phase 7 — Mobile
- [x] Responsive layouts (tested 360–1920 px), safe areas, back button, persistent saves · [ ] on-device testing

## Phase 8 — Polish
- [~] Performance (1–2 seasons measured; 10–50 not yet) · [x] crash recovery · [x] automated tests · [~] release builds (CI)
- [ ] News Center (journalists, rumours with credibility, follows, press conferences) — requested, not yet built
- [ ] Cloud sync (interface only; reports unavailable)
