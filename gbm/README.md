# Global Basketball Manager

**One World. Every League. Your Legacy.** A cross-platform basketball management simulation (Windows via Tauri, Android via Capacitor) built on one shared TypeScript engine and one SQLite save format.

```bash
pnpm install
pnpm dev              # desktop UI in the browser (http://localhost:5173)
pnpm test             # unit/integration tests (Vitest)
pnpm test:e2e         # Playwright end-to-end tests (build first: pnpm --filter @gbm/desktop build)
pnpm report:coaches   # regenerates COACH_DATA_REPORT.md
SEASONS=10 pnpm bench # multi-season benchmark
```

Native builds: `apps/desktop` → `pnpm tauri build` (Windows installer), `apps/mobile` → `pnpm build && npx cap sync android` then Android Studio / `./gradlew assembleDebug`. CI (`.github/workflows/gbm-build.yml`) builds both.

Read next: [PROJECT_PLAN.md](PROJECT_PLAN.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [GAME_RULES.md](GAME_RULES.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [DATA_SOURCES.md](DATA_SOURCES.md) · [TESTING.md](TESTING.md) · [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) · [COACH_DATA_REPORT.md](COACH_DATA_REPORT.md)
