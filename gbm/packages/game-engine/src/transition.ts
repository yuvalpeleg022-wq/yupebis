import type { CompetitionEntry, Fixture, World } from '@gbm/shared-types';
import { addDays, clamp, invalidateIndexes, nextId } from '@gbm/shared-types';
import { allocateNextSeason, entriesFor, generateLeagueSchedule, nextFreeDate, regulationFor, seasonStartDate } from '@gbm/competition-system';
import { addNews } from './world';

export const MIN_COMPETITION_CLUBS = 4;

/**
 * Season end: computes and stores next season's memberships from the final
 * results (qualification, licences, promotion, relegation). Entries are
 * confirmed at this point; qualifying rounds are played in pre-season.
 */
export function confirmNextSeasonQualification(world: World) {
  const season = world.meta.season;
  const { entries, notes } = allocateNextSeason(world, season);
  world.competitionEntries = world.competitionEntries.filter((e) => e.season !== season + 1);
  world.competitionEntries.push(...entries);
  const user = world.meta.userClubId;
  for (const n of notes) addNews(world, 'season', `${world.leagues[n.leagueId]?.name}: qualification note`, n.message);
  if (user) {
    for (const e of entries.filter((x) => x.clubId === user)) {
      const league = world.leagues[e.leagueId];
      const verb = e.reason === 'promoted' ? 'Promoted to' : e.reason === 'relegated' ? 'Relegated to' : e.status === 'pending_qualifier' ? 'Qualifying round for' : 'Qualified for';
      if (e.reason !== 'member') addNews(world, 'season', `${verb} ${league.name}`, `${world.clubs[user].name}: ${e.detail}.`, { clubId: user, important: true });
    }
  }
  // Clubs that drop out of a competition get a news item too.
  const current = entriesFor(world, season).filter((e) => e.status === 'confirmed');
  for (const e of current) {
    if (!entries.some((x) => x.clubId === e.clubId && x.leagueId === e.leagueId)) {
      if (e.clubId === user) addNews(world, 'season', `Out of the ${world.leagues[e.leagueId].name}`, `${world.clubs[user].name} did not keep a place in the ${world.leagues[e.leagueId].name} for next season.`, { clubId: user, important: true });
    }
  }
}

/**
 * 1 July, after the season number has advanced: applies the stored entries to
 * clubs, activates competitions, adjusts reputations and schedules qualifying
 * rounds. Regular-season schedules are created at each registration deadline.
 */
export function applySeasonEntries(world: World) {
  const season = world.meta.season;
  const entries = entriesFor(world, season).filter((e) => e.status !== 'eliminated');
  if (entries.length === 0) return; // no qualification data (e.g. regulations missing): keep memberships
  const byClub = new Map<string, CompetitionEntry[]>();
  for (const e of entries) (byClub.get(e.clubId) ?? byClub.set(e.clubId, []).get(e.clubId)!).push(e);
  for (const club of Object.values(world.clubs)) {
    const list = byClub.get(club.id) ?? [];
    if (list.length === 0) continue;
    club.competitionIds = list.map((e) => e.leagueId).sort((a, b) => primaryRank(world, a, season) - primaryRank(world, b, season));
    club.leagueId = club.competitionIds[0];
    // Reputation follows the stage a club plays on.
    for (const e of list) {
      if (e.reason === 'promoted') club.reputation = clamp(club.reputation + 3, 1, 99);
      if (e.reason === 'relegated') club.reputation = clamp(club.reputation - 5, 1, 99);
      const reg = regulationFor(world, e.leagueId, season);
      if (reg?.membership === 'qualification' && e.status === 'confirmed') club.reputation = clamp(club.reputation + (reg.priority === 1 ? 2 : 1), 1, 99);
    }
  }
  for (const league of Object.values(world.leagues)) {
    const count = entries.filter((e) => e.leagueId === league.id).length;
    const missingRosters = entries.filter((e) => e.leagueId === league.id && (world.clubs[e.clubId].rosterSource === 'missing' || world.clubs[e.clubId].rosterSource === 'short')).length;
    league.active = count >= MIN_COMPETITION_CLUBS && missingRosters === 0;
    if (count > 0 && missingRosters > 0) league.dataNote = `Not simulated: real rosters missing for ${missingRosters} club(s).`;
  }
  // Clubs keep only competitions that are active this season (primary kept for rules).
  for (const club of Object.values(world.clubs)) club.competitionIds = club.competitionIds.filter((id, i) => i === 0 || world.leagues[id].active);
  invalidateIndexes(world);
  scheduleQualifyingRounds(world);
}

/** Primary competition: EuroLeague if entered, else domestic/closed league, else any. */
function primaryRank(world: World, leagueId: string, season: number): number {
  const reg = regulationFor(world, leagueId, season);
  if (!reg) return 5;
  if (reg.membership === 'qualification' && reg.priority === 1) return 0;
  if (reg.membership !== 'qualification') return 1;
  return 2 + reg.priority;
}

/** Knockout qualifying rounds (single game, higher reputation at home). */
export function scheduleQualifyingRounds(world: World) {
  const season = world.meta.season;
  for (const league of Object.values(world.leagues)) {
    const reg = regulationFor(world, league.id, season);
    if (!reg?.qualifyingRound || !league.active) continue;
    const pending = entriesFor(world, season, league.id).filter((e) => e.status === 'pending_qualifier');
    if (pending.length === 0) continue;
    const seeded = pending.sort((a, b) => world.clubs[b.clubId].reputation - world.clubs[a.clubId].reputation);
    const places = reg.qualifyingRound.places;
    // Byes when there are fewer than two entrants per place.
    const byes = Math.max(0, places * 2 - seeded.length) > 0 ? Math.min(places, places * 2 - seeded.length) : 0;
    for (const e of seeded.slice(0, byes)) {
      e.status = 'confirmed';
      e.detail += ' — bye through qualifying round';
    }
    const playing = seeded.slice(byes, byes + (places - byes) * 2);
    for (const e of seeded.slice(byes + (places - byes) * 2)) {
      e.status = 'eliminated';
      e.detail += ' — no qualifying-round place';
    }
    const start = addDays(seasonStartDate(league, season), -14);
    for (let i = 0; i < playing.length / 2; i++) {
      const home = playing[i];
      const away = playing[playing.length - 1 - i];
      const f: Fixture = {
        id: nextId(world, 'fx'), leagueId: league.id, season, date: nextFreeDate(world, [home.clubId, away.clubId], addDays(start, i % 3)),
        homeId: home.clubId, awayId: away.clubId, stage: 'qualifier', round: 0, seriesId: null, gameNumber: 1, neutral: false, matchId: null,
      };
      world.fixtures[f.id] = f;
    }
    if (playing.some((e) => e.clubId === world.meta.userClubId)) {
      addNews(world, 'season', `${league.name} qualifying round`, `Your club plays a one-game qualifier for the ${league.name} main draw.`, { clubId: world.meta.userClubId, important: true });
    }
  }
}

/** Records a qualifying-round result. */
export function recordQualifier(world: World, fixture: Fixture, winnerId: string) {
  const loserId = winnerId === fixture.homeId ? fixture.awayId : fixture.homeId;
  for (const e of world.competitionEntries) {
    if (e.season !== fixture.season || e.leagueId !== fixture.leagueId) continue;
    if (e.clubId === winnerId) { e.status = 'confirmed'; e.detail += ' — won qualifying round'; }
    if (e.clubId === loserId) { e.status = 'eliminated'; e.detail += ' — lost qualifying round'; }
  }
  const user = world.meta.userClubId;
  if (winnerId === user || loserId === user) {
    addNews(world, 'season', winnerId === user ? `Qualified for the ${world.leagues[fixture.leagueId].name}` : `Out in qualifying`, `${world.clubs[winnerId].name} beat ${world.clubs[loserId].name} in the ${world.leagues[fixture.leagueId].name} qualifying round.`, { clubId: user, important: true });
  }
  if (world.clubs[loserId]) world.clubs[loserId].competitionIds = world.clubs[loserId].competitionIds.filter((id) => id !== fixture.leagueId || id === world.clubs[loserId].leagueId);
}

/**
 * Registration deadline (two days before a competition starts): unresolved
 * qualifiers are eliminated and the regular-season schedule is generated from
 * the confirmed entrants.
 */
export function registrationCheck(world: World) {
  const season = world.meta.season;
  for (const league of Object.values(world.leagues)) {
    if (!league.active) continue;
    const deadline = addDays(seasonStartDate(league, season), -2);
    if (world.meta.currentDate < deadline) continue;
    const hasSchedule = Object.values(world.fixtures).some((f) => f.leagueId === league.id && f.season === season && f.stage === 'regular');
    if (hasSchedule) continue;
    for (const e of entriesFor(world, season, league.id)) {
      if (e.status === 'pending_qualifier') { e.status = 'eliminated'; e.detail += ' — qualifier unresolved at deadline'; }
    }
    const confirmed = entriesFor(world, season, league.id).filter((e) => e.status === 'confirmed').map((e) => e.clubId);
    if (confirmed.length > 0) {
      for (const club of Object.values(world.clubs)) {
        const inIt = confirmed.includes(club.id);
        if (inIt && !club.competitionIds.includes(league.id)) club.competitionIds.push(league.id);
        if (!inIt && club.leagueId !== league.id) club.competitionIds = club.competitionIds.filter((id) => id !== league.id);
      }
    }
    const members = Object.values(world.clubs).filter((c) => c.competitionIds.includes(league.id)).length;
    if (members < MIN_COMPETITION_CLUBS) {
      league.active = false;
      league.dataNote = `Not held this season: only ${members} registered club(s).`;
      continue;
    }
    generateLeagueSchedule(world, league, season);
    invalidateIndexes(world);
  }
}

/** Initial entries for the starting season, from the real-world dataset. */
export function foundingEntries(world: World) {
  const season = world.meta.season;
  for (const club of Object.values(world.clubs)) {
    for (const id of club.competitionIds) {
      world.competitionEntries.push({ season, leagueId: id, clubId: club.id, reason: 'founding', ruleId: null, status: 'confirmed', detail: `${season}-${String((season + 1) % 100).padStart(2, '0')} participation from the real-world dataset` });
    }
  }
}
