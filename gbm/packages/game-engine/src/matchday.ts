import type { Fixture, Injury, Match, World } from '@gbm/shared-types';
import { addDays, clamp, combineSeeds, nextId } from '@gbm/shared-types';
import { playerOverall } from '@gbm/player-system';
import { recordPlayoffResult, roundName } from '@gbm/competition-system';
import { simulateMatch, type SimTeamInput } from '@gbm/simulation';
import { bookGateReceipts } from '@gbm/finance-system';
import { gameDayRotation } from '@gbm/ai-manager';
import { rosterOf } from '@gbm/transfer-system';
import { staffEffects } from '@gbm/staff-system';
import { addNews } from './world';

/** Builds the simulation input for a club from its rotation, staff and tactics. */
export function buildSimTeam(world: World, clubId: string): SimTeamInput & { warnings: string[] } {
  const club = world.clubs[clubId];
  const rot = gameDayRotation(world, clubId);
  let available = rot.available;
  const warnings = [...rot.warnings];
  if (available.length < 5) {
    // Not enough healthy players: injured players are forced to dress.
    const extra = Object.values(world.players).filter((p) => p.clubId === clubId && !p.retired && !available.includes(p));
    available = [...available, ...extra].slice(0, Math.max(5, available.length));
    warnings.push('Not enough healthy players — injured players were forced to play.');
    for (const p of available) if (!(p.id in rot.minutes)) rot.minutes[p.id] = 10;
  }
  const effects = staffEffects(world, clubId);
  const chemAvg = available.reduce((s, p) => s + p.attributes.teamChemistry, 0) / Math.max(1, available.length);
  const starters = rot.starters.length === 5 ? rot.starters : available.slice(0, 5).map((p) => p.id);
  return {
    clubId,
    name: club.shortName,
    players: available.map((p) => ({
      id: p.id,
      name: `${p.firstName[0]}. ${p.lastName}`,
      position: p.position,
      secondaryPosition: p.secondaryPosition,
      attributes: p.attributes,
      overall: playerOverall(p),
      energy: clamp(100 - p.fatigue * 0.25, 60, 100),
    })),
    starters,
    targetMinutes: rot.minutes,
    tactics: club.tactics,
    coachRating: effects.offense,
    defenseCoachRating: effects.defense,
    gameManagement: effects.gameManagement,
    chemistry: Math.round(chemAvg * 0.6 + effects.chemistry * 0.4),
    warnings,
  };
}

export interface MatchOutcome {
  match: Match;
  championDecided: { leagueId: string; championId: string } | null;
}

/** Plays a fixture through the possession engine and applies every consequence. */
export function playFixture(world: World, fixture: Fixture): MatchOutcome {
  if (fixture.matchId) throw new Error(`Fixture ${fixture.id} already played`);
  const league = world.leagues[fixture.leagueId];
  const rules = world.rules[league.rulesId];
  const home = buildSimTeam(world, fixture.homeId);
  const away = buildSimTeam(world, fixture.awayId);
  const userInvolved = fixture.homeId === world.meta.userClubId || fixture.awayId === world.meta.userClubId;
  const seed = combineSeeds(world.meta.seed, fixture.id);
  const r = simulateMatch(home, away, { rules, seed, homeCourt: !fixture.neutral, recordEvents: userInvolved });

  const attendance = fixture.neutral ? 0 : bookGateReceipts(world, fixture.homeId, fixture.awayId, fixture.stage === 'playoff');
  const match: Match = {
    id: nextId(world, 'm'),
    fixtureId: fixture.id,
    leagueId: fixture.leagueId,
    season: fixture.season,
    date: fixture.date,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    homeQuarters: r.homeQuarters,
    awayQuarters: r.awayQuarters,
    overtimes: r.overtimes,
    attendance,
    homeStats: r.homeStats,
    awayStats: r.awayStats,
    seed,
    events: userInvolved ? r.events : null,
  };
  world.matches[match.id] = match;
  fixture.matchId = match.id;
  for (const ps of r.playerStats) {
    world.playerGameStats.push({ ...ps, matchId: match.id });
    const p = world.players[ps.playerId];
    if (p) p.fatigue = clamp(p.fatigue + (ps.seconds / 60) * 0.35, 0, 100);
  }
  const winnerId = r.homeScore > r.awayScore ? fixture.homeId : fixture.awayId;
  const loserId = winnerId === fixture.homeId ? fixture.awayId : fixture.homeId;
  for (const p of rosterOf(world, winnerId)) p.morale = clamp(p.morale + 0.6, 0, 100);
  for (const p of rosterOf(world, loserId)) p.morale = clamp(p.morale - 0.6, 0, 100);

  // Injuries from the game.
  for (const inj of r.injuries) {
    const p = world.players[inj.playerId];
    if (!p) continue;
    const injury: Injury = {
      id: nextId(world, 'inj'), playerId: p.id, type: inj.type, startDate: fixture.date, daysOut: inj.days,
      daysRemaining: inj.days, season: fixture.season,
    };
    world.injuries[injury.id] = injury;
    p.injuryId = injury.id;
    if (p.clubId === world.meta.userClubId) {
      addNews(world, 'injury', `${p.firstName} ${p.lastName} injured`, `${p.firstName} ${p.lastName} suffered a ${inj.type.toLowerCase()} and is expected to miss ${inj.days} day${inj.days === 1 ? '' : 's'}.`, { clubId: p.clubId, playerId: p.id, important: inj.days >= 8 });
    }
  }

  if (userInvolved) {
    const uHome = fixture.homeId === world.meta.userClubId;
    const us = uHome ? r.homeScore : r.awayScore;
    const them = uHome ? r.awayScore : r.homeScore;
    const opp = world.clubs[uHome ? fixture.awayId : fixture.homeId];
    addNews(world, 'match', `${us > them ? 'Win' : 'Loss'} ${us}-${them} ${uHome ? 'vs' : 'at'} ${opp.shortName}`, `${world.clubs[world.meta.userClubId].name} ${us > them ? 'beat' : 'lost to'} ${opp.name} ${us}-${them}${r.overtimes ? ` (${r.overtimes}OT)` : ''}.`, { clubId: world.meta.userClubId });
    for (const w of uHome ? home.warnings : away.warnings) addNews(world, 'match', 'Lineup adjusted', w, { clubId: world.meta.userClubId });
  }

  let championDecided: MatchOutcome['championDecided'] = null;
  if (fixture.stage === 'playoff' && fixture.seriesId) {
    const upd = recordPlayoffResult(world, fixture.seriesId, winnerId, fixture.date);
    const s = upd.series;
    if (upd.decided && (s.highSeedId === world.meta.userClubId || s.lowSeedId === world.meta.userClubId)) {
      const won = s.winnerId === world.meta.userClubId;
      addNews(world, 'season', won ? `Through to the next round` : `Eliminated`, `${world.clubs[s.winnerId!].name} won the ${roundName(league, s.round)} series ${Math.max(s.highWins, s.lowWins)}-${Math.min(s.highWins, s.lowWins)}.`, { clubId: world.meta.userClubId, important: true });
    }
    if (upd.championDecided && upd.championId) {
      championDecided = { leagueId: league.id, championId: upd.championId };
      addNews(world, 'season', `${world.clubs[upd.championId].name} win the ${league.name}`, `${world.clubs[upd.championId].name} are the ${league.name} champions!`, { clubId: upd.championId, important: true });
    }
  }
  return { match, championDecided };
}

export function fixturesOn(world: World, date: string): Fixture[] {
  return Object.values(world.fixtures).filter((f) => f.date === date && !f.matchId);
}

export function nextUserFixture(world: World): Fixture | null {
  let best: Fixture | null = null;
  for (const f of Object.values(world.fixtures)) {
    if (f.matchId) continue;
    if (f.homeId !== world.meta.userClubId && f.awayId !== world.meta.userClubId) continue;
    if (!best || f.date < best.date) best = f;
  }
  return best;
}

export function recentUserMatches(world: World, n = 5): Match[] {
  return Object.values(world.matches)
    .filter((m) => m.homeId === world.meta.userClubId || m.awayId === world.meta.userClubId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, n);
}

export { addDays };
