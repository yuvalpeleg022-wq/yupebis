import { describe, expect, it } from 'vitest';
import { computeStandings, entryConflicts } from '@gbm/competition-system';
import { advance, createCareer, leagueStatus } from '../src';

describe('full season advancement', () => {
  it('plays a complete season with playoffs and rolls over', () => {
    const world = createCareer({ careerName: 'Season', managerName: 'Tester', userClubRef: 'el:rma', seed: 777, rosterPolicy: 'placeholders' });
    const t0 = Date.now();
    let guard = 0;
    while (world.meta.season === 2026 && guard++ < 2000) {
      const r = advance(world, 'month');
      expect(r.blocked).toEqual([]);
    }
    const ms = Date.now() - t0;
    console.log(`season simulated in ${ms} ms; matches: ${Object.keys(world.matches).length}`);
    expect(world.meta.season).toBe(2027);
    for (const l of Object.values(world.leagues).filter((x) => Object.values(world.matches).some((m) => m.leagueId === x.id && m.season === 2026))) {
      const summary = world.seasonSummaries.find((s) => s.leagueId === l.id && s.season === 2026);
      expect(summary?.championId).toBeTruthy();
      const st = computeStandings(world, l.id, 2026);
      const n = st.length;
      for (const row of st) expect(row.played).toBe(l.id === 'lg_nba' ? 87 : (n - 1) * l.roundRobins);
      if (l.active) expect(leagueStatus(world, l.id)).toBe('not_started');
    }
    expect(world.playerSeasons.length).toBeGreaterThan(500);
    expect(world.awards.some((a) => a.award === 'mvp')).toBe(true);
    // Automatic season transition: memberships for 2027 derived from 2026 results.
    const next = world.competitionEntries.filter((e) => e.season === 2027);
    expect(next.length).toBeGreaterThan(100);
    expect(entryConflicts(world, world.competitionEntries)).toEqual([]);
    expect(next.filter((e) => e.leagueId === 'lg_euroleague' && e.status === 'confirmed')).toHaveLength(20);
    expect(next.some((e) => e.leagueId === 'lg_eurocup')).toBe(true);
    expect(world.competitionEntries.filter((e) => e.season === 2026).every((e) => e.reason === 'founding')).toBe(true);
    expect(world.seasonStandings.some((s) => s.season === 2026)).toBe(true);
    for (const c of Object.values(world.clubs)) expect(new Set(c.competitionIds).size).toBe(c.competitionIds.length);
    // No club ever plays two games on the same day.
    const perDay = new Set<string>();
    for (const m of Object.values(world.matches)) for (const c of [m.homeId, m.awayId]) {
      const k = `${c}:${m.date}`;
      expect(perDay.has(k)).toBe(false);
      perDay.add(k);
    }
    // Real coaches remain the majority after a season of market activity.
    const employed = Object.values(world.staff).filter((s) => s.clubId && !s.retired);
    const real = employed.filter((s) => s.verification.status !== 'fictional');
    expect(real.length / employed.length).toBeGreaterThan(0.8);
    // No duplicate player ids and every contract points to a real player.
    for (const c of Object.values(world.contracts)) expect(world.players[c.playerId]).toBeTruthy();
  });
});

describe('playoff integrity', () => {
  it('crowns exactly one champion per competition, the winner of the final', () => {
    const world = createCareer({ careerName: 'PO', managerName: 'T', userClubRef: 'el:oly', seed: 31, rosterPolicy: 'placeholders' });
    while (world.meta.season === 2026) advance(world, 'month');
    for (const l of Object.values(world.leagues).filter((x) => Object.values(world.matches).some((m) => m.leagueId === x.id && m.season === 2026))) {
      const sums = world.seasonSummaries.filter((s) => s.season === 2026 && s.leagueId === l.id);
      expect(sums).toHaveLength(1);
      const series = Object.values(world.series).filter((s) => s.leagueId === l.id && s.season === 2026);
      const lastRound = Math.max(...series.map((s) => s.round));
      const final = series.filter((s) => s.round === lastRound);
      expect(final).toHaveLength(1);
      expect(sums[0].championId).toBe(final[0].winnerId);
      expect(series.every((s) => s.winnerId)).toBe(true);
    }
  });
});
