import type { Fixture, League, World } from '@gbm/shared-types';
import { addDays, nextId } from '@gbm/shared-types';

/**
 * Circle-method round robin. Returns rounds of [home, away] pairs.
 * With an odd number of clubs one club rests each round.
 */
export function roundRobinRounds(clubIds: string[]): [string, string][][] {
  const ids = [...clubIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push('__bye__');
  const n = ids.length;
  const rounds: [string, string][][] = [];
  const rotating = ids.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const order = [ids[0], ...rotating];
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = order[i];
      const b = order[n - 1 - i];
      if (a === '__bye__' || b === '__bye__') continue;
      // Alternate home advantage so each club gets a balanced home/away pattern.
      pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    rotating.unshift(rotating.pop()!);
  }
  return rounds;
}

export function seasonStartDate(league: League, season: number): string {
  return `${season}-${league.seasonStartMonthDay}`;
}

/** Generates the regular-season fixtures for a league and adds them to the world. */
export function generateLeagueSchedule(world: World, league: League, season: number): Fixture[] {
  const clubIds = competitionClubIds(world, league.id);
  const base = roundRobinRounds(clubIds);
  const fixtures: Fixture[] = [];
  let roundNo = 0;
  const start = seasonStartDate(league, season);
  const gaps = league.roundGaps?.length ? league.roundGaps : [league.daysBetweenRounds];
  let offset = 0;
  for (let cycle = 0; cycle < league.roundRobins; cycle++) {
    for (const round of base) {
      const date = addDays(start, offset);
      offset += gaps[roundNo % gaps.length];
      for (const [h, a] of round) {
        const [homeId, awayId] = cycle % 2 === 0 ? [h, a] : [a, h];
        const f: Fixture = {
          id: nextId(world, 'fx'),
          leagueId: league.id,
          season,
          date,
          homeId,
          awayId,
          stage: 'regular',
          round: roundNo + 1,
          seriesId: null,
          gameNumber: null,
          neutral: false,
          matchId: null,
        };
        world.fixtures[f.id] = f;
        fixtures.push(f);
      }
      roundNo++;
    }
  }
  return fixtures;
}

/** Clubs taking part in a competition (any club listing it in competitionIds). */
export function competitionClubIds(world: World, leagueId: string): string[] {
  return Object.values(world.clubs)
    .filter((c) => c.competitionIds.includes(leagueId))
    .map((c) => c.id)
    .sort();
}

/** First date on/after `from` when none of the clubs already has a fixture. */
export function nextFreeDate(world: World, clubIds: string[], from: string): string {
  const busy = new Set<string>();
  for (const f of Object.values(world.fixtures)) {
    if (f.date < from) continue;
    if (clubIds.includes(f.homeId) || clubIds.includes(f.awayId)) busy.add(f.date);
  }
  let d = from;
  while (busy.has(d)) d = addDays(d, 1);
  return d;
}

export function lastRegularSeasonDate(world: World, leagueId: string, season: number): string | null {
  let last: string | null = null;
  for (const f of Object.values(world.fixtures)) {
    if (f.leagueId === leagueId && f.season === season && f.stage === 'regular') {
      if (!last || f.date > last) last = f.date;
    }
  }
  return last;
}
