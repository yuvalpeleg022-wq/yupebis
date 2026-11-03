import type { Fixture, League, PlayoffSeries, World } from '@gbm/shared-types';
import { addDays, nextId } from '@gbm/shared-types';
import { computeStandings } from './standings';

/** Bracket order for a field of n seeds so that 1 and 2 can only meet in the final. */
export function bracketSeedOrder(n: number): number[] {
  let order = [1, 2];
  while (order.length < n) {
    const size = order.length * 2;
    const next: number[] = [];
    for (const s of order) next.push(s, size + 1 - s);
    order = next;
  }
  return order;
}

export function seriesForLeague(world: World, leagueId: string, season: number): PlayoffSeries[] {
  return Object.values(world.series)
    .filter((s) => s.leagueId === leagueId && s.season === season)
    .sort((a, b) => a.round - b.round || a.slot - b.slot);
}

/** Host for a given game number of a series (2-2-1-1-1 / 2-2-1 / 2-1-1 patterns). */
export function seriesHomeIsHighSeed(bestOf: number, gameNumber: number): boolean {
  if (bestOf === 7) return [1, 2, 5, 7].includes(gameNumber);
  if (bestOf === 5) return [1, 2, 5].includes(gameNumber);
  if (bestOf === 3) return [1, 3].includes(gameNumber);
  return true;
}

function scheduleSeriesGame(world: World, s: PlayoffSeries, date: string, neutral: boolean): Fixture {
  const gameNumber = s.highWins + s.lowWins + 1;
  const highHome = seriesHomeIsHighSeed(s.bestOf, gameNumber);
  const f: Fixture = {
    id: nextId(world, 'fx'),
    leagueId: s.leagueId,
    season: s.season,
    date,
    homeId: highHome ? s.highSeedId : s.lowSeedId,
    awayId: highHome ? s.lowSeedId : s.highSeedId,
    stage: 'playoff',
    round: s.round + 1,
    seriesId: s.id,
    gameNumber,
    neutral,
    matchId: null,
  };
  world.fixtures[f.id] = f;
  return f;
}

/** Creates the first playoff round from the final regular-season standings. */
export function startPlayoffs(world: World, league: League, season: number, startDate: string): PlayoffSeries[] {
  const standings = computeStandings(world, league.id, season);
  const teams = Math.min(league.playoff.teams, standings.length - (standings.length % 2));
  const field = largestPowerOfTwo(teams);
  if (field < 2) return [];
  const seeds = standings.slice(0, field).map((r) => r.clubId);
  const order = bracketSeedOrder(field);
  const created: PlayoffSeries[] = [];
  for (let slot = 0; slot < field / 2; slot++) {
    const a = order[slot * 2];
    const b = order[slot * 2 + 1];
    const [hi, lo] = a < b ? [a, b] : [b, a];
    const s: PlayoffSeries = {
      id: nextId(world, 'sr'),
      leagueId: league.id,
      season,
      round: 0,
      slot,
      highSeedId: seeds[hi - 1],
      lowSeedId: seeds[lo - 1],
      highSeed: hi,
      lowSeed: lo,
      highWins: 0,
      lowWins: 0,
      bestOf: league.playoff.seriesLengths[0] ?? 1,
      winnerId: null,
    };
    world.series[s.id] = s;
    created.push(s);
    scheduleSeriesGame(world, s, startDate, league.playoff.neutralRounds.includes(0));
  }
  return created;
}

function largestPowerOfTwo(n: number): number {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

export interface SeriesUpdate {
  series: PlayoffSeries;
  decided: boolean;
  championDecided: boolean;
  championId: string | null;
}

/**
 * Records the result of a playoff game, schedules the next game or the next
 * round, and reports whether the league champion has been decided.
 */
export function recordPlayoffResult(world: World, seriesId: string, winnerId: string, gameDate: string): SeriesUpdate {
  const s = world.series[seriesId];
  if (!s) throw new Error(`Unknown series ${seriesId}`);
  const league = world.leagues[s.leagueId];
  if (winnerId === s.highSeedId) s.highWins++;
  else s.lowWins++;
  const needed = Math.floor(s.bestOf / 2) + 1;
  const neutral = league.playoff.neutralRounds.includes(s.round);
  if (s.highWins < needed && s.lowWins < needed) {
    scheduleSeriesGame(world, s, addDays(gameDate, 2), neutral);
    return { series: s, decided: false, championDecided: false, championId: null };
  }
  s.winnerId = s.highWins >= needed ? s.highSeedId : s.lowSeedId;

  const roundSeries = seriesForLeague(world, s.leagueId, s.season).filter((x) => x.round === s.round);
  if (roundSeries.length === 1) {
    return { series: s, decided: true, championDecided: true, championId: s.winnerId };
  }
  // Create the next-round series when the sibling series has finished.
  const siblingSlot = s.slot % 2 === 0 ? s.slot + 1 : s.slot - 1;
  const sibling = roundSeries.find((x) => x.slot === siblingSlot);
  if (sibling?.winnerId) {
    const first = s.slot < sibling.slot ? s : sibling;
    const second = s.slot < sibling.slot ? sibling : s;
    const seedOf = (x: PlayoffSeries) => (x.winnerId === x.highSeedId ? x.highSeed : x.lowSeed);
    const aSeed = seedOf(first);
    const bSeed = seedOf(second);
    const highIsFirst = aSeed <= bSeed;
    const round = s.round + 1;
    const next: PlayoffSeries = {
      id: nextId(world, 'sr'),
      leagueId: s.leagueId,
      season: s.season,
      round,
      slot: Math.floor(s.slot / 2),
      highSeedId: highIsFirst ? first.winnerId! : second.winnerId!,
      lowSeedId: highIsFirst ? second.winnerId! : first.winnerId!,
      highSeed: Math.min(aSeed, bSeed),
      lowSeed: Math.max(aSeed, bSeed),
      highWins: 0,
      lowWins: 0,
      bestOf: league.playoff.seriesLengths[round] ?? 1,
      winnerId: null,
    };
    world.series[next.id] = next;
    scheduleSeriesGame(world, next, addDays(gameDate, 3), league.playoff.neutralRounds.includes(round));
  }
  return { series: s, decided: true, championDecided: false, championId: null };
}

export function roundName(league: League, round: number): string {
  const total = league.playoff.seriesLengths.length;
  const fromEnd = total - 1 - round;
  if (league.playoff.neutralRounds.length >= 2) {
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Final Four — Semifinal';
  }
  if (fromEnd === 0) return 'Finals';
  if (fromEnd === 1) return 'Semifinals';
  if (fromEnd === 2) return 'Quarterfinals';
  return `Round ${round + 1}`;
}
