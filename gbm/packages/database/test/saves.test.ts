import { describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { advance, createCareer } from '@gbm/game-engine';
import { MemoryStorage, SaveManager, fileFor, integrityCheck, saveWorld } from '../src';

describe('save games', async () => {
  const SQL = await initSqlJs();

  it('round-trips a career through SQLite without losing data', async () => {
    const world = createCareer({ careerName: 'Persist', managerName: 'Tester', userClubRef: 'el:pao', seed: 99 });
    advance(world, 'month');
    advance(world, 'month');
    const storage = new MemoryStorage();
    const saves = new SaveManager(SQL, storage);
    await saves.save(world);
    // "Close the application": throw away the in-memory world, reopen from storage.
    const reopened = (await new SaveManager(SQL, storage).load(world.meta.careerId)).world;
    expect(JSON.parse(JSON.stringify(reopened))).toEqual(JSON.parse(JSON.stringify(world)));
    // Continue playing after reload; both copies stay in sync (deterministic).
    advance(world, 'week');
    advance(reopened, 'week');
    expect(Object.keys(reopened.matches).length).toBe(Object.keys(world.matches).length);
    const lastA = Object.values(world.matches).sort((a, b) => a.id.localeCompare(b.id)).at(-1)!;
    const lastB = reopened.matches[lastA.id];
    expect(lastB.homeScore).toBe(lastA.homeScore);
  });

  it('passes SQLite integrity and foreign-key checks', () => {
    const world = createCareer({ careerName: 'FK', managerName: 'T', userClubRef: 'nba:mia', seed: 3 });
    advance(world, 'month');
    const db = new SQL.Database();
    saveWorld(db, world);
    const check = integrityCheck(db);
    expect(check.problems).toEqual([]);
    // Normalized: no career stored as one blob, attributes in their own table.
    const attrRows = db.exec('SELECT COUNT(*) FROM player_attributes')[0].values[0][0] as number;
    expect(attrRows).toBe(Object.keys(world.players).length * 30);
    db.close();
  });

  it('keeps a backup and recovers from a corrupted main save', async () => {
    const world = createCareer({ careerName: 'Crash', managerName: 'T', userClubRef: 'nba:okc', seed: 4 });
    const storage = new MemoryStorage();
    const saves = new SaveManager(SQL, storage);
    await saves.save(world);
    advance(world, 'week');
    await saves.save(world);
    expect(storage.files.has(fileFor(world.meta.careerId, 'backup'))).toBe(true);
    storage.files.set(fileFor(world.meta.careerId, 'main'), new Uint8Array([1, 2, 3, 4]));
    const r = await saves.load(world.meta.careerId);
    expect(r.slot).toBe('backup');
    expect(r.recovered).toBe(true);
    const list = await saves.listCareers();
    expect(list.map((x) => x.careerId)).toContain(world.meta.careerId);
  });
});
