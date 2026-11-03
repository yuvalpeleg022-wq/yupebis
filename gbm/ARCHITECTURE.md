# Architecture

## Monorepo
```
apps/
  desktop/   Vite + React entry, Tauri 2 shell (src-tauri), Windows storage adapter (app-data folder)
  mobile/    Vite + React entry, Capacitor config + generated android/ project, Android storage adapter
packages/
  shared-types        domain types, seeded RNG, date/money utils, derived indexes
  player-system       ratings (position weights), generation, development, valuation, scouting, stats→ratings
  competition-system  rule sets, schedules, standings & tiebreakers, playoffs, qualification engine
  simulation          possession-based match engine, tactical fit
  finance-system      payroll, transactions, gate receipts, monthly finances, luxury tax
  transfer-system     signing validation, negotiations, contracts, releases (roster index)
  staff-system        coaches: roles, effects, willingness, negotiations, market, careers
  ai-manager          AI rotations, tactics, roster filling, renewals, budgets
  data-import         real-world datasets (Zod-validated), CSV/JSON import, data reports, regulation schema
  game-engine         career creation, calendar, matchday, season transition, manager career, regulations
  database            SQLite (sql.js/WASM) schema + migrations, save/load, save slots & recovery
  ui-components       design system, screens, Zustand store, platform adapter interface
```
`database` is the only package touching SQLite; `ui-components` is the only one touching React. The engine is pure TypeScript and runs identically on every platform and in Node tests — **no game logic is duplicated per platform**.

## Data flow
1. `createCareer` builds a `World` (normalized in-memory tables keyed by id) from the real-world dataset.
2. The UI calls engine functions through `store.act()` / `store.advance()`; mutations bump a version counter to re-render.
3. `advanceDay` runs one calendar day: registration deadlines, fixtures, recovery, staff market, weekly AI, monthly finances/development/board.
4. `SaveManager` serializes the World into normalized SQLite tables in one transaction and writes it through the platform `StorageAdapter`.

## Platform adapter (`ui-components/src/platform.ts`)
| Concern | Windows (Tauri) | Android (Capacitor) | Browser |
|---|---|---|---|
| Save files | `plugin-fs`, `$APPDATA/saves`, temp-file + rename | `Filesystem` (Directory.Data), temp + rename | IndexedDB |
| Lifecycle / autosave | window close → autosave | `pause` → autosave | visibility/beforeunload |
| Back navigation | — | hardware back button → in-app history | — |
| Cloud sync | **not implemented** (interface only, reports unavailable) | same | same |

## Determinism
All randomness goes through `Rng` (mulberry32). Each match is seeded from `hash(careerSeed, fixtureId)`; each day from `hash(seed, date)`. A saved career reloads and continues bit-identically (tested).

## Performance
Day-scoped derived indexes (`cachedIndex`/`invalidateIndexes`) for rosters, staff and contracts; play-by-play stored only for the user's games; per-game detail pruned after two seasons (season aggregates kept forever). Long simulations yield to the UI every two days. See TESTING.md for benchmarks.
