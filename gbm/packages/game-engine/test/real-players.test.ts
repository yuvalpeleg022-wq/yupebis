import { describe, expect, it } from 'vitest';
import { loadRealDataset2026, playerDataReport, type RealDataset, type RealPlayer } from '@gbm/data-import';
import { advance, createCareer } from '../src';

/**
 * TEST FIXTURE ONLY: players in the real-player *format* with invented names,
 * used to prove the pipeline. They are not shipped game data.
 */
function fixtureDataset(): RealDataset {
  const base = loadRealDataset2026();
  const sources = [...base.sources, { id: 's_test', title: 'Test fixture', url: 'https://example.org/test', publisher: 'test', accessedOn: '2026-11-03', method: 'fixture' }];
  const players: RealPlayer[] = [];
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
  // Full real-format rosters for every NBA club; nothing for other leagues.
  for (const club of base.clubs.filter((c) => c.league === 'nba')) {
    for (let i = 0; i < 14; i++) {
      const pos = positions[i % 5];
      players.push({
        ref: `test:${club.ref}:${i}`, firstName: `Test${i}`, lastName: club.shortName, nationality: 'USA',
        birthDate: `${1994 + (i % 10)}-03-0${1 + (i % 9)}`, heightCm: [188, 196, 201, 206, 211][i % 5], weightKg: 95 + (i % 5) * 6,
        position: pos, secondaryPosition: null, club: club.ref, jersey: i, status: 'reported', sources: ['s_test'],
        stats: { season: 2025, league: 'nba', gp: 70 - i, mpg: 34 - i * 2, ppg: 24 - i * 1.5, rpg: pos === 'C' ? 10 : 5, apg: pos === 'PG' ? 7 : 2.5, spg: 1.1, bpg: pos === 'C' ? 1.6 : 0.4, fgPct: 0.47, tpPct: pos === 'C' ? 0.25 : 0.37, ftPct: 0.8, tpaPg: pos === 'C' ? 0.5 : 5 },
        contract: null, notes: '',
      });
    }
  }
  return { ...base, sources, players };
}

describe('real players in the simulation', () => {
  it('real_only (default) never fills rosters with fictional players and reports the gap', () => {
    const w = createCareer({ careerName: 'R', managerName: 'R', seed: 1 });
    expect(w.meta.rosterPolicy).toBe('real_only');
    expect(Object.values(w.players).filter((p) => p.source === 'generated')).toHaveLength(0);
    const r = playerDataReport(w);
    expect(r.realPlayers).toBe(loadRealDataset2026().players.length);
    expect(r.clubsMissingRoster).toBe(r.clubs.length - r.clubsWithRealRoster);
    // Competitions with missing rosters are not simulated.
    for (const l of Object.values(w.leagues)) {
      const missing = Object.values(w.clubs).some((c) => c.leagueId === l.id && c.rosterSource === 'missing');
      if (missing) expect(l.active).toBe(false);
    }
  });

  it('uses the dataset players for rosters, lineups and box scores', () => {
    const ds = fixtureDataset();
    const w = createCareer({ careerName: 'Real', managerName: 'R', seed: 2, dataset: ds, userClubRef: 'nba:okc' });
    expect(w.leagues.lg_nba.active).toBe(true);
    expect(w.leagues.lg_euroleague.active).toBe(false);
    const okc = w.meta.userClubId;
    const roster = Object.values(w.players).filter((p) => p.clubId === okc);
    expect(roster).toHaveLength(14);
    expect(roster.every((p) => p.source === 'verified' && p.ratingBasis === 'statistics')).toBe(true);
    // Better real statistics produce better ratings.
    const star = roster.find((p) => p.sourceRef === 'test:nba:okc:0')!;
    const bench = roster.find((p) => p.sourceRef === 'test:nba:okc:10')!;
    expect(star.attributes.insideScoring).toBeGreaterThan(bench.attributes.insideScoring);
    advance(w, 'month');
    advance(w, 'month');
    const games = w.playerGameStats;
    expect(games.length).toBeGreaterThan(100);
    for (const g of games) expect(w.players[g.playerId].source).toBe('verified');
    // No fictional player entered the world at the start of the career.
    expect(Object.values(w.players).filter((p) => p.source === 'generated')).toHaveLength(0);
  });
});
