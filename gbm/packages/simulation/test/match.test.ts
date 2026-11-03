import { describe, expect, it } from 'vitest';
import { Rng, POSITIONS, type Position } from '@gbm/shared-types';
import { generateAttributes, overallForPosition } from '@gbm/player-system';
import { RULESETS } from '@gbm/competition-system';
import { DEFAULT_TACTICS, simulateMatch, type SimTeamInput } from '../src';

function team(seed: number, id: string, level: number, gameMinutes: number): SimTeamInput {
  const rng = new Rng(seed);
  const positions: Position[] = [...POSITIONS, ...POSITIONS, 'SG', 'SF'];
  const players = positions.map((pos, i) => {
    const ovr = level + (i < 5 ? 6 : i < 9 ? 0 : -6) + rng.int(-3, 3);
    const attributes = generateAttributes(rng, pos, ovr);
    return { id: `${id}-${i}`, name: `${id} ${i}`, position: pos, secondaryPosition: null, attributes, overall: overallForPosition(attributes, pos), energy: 100 };
  });
  const scale = gameMinutes / 48;
  const mins = [34, 33, 32, 31, 30, 22, 20, 18, 12, 8, 0, 0].map((m) => m * scale);
  return {
    clubId: id, name: id, players, starters: players.slice(0, 5).map((p) => p.id),
    targetMinutes: Object.fromEntries(players.map((p, i) => [p.id, mins[i]])),
    tactics: { ...DEFAULT_TACTICS }, coachRating: 60, defenseCoachRating: 60, gameManagement: 60, chemistry: 60,
  };
}

function runMany(n: number, rulesId: 'nba' | 'euroleague', level: number) {
  const rules = RULESETS[rulesId];
  const minutes = rules.periods * rules.periodMinutes;
  const totals = { pts: 0, fga: 0, fgm: 0, tpa: 0, tpm: 0, fta: 0, ftm: 0, tov: 0, oreb: 0, dreb: 0, ast: 0, poss: 0, ot: 0, homeWins: 0 };
  for (let i = 0; i < n; i++) {
    const r = simulateMatch(team(i * 7 + 1, 'H', level, minutes), team(i * 7 + 2, 'A', level, minutes), { rules, seed: 1000 + i, homeCourt: true, recordEvents: false });
    for (const s of [r.homeStats, r.awayStats]) {
      totals.pts += s.pts; totals.fga += s.fga; totals.fgm += s.fgm; totals.tpa += s.tpa; totals.tpm += s.tpm;
      totals.fta += s.fta; totals.ftm += s.ftm; totals.tov += s.tov; totals.oreb += s.oreb; totals.dreb += s.dreb;
      totals.ast += s.ast; totals.poss += s.possessions;
    }
    if (r.overtimes > 0) totals.ot++;
    if (r.homeScore > r.awayScore) totals.homeWins++;
  }
  const g = n * 2;
  return {
    ppg: totals.pts / g, fgPct: totals.fgm / totals.fga, tpPct: totals.tpm / totals.tpa, ftPct: totals.ftm / totals.fta,
    tpaRate: totals.tpa / totals.fga, tov: totals.tov / g, orebPct: totals.oreb / (totals.oreb + totals.dreb),
    ast: totals.ast / g, poss: totals.poss / g, fta: totals.fta / g, otRate: totals.ot / n, homeWinPct: totals.homeWins / n,
  };
}

describe('match simulation', () => {
  it('is deterministic for a given seed', () => {
    const rules = RULESETS.nba;
    const a = simulateMatch(team(1, 'H', 70, 48), team(2, 'A', 70, 48), { rules, seed: 42, homeCourt: true, recordEvents: true });
    const b = simulateMatch(team(1, 'H', 70, 48), team(2, 'A', 70, 48), { rules, seed: 42, homeCourt: true, recordEvents: true });
    expect(a.homeScore).toBe(b.homeScore);
    expect(a.awayScore).toBe(b.awayScore);
    expect(a.events.length).toBe(b.events.length);
    expect(a.playerStats).toEqual(b.playerStats);
  });

  it('box score is internally consistent', () => {
    const rules = RULESETS.nba;
    for (let i = 0; i < 30; i++) {
      const r = simulateMatch(team(i, 'H', 68, 48), team(i + 100, 'A', 68, 48), { rules, seed: i, homeCourt: true, recordEvents: false });
      expect(r.homeScore).not.toBe(r.awayScore);
      for (const side of ['H', 'A'] as const) {
        const ps = r.playerStats.filter((p) => p.clubId === side);
        const ts = side === 'H' ? r.homeStats : r.awayStats;
        const score = side === 'H' ? r.homeScore : r.awayScore;
        const sum = (k: keyof (typeof ps)[number]) => ps.reduce((s, p) => s + (p[k] as number), 0);
        expect(sum('pts')).toBe(score);
        expect(ts.pts).toBe(score);
        expect(sum('pts')).toBe(2 * (sum('fgm') - sum('tpm')) + 3 * sum('tpm') + sum('ftm'));
        expect(sum('fga')).toBe(ts.fga);
        expect(sum('ast')).toBeLessThanOrEqual(sum('fgm'));
        const quarters = side === 'H' ? r.homeQuarters : r.awayQuarters;
        expect(quarters.reduce((a, b) => a + b, 0)).toBe(score);
        // Every player's minutes add up to the full game (5 players on court).
        const totalSec = sum('seconds');
        const gameSec = (rules.periods * rules.periodMinutes + r.overtimes * rules.overtimeMinutes) * 60;
        expect(Math.abs(totalSec - gameSec * 5)).toBeLessThan(15);
        for (const p of ps) expect(p.pf).toBeLessThanOrEqual(rules.personalFoulLimit);
      }
    }
  });

  it('produces NBA-like statistical distributions', () => {
    const s = runMany(300, 'nba', 70);
    console.log('NBA', s);
    expect(s.ppg).toBeGreaterThan(100);
    expect(s.ppg).toBeLessThan(124);
    expect(s.fgPct).toBeGreaterThan(0.43);
    expect(s.fgPct).toBeLessThan(0.51);
    expect(s.tpPct).toBeGreaterThan(0.32);
    expect(s.tpPct).toBeLessThan(0.4);
    expect(s.ftPct).toBeGreaterThan(0.7);
    expect(s.ftPct).toBeLessThan(0.86);
    expect(s.poss).toBeGreaterThan(92);
    expect(s.poss).toBeLessThan(106);
    expect(s.tov).toBeGreaterThan(10);
    expect(s.tov).toBeLessThan(17);
    expect(s.orebPct).toBeGreaterThan(0.2);
    expect(s.orebPct).toBeLessThan(0.32);
    expect(s.homeWinPct).toBeGreaterThan(0.5);
    expect(s.homeWinPct).toBeLessThan(0.68);
  });

  it('produces FIBA-like distributions with 40-minute games', () => {
    const s = runMany(300, 'euroleague', 66);
    console.log('FIBA', s);
    expect(s.ppg).toBeGreaterThan(72);
    expect(s.ppg).toBeLessThan(92);
    expect(s.poss).toBeGreaterThan(66);
    expect(s.poss).toBeLessThan(80);
  });

  it('better teams win more often', () => {
    const rules = RULESETS.nba;
    let wins = 0;
    const n = 200;
    for (let i = 0; i < n; i++) {
      const r = simulateMatch(team(i, 'H', 76, 48), team(i + 999, 'A', 66, 48), { rules, seed: i, homeCourt: false, recordEvents: false });
      if (r.homeScore > r.awayScore) wins++;
    }
    expect(wins / n).toBeGreaterThan(0.75);
    expect(wins / n).toBeLessThan(0.99);
  });

  it('respects target minutes approximately', () => {
    const rules = RULESETS.nba;
    const mins: Record<string, number[]> = {};
    for (let i = 0; i < 60; i++) {
      const r = simulateMatch(team(5, 'H', 70, 48), team(6, 'A', 70, 48), { rules, seed: i, homeCourt: true, recordEvents: false, injuryRate: 0 });
      for (const p of r.playerStats) (mins[p.playerId] ??= []).push(p.seconds / 60);
    }
    const avgMin = (id: string) => (mins[id] ?? [0]).reduce((a, b) => a + b, 0) / 60;
    expect(avgMin('H-0')).toBeGreaterThan(26);
    expect(avgMin('H-0')).toBeLessThan(41);
    expect(avgMin('H-9')).toBeLessThan(16);
    expect(avgMin('H-10')).toBeLessThan(4);
  });
});
