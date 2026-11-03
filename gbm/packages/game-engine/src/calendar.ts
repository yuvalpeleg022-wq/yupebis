import type { NewsEvent, World } from '@gbm/shared-types';
import { Rng, addDays, combineSeeds, dayOfMonth, dayOfWeek, invalidateIndexes, logicAge } from '@gbm/shared-types';
import { developPlayer } from '@gbm/player-system';
import { processMonthlyFinances } from '@gbm/finance-system';
import { aiFillRoster, aiTactics, autoRotation } from '@gbm/ai-manager';
import { clubRules, rosterOf } from '@gbm/transfer-system';
import { aiMonthlyStaffReview, aiStaffMarketTick, clubRecord, rosterStrength, staffEffects } from '@gbm/staff-system';
import { seasonStartDate, standingsZones } from '@gbm/competition-system';
import { fixturesOn, playFixture } from './matchday';
import { checkPlayoffStarts, recordChampion, rolloverSeason } from './season';
import { addNews } from './world';
import { makeFictionalCoach } from './career';
import { monthlyManagerReview } from './manager';
import { registrationCheck } from './transition';

export interface DayResult {
  date: string;
  matchesPlayed: number;
  userPlayed: boolean;
  important: NewsEvent[];
}

/** Reasons the user must act before time can advance. */
export function blockingIssues(world: World): string[] {
  const issues: string[] = [];
  const clubId = world.meta.userClubId;
  if (!clubId) return issues;
  const { rules } = clubRules(world, clubId);
  const roster = rosterOf(world, clubId);
  const hasGameSoon = Object.values(world.fixtures).some((f) => !f.matchId && f.date <= addDays(world.meta.currentDate, 1) && (f.homeId === clubId || f.awayId === clubId));
  if (hasGameSoon && roster.length < Math.min(rules.rosterMin, 8)) issues.push(`Your roster has ${roster.length} players — sign players before your next game (minimum ${Math.min(rules.rosterMin, 8)}).`);
  const club = world.clubs[clubId];
  if (!club.rotation.auto) {
    const valid = club.rotation.starters.filter((id) => world.players[id]?.clubId === clubId);
    if (valid.length !== 5 && hasGameSoon) issues.push('Your starting lineup needs exactly five players from your roster (or enable auto rotation).');
  }
  return issues;
}

/** Simulates a single day of the global calendar. */
export function advanceDay(world: World): DayResult {
  const date = world.meta.currentDate;
  const rng = new Rng(combineSeeds(world.meta.seed, 'day', date));
  const before = world.news.length;
  const user = world.meta.userClubId;
  invalidateIndexes(world);

  // Phase changes.
  if (world.meta.phase === 'preseason') {
    const starts = Object.values(world.leagues).filter((l) => l.active).map((l) => seasonStartDate(l, world.meta.season)).sort();
    if (starts[0] && date >= starts[0]) world.meta.phase = 'regular';
  }

  // Registration deadlines: lock entrants and publish schedules.
  registrationCheck(world);

  // Matches.
  let played = 0;
  let userPlayed = false;
  for (const f of fixturesOn(world, date)) {
    if (f.homeId === user || f.awayId === user) userPlayed = true;
    const out = playFixture(world, f);
    played++;
    if (out.championDecided) recordChampion(world, out.championDecided.leagueId, out.championDecided.championId);
  }
  if (world.meta.phase === 'regular' || world.meta.phase === 'playoffs') {
    checkPlayoffStarts(world);
    if (Object.values(world.series).some((s) => s.season === world.meta.season)) world.meta.phase = world.meta.phase === 'regular' && allRegularDone(world) ? 'playoffs' : world.meta.phase;
  }

  // Daily recovery.
  for (const inj of Object.values(world.injuries)) {
    if (inj.daysRemaining <= 0) continue;
    inj.daysRemaining--;
    if (inj.daysRemaining === 0) {
      const p = world.players[inj.playerId];
      if (p) {
        p.injuryId = null;
        if (p.clubId === user) addNews(world, 'injury', `${p.lastName} is fit again`, `${p.firstName} ${p.lastName} has recovered from his ${inj.type.toLowerCase()}.`, { clubId: user, playerId: p.id });
      }
    }
  }
  for (const p of Object.values(world.players)) if (p.fatigue > 0) p.fatigue = Math.max(0, p.fatigue - (p.clubId && world.clubs[p.clubId]?.trainingFocus === 'recovery' ? 7 : 5));

  // Staff market every three days.
  if (dayOfMonth(date) % 3 === 0) {
    for (const n of aiStaffMarketTick(world, rng, user, (role, leagueId) => makeFictionalCoach(world, rng, role, leagueId))) addNews(world, 'system', n.title, n.body, { clubId: n.clubId, important: n.important });
  }

  // Weekly AI roster management.
  if (dayOfWeek(date) === 1) {
    for (const club of Object.values(world.clubs)) {
      if (club.id === user || !world.leagues[club.leagueId].active) continue;
      aiFillRoster(world, club.id, rng, 2);
      club.rotation = autoRotation(world, club.id);
      if (rng.chance(0.25)) club.tactics = aiTactics(world, club.id);
    }
  }
  // User auto rotation follows injuries daily.
  if (user && world.clubs[user].rotation.auto) world.clubs[user].rotation = autoRotation(world, user);

  // Monthly: finances, development, staff reviews, board.
  if (dayOfMonth(date) === 1) monthly(world, rng);

  // Season boundary.
  const next = addDays(date, 1);
  world.meta.currentDate = next;
  if (world.meta.phase === 'offseason' && next.slice(5) === '07-01') rolloverSeason(world);
  world.meta.updatedAt = new Date().toISOString();
  const important = world.news.slice(before).filter((n) => n.important);
  return { date, matchesPlayed: played, userPlayed, important };
}

function allRegularDone(world: World): boolean {
  return Object.values(world.fixtures).every((f) => f.season !== world.meta.season || f.stage !== 'regular' || f.matchId);
}

function monthly(world: World, rng: Rng) {
  const user = world.meta.userClubId;
  const season = world.meta.season;
  for (const club of Object.values(world.clubs)) processMonthlyFinances(world, club.id);
  const userClub = user ? world.clubs[user] : null;
  if (userClub && userClub.cash < 0) addNews(world, 'finance', 'Club is in debt', `Cash balance is negative. The board will not approve new spending until finances recover.`, { clubId: user, important: true });

  // Minutes share for development.
  const seconds = new Map<string, number>();
  const games = new Map<string, number>();
  for (const g of world.playerGameStats) {
    const m = world.matches[g.matchId];
    if (!m || m.season !== season) continue;
    seconds.set(g.playerId, (seconds.get(g.playerId) ?? 0) + g.seconds);
  }
  for (const m of Object.values(world.matches)) {
    if (m.season !== season) continue;
    games.set(m.homeId, (games.get(m.homeId) ?? 0) + 1);
    games.set(m.awayId, (games.get(m.awayId) ?? 0) + 1);
  }
  const effectsCache = new Map<string, ReturnType<typeof staffEffects>>();
  let notable = 0;
  for (const p of Object.values(world.players)) {
    if (p.retired) continue;
    const club = p.clubId ? world.clubs[p.clubId] : null;
    if (club && !world.leagues[club.leagueId].active) continue;
    let fx = club ? effectsCache.get(club.id) : undefined;
    if (club && !fx) {
      fx = staffEffects(world, club.id);
      effectsCache.set(club.id, fx);
    }
    const g = club ? games.get(club.id) ?? 0 : 0;
    const share = g > 0 ? (seconds.get(p.id) ?? 0) / (g * 48 * 60) : 0.2;
    const age = logicAge(p, world.meta.currentDate);
    const delta = developPlayer(p, {
      rng, age, minutesShare: share, coachRating: fx?.development ?? 40, shootingCoach: fx?.shooting ?? 40,
      trainingQuality: fx?.training ?? 40, focus: club?.trainingFocus ?? 'balanced', yearFraction: 1 / 12,
    });
    if (club?.id === user && delta >= 2 && notable < 3) {
      notable++;
      addNews(world, 'development', `${p.firstName} ${p.lastName} is improving`, `${p.lastName}'s overall rating rose by ${delta} this month.`, { clubId: user, playerId: p.id });
    }
  }
  for (const n of aiMonthlyStaffReview(world, rng, user)) addNews(world, 'system', n.title, n.body, { clubId: n.clubId, important: n.important });
  updateBoard(world);
  monthlyManagerReview(world, rng);
}

/** Board confidence moves with results relative to roster-based expectations. */
export function boardExpectation(world: World): { rank: number; size: number; target: string; expectedPct: number } {
  const club = world.clubs[world.meta.userClubId];
  const peers = Object.values(world.clubs).filter((c) => c.leagueId === club.leagueId).map((c) => ({ id: c.id, s: rosterStrength(world, c.id) })).sort((a, b) => b.s - a.s);
  const rank = peers.findIndex((p) => p.id === club.id) + 1;
  const size = peers.length;
  const league = world.leagues[club.leagueId];
  // Qualification and relegation zones of the club's league shape the objective.
  const zones = standingsZones(world, league.id, world.meta.season);
  const zone = zones.find((z) => rank >= z.from && rank <= z.to && z.kind !== 'relegation');
  const relegation = zones.find((z) => z.kind === 'relegation');
  const target = rank <= 2
    ? 'Win the championship'
    : zone
      ? `Finish in the ${zone.label} places (${zone.from}–${zone.to})`
      : relegation && rank >= relegation.from - 2
        ? 'Avoid relegation'
        : rank <= Math.ceil(league.playoff.teams / 2) ? 'Reach the playoffs with home court' : rank <= league.playoff.teams ? 'Make the playoffs' : 'Develop the team and stay competitive';
  return { rank, size, target, expectedPct: 0.75 - ((rank - 1) / Math.max(1, size - 1)) * 0.5 };
}

function updateBoard(world: World) {
  if (!world.meta.userClubId) return;
  const rec = clubRecord(world, world.meta.userClubId, world.meta.season);
  const g = rec.wins + rec.losses;
  if (g < 5) return;
  const exp = boardExpectation(world);
  const pct = rec.wins / g;
  const prev = world.meta.boardConfidence;
  world.meta.boardConfidence = Math.max(0, Math.min(100, Math.round(prev + (pct - exp.expectedPct) * 25)));
  if (world.meta.boardConfidence < 25 && prev >= 25) {
    addNews(world, 'board', 'Board is concerned', `The board expected: "${exp.target}". Results are well below expectations (${rec.wins}-${rec.losses}).`, { clubId: world.meta.userClubId, important: true });
  }
}

export type AdvanceMode = 'day' | 'next_game' | 'week' | 'month';

export interface AdvanceResult {
  days: DayResult[];
  stoppedFor: NewsEvent[];
  blocked: string[];
}

/**
 * Advances time. Stops early when something important happens to the user's
 * club, so the user always sees important events before time moves on.
 */
export function advance(world: World, mode: AdvanceMode, maxDays = 400): AdvanceResult {
  const days: DayResult[] = [];
  const start = world.meta.currentDate;
  const blocked = blockingIssues(world);
  if (blocked.length) return { days, stoppedFor: [], blocked };
  const limit = mode === 'day' ? 1 : mode === 'week' ? 7 : mode === 'month' ? 30 : maxDays;
  for (let i = 0; i < limit; i++) {
    const r = advanceDay(world);
    days.push(r);
    if (r.important.length && mode !== 'day') return { days, stoppedFor: r.important, blocked: [] };
    if (mode === 'next_game' && r.userPlayed) break;
    const b = blockingIssues(world);
    if (b.length) return { days, stoppedFor: [], blocked: b };
    if (mode === 'month' && world.meta.currentDate.slice(0, 7) !== start.slice(0, 7) && dayOfMonth(world.meta.currentDate) === 1) break;
  }
  return { days, stoppedFor: [], blocked: [] };
}
