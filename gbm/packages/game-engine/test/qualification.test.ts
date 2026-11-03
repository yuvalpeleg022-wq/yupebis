import { describe, expect, it } from 'vitest';
import type { CompetitionRegulation, World } from '@gbm/shared-types';
import { allocateNextSeason, entriesFor, entryConflicts, seasonStartDate, type LeagueResult } from '@gbm/competition-system';
import { addDays } from '@gbm/shared-types';
import { advanceDay, applySeasonEntries, createCareer } from '../src';

const ACB = 'lg_acb';
const GBL = 'lg_gbl';

function world(): World {
  return createCareer({ careerName: 'Q', managerName: 'Q', seed: 11, rosterPolicy: 'placeholders' });
}
const members = (w: World, leagueId: string) => w.competitionEntries.filter((e) => e.season === 2026 && e.leagueId === leagueId).map((e) => e.clubId).sort();

/** Final standings crafted for the test: clubs ordered by id. */
function results(w: World, overrides: Partial<Record<string, Partial<LeagueResult>>> = {}): Map<string, LeagueResult> {
  const m = new Map<string, LeagueResult>();
  for (const id of Object.keys(w.leagues)) {
    const order = members(w, id);
    m.set(id, { leagueId: id, order, champion: order[0] ?? null, runnerUp: order[1] ?? null, played: order.length > 0, ...overrides[id] });
  }
  return m;
}

function reg(p: Partial<CompetitionRegulation> & { leagueId: string }): CompetitionRegulation {
  return { fromSeason: 2027, size: 4, membership: 'qualification', promotion: null, relegation: null, qualification: [], qualifyingRound: null, priority: 5, exclusive: true, provenance: 'game_regulation', notes: 'test', ...p };
}

describe('competition qualification engine', () => {
  it('qualifies champions and runners-up, and allocates position places with cascade', () => {
    const w = world();
    const acb = members(w, ACB);
    w.regulations.push(
      reg({ leagueId: 'lg_bcl', priority: 1, size: 2, qualification: [{ id: 'lic', label: 'licence', source: { type: 'license', clubIds: [acb[1]], untilSeason: 2030 }, entry: 'direct', places: 1 }] }),
      reg({ leagueId: 'lg_eurocup', priority: 2, size: 4, qualification: [
        { id: 'champ', label: 'champion', source: { type: 'playoff_champion', leagueId: GBL }, entry: 'direct', places: 1 },
        { id: 'pos', label: 'ACB 1-3', source: { type: 'league_position', leagueId: ACB, from: 1, to: 3 }, entry: 'direct', places: 3 },
      ] }),
    );
    w.regulations = w.regulations.filter((r) => !(r.leagueId === 'lg_euroleague'));
    const { entries } = allocateNextSeason(w, 2026, results(w));
    const ec = entries.filter((e) => e.leagueId === 'lg_eurocup');
    const gblChampion = members(w, GBL)[0];
    expect(ec.find((e) => e.clubId === gblChampion)?.reason).toBe('champion');
    // acb[1] holds a licence for the higher exclusive competition, so the
    // places go to positions 1, 3 and 4 (cascade).
    expect(ec.filter((e) => e.reason === 'position').map((e) => e.clubId)).toEqual([acb[0], acb[2], acb[3]]);
    expect(entries.find((e) => e.leagueId === 'lg_bcl' && e.clubId === acb[1])?.reason).toBe('license');
    expect(entryConflicts(w, entries)).toEqual([]);
  });

  it('respects licence expiry and fills remaining places with wildcards', () => {
    const w = world();
    const acb = members(w, ACB);
    w.regulations = w.regulations.filter((r) => r.membership !== 'qualification');
    w.regulations.push(reg({ leagueId: 'lg_eurocup', size: 3, qualification: [
      { id: 'expired', label: 'expired', source: { type: 'license', clubIds: [acb[5]], untilSeason: 2026 }, entry: 'direct', places: 1 },
      { id: 'valid', label: 'valid', source: { type: 'license', clubIds: [acb[6]], untilSeason: 2027 }, entry: 'direct', places: 1 },
      { id: 'wc', label: 'wildcards', source: { type: 'wildcard', minReputation: 0, pool: 'domestic' }, entry: 'direct', places: 10 },
    ] }));
    const { entries } = allocateNextSeason(w, 2026, results(w));
    const ec = entries.filter((e) => e.leagueId === 'lg_eurocup');
    expect(ec).toHaveLength(3);
    expect(ec.some((e) => e.clubId === acb[5] && e.reason === 'license')).toBe(false);
    expect(ec.find((e) => e.clubId === acb[6])?.reason).toBe('license');
    const wildcards = ec.filter((e) => e.reason === 'wildcard').map((e) => w.clubs[e.clubId].reputation);
    expect(wildcards).toEqual([...wildcards].sort((a, b) => b - a));
  });

  it('promotes and relegates between divisions and leaves closed leagues alone', () => {
    const w = world();
    const acb = members(w, ACB);
    const gbl = members(w, GBL);
    w.regulations = w.regulations.filter((r) => r.leagueId !== ACB && r.leagueId !== GBL);
    w.regulations.push(
      reg({ leagueId: ACB, membership: 'open', exclusive: false, priority: 0, size: 18, relegation: { toLeagueId: GBL, places: 2 }, promotion: { fromLeagueId: GBL, places: 2 } }),
      reg({ leagueId: GBL, membership: 'open', exclusive: false, priority: 0, size: 7 }),
    );
    const { entries } = allocateNextSeason(w, 2026, results(w));
    const nextAcb = entries.filter((e) => e.leagueId === ACB).map((e) => e.clubId);
    const nextGbl = entries.filter((e) => e.leagueId === GBL).map((e) => e.clubId);
    const relegated = acb.slice(-2);
    const promoted = gbl.slice(0, 2);
    for (const c of relegated) {
      expect(nextGbl).toContain(c);
      expect(nextAcb).not.toContain(c);
    }
    for (const c of promoted) {
      expect(nextAcb).toContain(c);
      expect(nextGbl).not.toContain(c);
    }
    expect(nextAcb).toHaveLength(acb.length);
    // NBA is closed: identical membership, no promotion or relegation.
    expect(entries.filter((e) => e.leagueId === 'lg_nba').map((e) => e.clubId).sort()).toEqual(members(w, 'lg_nba'));
    expect(entryConflicts(w, entries)).toEqual([]);
  });

  it('runs qualifying rounds, then registers only the winners and generates schedules', () => {
    const w = world();
    const { entries } = allocateNextSeason(w, 2026, results(w));
    w.competitionEntries.push(...entries);
    expect(entryConflicts(w, w.competitionEntries)).toEqual([]);
    // Season transition (as on 1 July).
    w.meta.season = 2027;
    w.meta.currentDate = '2027-07-01';
    w.meta.phase = 'preseason';
    applySeasonEntries(w);
    const qualifiers = Object.values(w.fixtures).filter((f) => f.season === 2027 && f.stage === 'qualifier');
    expect(qualifiers.length).toBeGreaterThan(0);
    expect(qualifiers.every((f) => f.leagueId === 'lg_bcl')).toBe(true);
    while (w.meta.currentDate < '2027-10-08') advanceDay(w);
    for (const f of qualifiers) {
      const m = w.matches[f.matchId!];
      const winner = m.homeScore > m.awayScore ? f.homeId : f.awayId;
      const loser = winner === f.homeId ? f.awayId : f.homeId;
      expect(entriesFor(w, 2027, 'lg_bcl').find((e) => e.clubId === winner)?.status).toBe('confirmed');
      expect(entriesFor(w, 2027, 'lg_bcl').find((e) => e.clubId === loser)?.status).toBe('eliminated');
      expect(Object.values(w.fixtures).some((x) => x.season === 2027 && x.stage === 'regular' && x.leagueId === 'lg_bcl' && (x.homeId === loser || x.awayId === loser))).toBe(false);
    }
    // Every competition with confirmed entrants now has a regular-season schedule.
    for (const l of Object.values(w.leagues).filter((x) => x.active && addDays(seasonStartDate(x, 2027), -2) <= w.meta.currentDate)) {
      expect(Object.values(w.fixtures).some((f) => f.leagueId === l.id && f.season === 2027 && f.stage === 'regular')).toBe(true);
    }
    expect(w.leagues.lg_nba.active).toBe(true);
    // History is intact: 2026 entries untouched.
    expect(w.competitionEntries.filter((e) => e.season === 2026).every((e) => e.reason === 'founding')).toBe(true);
  });
});

describe('competition rules editor validation', () => {
  it('accepts valid future regulations and rejects invalid ones', async () => {
    const { validateRegulation } = await import('@gbm/data-import');
    const w = world();
    const base = w.regulations.find((r) => r.leagueId === 'lg_eurocup')!;
    expect(validateRegulation(w, { ...base, fromSeason: 2028 }).ok).toBe(true);
    const past = validateRegulation(w, { ...base, fromSeason: 2026 });
    expect(past.ok).toBe(false);
    const badLeague = validateRegulation(w, { ...base, qualification: [{ id: 'x', label: 'x', source: { type: 'league_position', leagueId: 'lg_nope', from: 1, to: 2 }, entry: 'direct', places: 1 }] });
    expect(badLeague.ok).toBe(false);
    const selfRelegation = validateRegulation(w, { ...w.regulations.find((r) => r.leagueId === 'lg_acb')!, relegation: { toLeagueId: 'lg_acb', places: 2 } });
    expect(selfRelegation.ok).toBe(false);
  });
});

describe('eligibility', () => {
  it('never registers a club in a competition outside its region', () => {
    const w = world();
    const { entries } = allocateNextSeason(w, 2026, results(w));
    const nba = new Set(Object.values(w.clubs).filter((c) => c.leagueId === 'lg_nba').map((c) => c.id));
    for (const e of entries) {
      if (nba.has(e.clubId)) expect(e.leagueId).toBe('lg_nba');
      if (e.leagueId !== 'lg_nba') expect(w.leagues[e.leagueId].region).toBe(w.leagues[w.clubs[e.clubId].leagueId].region);
    }
  });
});
