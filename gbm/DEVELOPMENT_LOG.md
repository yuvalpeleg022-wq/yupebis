# Development Log

## 2026-11-03 — Session 1

### Completed
- Inspected the environment: Node 22, pnpm 10, Rust 1.97, Java 21, Chromium/Playwright; no Android SDK; WebKitGTK installed to compile-check Tauri. The repository contained unrelated sites, so GBM lives in `gbm/`.
- Monorepo, shared engine packages, SQLite persistence, React UI, Tauri and Capacitor shells, CI workflows.
- Possession-based match engine calibrated to NBA and FIBA ranges.
- Real-world 2026-27 dataset: 101 clubs, 112 coaches with sources; coach report.
- Coaching staff employment market; single-club career with job market; multi-competition seasons with clash-free scheduling.
- Real-player pipeline (schema, stats→ratings, real-only policy, reports, import at career start).
- Qualification engine with promotion/relegation, European places, licences, wildcards, qualifying rounds, regional eligibility, rules editor and dashboard.

### Tested
26 Vitest tests, 8 Playwright tests (all passing), `cargo check` of the Tauri crate.

### Bugs found and fixed through testing
- Premature champion when a sibling semifinal series did not exist yet (benchmark).
- Roster depletion after several seasons (benchmark) → youth intake, emergency signings, forfeit fallback.
- Historical standings listed next season's members → standings use that season's entries.
- NBA franchises received European wildcards (screenshot review) → regional eligibility rule.
- Regulation edits with the same start season did not override (test).

### Failed / blocked
- Direct fetching of authorized sources blocked by the session's network policy → no verified player rosters; coaches are `reported`, not `verified`.
- No Windows host or Android SDK locally → native packages only via CI.

### Next
1. Enable network access to authorized sources and import verified rosters (players.json) for NBA and EuroLeague first.
2. Run 10/30/50-season benchmarks; move simulation to a Web Worker; trim save size.
3. News Center (event-sourced articles, fictional outlets/journalists, rumours with credibility, follows, press conferences).
4. Trades and European transfer fees; NBA draft; domestic cups.
