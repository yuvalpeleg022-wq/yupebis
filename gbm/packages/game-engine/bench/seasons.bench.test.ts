/**
 * Multi-season benchmark. Run with: SEASONS=10 pnpm bench
 * Uses labelled placeholder rosters (the built-in dataset has no verified players yet).
 */
import { it } from 'vitest';
import initSqlJs from 'sql.js';
import { saveWorld } from '@gbm/database';
import { advance, createCareer } from '../src';

const SEASONS = Number(process.env.SEASONS ?? 1);

it(`simulates ${SEASONS} season(s)`, async () => {
  const SQL = await initSqlJs();
  const world = createCareer({ careerName: 'Bench', managerName: 'Bench', userClubRef: 'nba:okc', seed: 2026, rosterPolicy: 'placeholders' });
  const start = world.meta.season;
  const t0 = performance.now();
  const lines: string[] = [];
  while (world.meta.season < start + SEASONS) {
    const s0 = performance.now();
    const season = world.meta.season;
    while (world.meta.season === season) advance(world, 'month');
    const db = new SQL.Database();
    const ts = performance.now();
    saveWorld(db, world);
    const bytes = db.export().length;
    db.close();
    lines.push(`season ${season}: ${((performance.now() - s0) / 1000).toFixed(1)}s sim, save ${((performance.now() - ts) / 1000).toFixed(2)}s, ${(bytes / 1e6).toFixed(1)} MB, players ${Object.keys(world.players).length}, matches kept ${Object.keys(world.matches).length}`);
    console.log(lines[lines.length - 1]);
  }
  console.log(`TOTAL ${SEASONS} seasons: ${((performance.now() - t0) / 1000).toFixed(1)}s`);
});
