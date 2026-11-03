import type { Award, Fixture, FixtureStage, PlayerSeasonStats, Staff, StaffRole, World } from '@gbm/shared-types';
import { Rng, addDays, ageOn, cachedIndex, combineSeeds, invalidateIndexes, nextId } from '@gbm/shared-types';
import { generatePlayer, playerOverall, randomNationality, retirementChance, seasonPotentialShift } from '@gbm/player-system';
import { computeStandings, generateLeagueSchedule, lastRegularSeasonDate, seasonStartDate, seriesForLeague, startPlayoffs } from '@gbm/competition-system';
import { chargeLuxuryTax, projectedSeasonIncome } from '@gbm/finance-system';
import { aiBudget, aiFillRoster, aiRenewals, aiTactics, aiTrimRoster, autoRotation } from '@gbm/ai-manager';
import { removeFromRotation } from '@gbm/transfer-system';
import { staffSeasonRollover } from '@gbm/staff-system';
import { makeFictionalCoach } from './career';
import { addNews } from './world';
import { seasonEndManagerReview } from './manager';

export type LeagueStatus = 'not_started' | 'regular' | 'awaiting_playoffs' | 'playoffs' | 'finished';

export function leagueStatus(world: World, leagueId: string): LeagueStatus {
  const season = world.meta.season;
  const league = world.leagues[leagueId];
  const byLeague = cachedIndex(world, `regularFixtures:${season}`, () => {
    const m = new Map<string, Fixture[]>();
    for (const f of Object.values(world.fixtures)) {
      if (f.season !== season || f.stage !== 'regular') continue;
      (m.get(f.leagueId) ?? m.set(f.leagueId, []).get(f.leagueId)!).push(f);
    }
    return m;
  });
  const regular = byLeague.get(leagueId) ?? [];
  if (regular.length === 0) return 'finished';
  if (world.meta.currentDate < seasonStartDate(league, season) && regular.every((f) => !f.matchId)) return 'not_started';
  if (regular.some((f) => !f.matchId)) return 'regular';
  const series = seriesForLeague(world, leagueId, season);
  if (series.length === 0) return 'awaiting_playoffs';
  if (world.seasonSummaries.some((s) => s.leagueId === leagueId && s.season === season)) return 'finished';
  return 'playoffs';
}

/** Starts playoffs for any league whose regular season just finished. */
export function checkPlayoffStarts(world: World) {
  for (const league of Object.values(world.leagues)) {
    if (!league.active) continue;
    if (leagueStatus(world, league.id) !== 'awaiting_playoffs') continue;
    const last = lastRegularSeasonDate(world, league.id, world.meta.season)!;
    const start = addDays(last > world.meta.currentDate ? last : world.meta.currentDate, 3);
    const created = startPlayoffs(world, league, world.meta.season, start);
    const userIn = created.some((s) => s.highSeedId === world.meta.userClubId || s.lowSeedId === world.meta.userClubId);
    const userComp = world.clubs[world.meta.userClubId]?.competitionIds.includes(league.id) ?? false;
    addNews(world, 'season', `${league.name} playoffs set`, `The ${league.name} regular season is over. ${created.length * 2} teams advance to the playoffs${userIn ? ' — including your club!' : '.'}`, { important: userComp });
  }
}

/** Records a league champion and, once all leagues are done, closes the season. */
export function recordChampion(world: World, leagueId: string, championId: string) {
  const season = world.meta.season;
  const series = seriesForLeague(world, leagueId, season);
  const final = series[series.length - 1];
  const runnerUp = final ? (final.winnerId === final.highSeedId ? final.lowSeedId : final.highSeedId) : null;
  const standings = computeStandings(world, leagueId, season);
  world.seasonSummaries.push({ season, leagueId, championId, runnerUpId: runnerUp, regularSeasonWinnerId: standings[0]?.clubId ?? null });
  world.awards.push({ id: nextId(world, 'aw'), season, leagueId, award: 'champion', playerId: null, clubId: championId, value: 'Champion' });
  const active = Object.values(world.leagues).filter((l) => l.active);
  if (active.every((l) => world.seasonSummaries.some((s) => s.leagueId === l.id && s.season === season))) endOfSeason(world);
}

/** Aggregates per-game stats into season records. */
export function aggregatePlayerSeasons(world: World, season: number): PlayerSeasonStats[] {
  const map = new Map<string, PlayerSeasonStats>();
  for (const g of world.playerGameStats) {
    const m = world.matches[g.matchId];
    if (!m || m.season !== season) continue;
    const stage: FixtureStage = world.fixtures[m.fixtureId]?.stage ?? 'regular';
    const key = `${g.playerId}|${stage}|${g.clubId}`;
    let s = map.get(key);
    if (!s) {
      s = { playerId: g.playerId, season, clubId: g.clubId, leagueId: m.leagueId, stage, gp: 0, gs: 0, seconds: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, overall: 0 };
      map.set(key, s);
    }
    s.gp++;
    if (g.starter) s.gs++;
    for (const k of ['seconds', 'pts', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'tov', 'pf'] as const) s[k] += g[k];
  }
  for (const s of map.values()) {
    const p = world.players[s.playerId];
    s.overall = p ? playerOverall(p) : 0;
  }
  return [...map.values()];
}

function endOfSeason(world: World) {
  const season = world.meta.season;
  world.meta.phase = 'offseason';
  const seasons = aggregatePlayerSeasons(world, season);
  world.playerSeasons.push(...seasons);
  for (const league of Object.values(world.leagues)) {
    if (!league.active) continue;
    computeStandings(world, league.id, season).forEach((row, i) => world.seasonStandings.push({ season, leagueId: league.id, rank: i + 1, row }));
    // Awards from regular-season production.
    const reg = seasons.filter((s) => s.leagueId === league.id && s.stage === 'regular' && s.gp >= 10);
    const value = (s: PlayerSeasonStats) => (s.pts + 1.2 * (s.oreb + s.dreb) + 1.5 * s.ast + 2 * (s.stl + s.blk) - s.tov - 0.5 * (s.fga - s.fgm)) / s.gp;
    const mvp = [...reg].sort((a, b) => value(b) - value(a))[0];
    const scorer = [...reg].sort((a, b) => b.pts / b.gp - a.pts / a.gp)[0];
    const add = (award: Award['award'], s: PlayerSeasonStats | undefined, v: string) => {
      if (s) world.awards.push({ id: nextId(world, 'aw'), season, leagueId: league.id, award, playerId: s.playerId, clubId: s.clubId, value: v });
    };
    add('mvp', mvp, mvp ? `${(mvp.pts / mvp.gp).toFixed(1)} ppg` : '');
    add('top_scorer', scorer, scorer ? `${(scorer.pts / scorer.gp).toFixed(1)} ppg` : '');
  }
  for (const club of Object.values(world.clubs)) if (world.leagues[club.leagueId].active) chargeLuxuryTax(world, club.id);
  // Manager record.
  const stint = world.managerHistory.find((m) => m.clubId === world.meta.userClubId && m.endSeason === null);
  if (stint) {
    for (const m of Object.values(world.matches)) {
      if (m.season !== season) continue;
      if (m.homeId !== stint.clubId && m.awayId !== stint.clubId) continue;
      const won = m.homeId === stint.clubId ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
      if (won) stint.wins++;
      else stint.losses++;
    }
    if (world.seasonSummaries.some((s) => s.season === season && s.championId === stint.clubId)) stint.titles++;
  }
  seasonEndManagerReview(world);
  addNews(world, 'season', `The ${season}-${String((season + 1) % 100).padStart(2, '0')} season is over`, 'All competitions have finished. The off-season begins: contracts expire on 1 July, when the new season starts.', { important: true });
}

/** 1 July: development, retirements, contracts, staff careers, new schedules. */
export function rolloverSeason(world: World) {
  const old = world.meta.season;
  const rng = new Rng(combineSeeds(world.meta.seed, 'rollover', old));
  const user = world.meta.userClubId;
  const champions = new Set(world.seasonSummaries.filter((s) => s.season === old && s.championId).map((s) => s.championId!));

  // AI renewals before contracts expire.
  for (const club of Object.values(world.clubs)) if (club.id !== user && world.leagues[club.leagueId].active) aiRenewals(world, club.id, rng);

  // Players: potential shifts, retirements, expiries.
  for (const p of Object.values(world.players)) {
    if (p.retired) continue;
    const age = ageOn(p.birthDate, world.meta.currentDate);
    const shift = seasonPotentialShift(p, age, rng);
    if (shift === 'breakout' && p.clubId === user) addNews(world, 'development', `${p.firstName} ${p.lastName} breaks out`, `Coaches report a big jump in ${p.lastName}'s ceiling.`, { clubId: user, playerId: p.id });
    if (rng.chance(retirementChance(age, playerOverall(p)))) {
      const from = p.clubId;
      p.retired = true;
      for (const c of Object.values(world.contracts)) if (c.playerId === p.id) c.active = false;
      if (from) removeFromRotation(world, from, p.id);
      p.clubId = null;
      invalidateIndexes(world);
      world.transfers.push({ id: nextId(world, 'tr'), date: world.meta.currentDate, season: old, playerId: p.id, fromClubId: from, toClubId: null, type: 'retirement', fee: 0, salary: 0, years: 0 });
      if (from === user || playerOverall(p) >= 78) addNews(world, 'retirement', `${p.firstName} ${p.lastName} retires`, `${p.firstName} ${p.lastName} has retired at ${age}.`, { clubId: from, playerId: p.id });
    }
  }
  invalidateIndexes(world);
  for (const c of Object.values(world.contracts)) {
    if (!c.active || c.endSeason > old) continue;
    const renewed = Object.values(world.contracts).some((x) => x.active && x.playerId === c.playerId && x.startSeason > old);
    c.active = false;
    if (renewed) continue;
    const p = world.players[c.playerId];
    if (p && p.clubId === c.clubId) {
      removeFromRotation(world, c.clubId, p.id);
      p.clubId = null;
      invalidateIndexes(world);
      p.jersey = null;
      if (c.clubId === user) addNews(world, 'contract', `${p.firstName} ${p.lastName} leaves`, `${p.lastName}'s contract has expired. He is now a free agent.`, { clubId: user, playerId: p.id });
    }
  }

  // Coaching careers.
  const staffNews = staffSeasonRollover(world, rng, user, champions, (role: StaffRole): Staff => makeFictionalCoach(world, rng, role, 'lg_euroleague'));
  for (const n of staffNews) addNews(world, 'system', n.title, n.body, { clubId: n.clubId, important: n.important });

  // New season.
  world.meta.season = old + 1;
  world.meta.phase = 'preseason';
  for (const p of Object.values(world.players)) {
    p.fatigue = 0;
    p.morale = Math.round(p.morale * 0.7 + 65 * 0.3);
  }
  generateRookies(world, rng);
  youthIntake(world, rng);
  pruneHistory(world);
  for (const club of Object.values(world.clubs)) {
    if (!world.leagues[club.leagueId].active) continue;
    if (club.id !== user) {
      aiTrimRoster(world, club.id);
      aiFillRoster(world, club.id, rng, 6);
      aiBudget(world, club.id, projectedSeasonIncome(world, club));
      club.tactics = aiTactics(world, club.id);
    }
    if (club.rotation.auto || club.id !== user) club.rotation = autoRotation(world, club.id);
  }
  for (const league of Object.values(world.leagues)) if (league.active) generateLeagueSchedule(world, league, world.meta.season);
  invalidateIndexes(world);
  addNews(world, 'season', `Welcome to the ${world.meta.season}-${String((world.meta.season + 1) % 100).padStart(2, '0')} season`, 'Contracts have rolled over, rookies have entered the league and the new schedule has been released.', { important: true });
}

/**
 * Youth academy intake: every club adds two home-grown prospects per season
 * (the new-generation path for fictional players). Better academies produce
 * better prospects. They join the senior roster if there is room.
 */
function youthIntake(world: World, rng: Rng) {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
  for (const club of Object.values(world.clubs)) {
    const league = world.leagues[club.leagueId];
    if (!league.active) continue;
    const rules = world.rules[league.rulesId];
    for (let i = 0; i < 2; i++) {
      const p = generatePlayer(world, {
        rng, position: rng.pick(positions), age: rng.int(18, 20), overall: Math.round(40 + club.youthRating * 0.15 + rng.normal(0, 4)),
        potential: Math.round(55 + club.youthRating * 0.25 + rng.normal(0, 7)), onDate: world.meta.currentDate,
        nationality: league.region === 'north_america' ? 'USA' : club.country,
      });
      p.draftYear = world.meta.season;
      world.players[p.id] = p;
      invalidateIndexes(world);
      if (rosterOfClub(world, club.id) < rules.rosterMax) {
        const salary = rules.salaryCap.minSalary;
        const contractId = nextId(world, 'ct');
        world.contracts[contractId] = {
          id: contractId, playerId: p.id, clubId: club.id, salary, startSeason: world.meta.season, endSeason: world.meta.season + 2,
          option: 'none', buyout: null, nbaExitClause: false, signedDate: world.meta.currentDate, active: true,
        };
        p.clubId = club.id;
        invalidateIndexes(world);
        if (club.id === world.meta.userClubId) addNews(world, 'development', `Academy graduate: ${p.firstName} ${p.lastName}`, `${p.firstName} ${p.lastName} (${p.position}, ${ageOn(p.birthDate, world.meta.currentDate)}) joins the senior squad from the youth academy.`, { clubId: club.id, playerId: p.id });
      }
    }
  }
}

function rosterOfClub(world: World, clubId: string): number {
  let n = 0;
  for (const p of Object.values(world.players)) if (p.clubId === clubId && !p.retired) n++;
  return n;
}

function generateRookies(world: World, rng: Rng) {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
  for (const league of Object.values(world.leagues)) {
    if (!league.active) continue;
    const na = league.region === 'north_america';
    const clubs = Object.values(world.clubs).filter((c) => c.leagueId === league.id).length;
    for (let i = 0; i < clubs * 1.5; i++) {
      const p = generatePlayer(world, {
        rng, position: positions[i % 5], age: rng.int(19, 21), overall: Math.round((na ? 55 : 50) + rng.normal(0, 4)),
        potential: Math.round((na ? 70 : 64) + rng.normal(0, 7)), onDate: world.meta.currentDate,
        nationality: randomNationality(rng, na ? 'north_america' : 'europe'),
      });
      p.draftYear = world.meta.season;
      world.players[p.id] = p;
    }
  }
}

/** Keeps saves small: per-game detail is kept for the last two seasons only. */
export function pruneHistory(world: World) {
  const keepFrom = world.meta.season - 2;
  const dropMatches = new Set(Object.values(world.matches).filter((m) => m.season < keepFrom).map((m) => m.id));
  for (const id of dropMatches) delete world.matches[id];
  for (const f of Object.values(world.fixtures)) if (f.season < keepFrom) delete world.fixtures[f.id];
  for (const s of Object.values(world.series)) if (s.season < keepFrom) delete world.series[s.id];
  world.playerGameStats = world.playerGameStats.filter((g) => !dropMatches.has(g.matchId));
  for (const m of Object.values(world.matches)) if (m.season < world.meta.season - 1) m.events = null;
  world.finances = world.finances.filter((t) => t.season >= keepFrom);
  for (const [id, inj] of Object.entries(world.injuries)) if (inj.daysRemaining <= 0 && inj.season < keepFrom) delete world.injuries[id];
}
