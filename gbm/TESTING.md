# Testing

| Command | What |
|---|---|
| `pnpm typecheck` | TypeScript across all packages and apps |
| `pnpm test` | Vitest: 27 tests (simulation calibration & consistency, career creation, real coaches, real players, full season, playoffs, qualification engine, saves) |
| `pnpm test:e2e` | Playwright against the built desktop app: career creation → club → games → save → reload → continue; real-only mode; no horizontal overflow at 360/390/430/768/1280/1920 px on 13 screens; real-player profile markers (9 tests) |
| `pnpm report:coaches` | Regenerates COACH_DATA_REPORT.md and REAL_PLAYER_DATA_REPORT.md from the dataset |
| `SEASONS=N pnpm bench` | Multi-season benchmark (placeholder rosters) |

Key assertions: deterministic replays; box-score arithmetic (points = 2·FG2 + 3·FG3 + FT, minutes sum to 5× game length); NBA/FIBA statistical ranges; better teams win more; target minutes respected; every sourced coach assigned to the right club, no invented biographical facts; fictional coaches only when no real one is available; real-only mode adds no fictional players; real-format players drive rosters and every box-score row; one champion per competition equal to the final's winner; no club plays twice a day; champions/positions/cascade/licences/expiry/wildcards/promotion/relegation/qualifying rounds/regional eligibility/no conflicting registrations; historical standings use that season's members; save round-trip equality, FK/integrity checks, backup recovery.

## Benchmarks (this container, Node 22)
| Seasons | Result |
|---|---|
| 1 | ≈13 s simulation, 1.6 s save, 21 MB save (≈2,570 games across 9 competitions) |
| 2 | second season ≈21 s, 30 MB |
| 10 / 30 / 50 | **not yet run** — season time grows with retained history; optimisation (Web Worker, history pruning of play-by-play/finances, save size) is planned before claiming 30–50-season support |

## Not tested here
Native Windows installer and Android APK builds run in CI (no Android SDK / Windows host in this container); the Tauri Rust crate passes `cargo check` on Linux. Physical device testing has not been done.
