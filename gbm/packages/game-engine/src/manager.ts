import type { CoachAttributes, JobOffer, World } from '@gbm/shared-types';
import { COACH_ATTRIBUTE_KEYS, Rng, addDays, clamp, combineSeeds, invalidateIndexes, nextId } from '@gbm/shared-types';
import { computeStandings } from '@gbm/competition-system';
import { payroll } from '@gbm/finance-system';
import { clubRecord, coachName, headCoach, openStint, rosterStrength, staffInRole } from '@gbm/staff-system';
import { addNews } from './world';

export type ManagerExperience = 'novice' | 'semi_pro' | 'professional' | 'elite';

export const EXPERIENCE_PROFILES: Record<ManagerExperience, { label: string; level: number; reputation: number }> = {
  novice: { label: 'Novice (no coaching background)', level: 48, reputation: 25 },
  semi_pro: { label: 'Semi-professional coach', level: 56, reputation: 40 },
  professional: { label: 'Professional coach', level: 64, reputation: 55 },
  elite: { label: 'Former elite coach', level: 72, reputation: 70 },
};

export function managerAttributesFor(exp: ManagerExperience): CoachAttributes {
  const a = {} as CoachAttributes;
  for (const k of COACH_ATTRIBUTE_KEYS) a[k] = EXPERIENCE_PROFILES[exp].level;
  return a;
}

// ---------------------------------------------------------------------------
// Club directory (career start and job search)
// ---------------------------------------------------------------------------

export type FinancialStatus = 'wealthy' | 'healthy' | 'stable' | 'tight' | 'in_debt';

export interface ClubDirectoryRow {
  clubId: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  leagueId: string;
  leagueName: string;
  competitions: { id: string; name: string }[];
  reputation: number;
  cash: number;
  payroll: number;
  wageBudget: number;
  financialStatus: FinancialStatus;
  /** Current league position, or projected position (roster strength) before games are played. */
  position: number;
  positionProjected: boolean;
  leagueSize: number;
  headCoach: string | null;
  headCoachReal: boolean;
  dataNote: string | null;
}

export function financialStatus(world: World, clubId: string): FinancialStatus {
  const c = world.clubs[clubId];
  if (c.cash < 0) return 'in_debt';
  const pay = payroll(world, clubId, world.meta.season) || 1;
  const ratio = c.cash / pay;
  if (ratio > 1.2) return 'wealthy';
  if (ratio > 0.5) return 'healthy';
  if (ratio > 0.2) return 'stable';
  return 'tight';
}

export function clubDirectory(world: World): ClubDirectoryRow[] {
  const positions = new Map<string, { pos: number; projected: boolean; size: number }>();
  for (const league of Object.values(world.leagues)) {
    if (!league.active) continue;
    const st = computeStandings(world, league.id, world.meta.season);
    const played = st.some((r) => r.played > 0);
    const order = played ? st.map((r) => r.clubId) : [...st].sort((a, b) => rosterStrength(world, b.clubId) - rosterStrength(world, a.clubId)).map((r) => r.clubId);
    order.forEach((id, i) => {
      // Position in the club's primary competition only.
      if (world.clubs[id]?.leagueId === league.id) positions.set(id, { pos: i + 1, projected: !played, size: order.length });
    });
  }
  return Object.values(world.clubs).map((c) => {
    const hc = c.id === world.meta.userClubId ? null : headCoach(world, c.id);
    const p = positions.get(c.id) ?? { pos: 0, projected: true, size: 0 };
    const league = world.leagues[c.leagueId];
    return {
      clubId: c.id,
      name: c.name,
      shortName: c.shortName,
      city: c.city,
      country: c.country,
      leagueId: c.leagueId,
      leagueName: league.name,
      competitions: c.competitionIds.map((id) => ({ id, name: world.leagues[id]?.name ?? id })),
      reputation: c.reputation,
      cash: c.cash,
      payroll: payroll(world, c.id, world.meta.season),
      wageBudget: c.wageBudget,
      financialStatus: financialStatus(world, c.id),
      position: p.pos,
      positionProjected: p.projected,
      leagueSize: p.size,
      headCoach: hc ? coachName(hc) : null,
      headCoachReal: !!hc && hc.verification.status !== 'fictional',
      dataNote: league.dataNote ?? null,
    };
  });
}

export interface ClubFilter {
  text?: string;
  country?: string | null;
  leagueId?: string | null;
  competitionId?: string | null;
  minReputation?: number;
  maxReputation?: number;
  financialStatus?: FinancialStatus | null;
  maxPosition?: number | null;
}

export function filterClubs(rows: ClubDirectoryRow[], f: ClubFilter): ClubDirectoryRow[] {
  const text = f.text?.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!text || `${r.name} ${r.city} ${r.shortName}`.toLowerCase().includes(text)) &&
      (!f.country || r.country === f.country) &&
      (!f.leagueId || r.leagueId === f.leagueId) &&
      (!f.competitionId || r.competitions.some((c) => c.id === f.competitionId)) &&
      (f.minReputation === undefined || r.reputation >= f.minReputation) &&
      (f.maxReputation === undefined || r.reputation <= f.maxReputation) &&
      (!f.financialStatus || r.financialStatus === f.financialStatus) &&
      (!f.maxPosition || (r.position > 0 && r.position <= f.maxPosition)),
  );
}

// ---------------------------------------------------------------------------
// Taking and leaving jobs
// ---------------------------------------------------------------------------

/**
 * Appoints the user as head coach of a club. A club's existing head coach is
 * moved to the free-agent market (at game start this is the real coach of the
 * club — the move is recorded on their profile).
 */
export function assignUserToClub(world: World, clubId: string, reason: 'start' | 'job'): void {
  const club = world.clubs[clubId];
  if (!club) throw new Error('Unknown club');
  if (world.meta.userClubId) throw new Error('You already manage a club. Resign first.');
  if (!world.leagues[club.leagueId]?.active) throw new Error('This club does not play in a playable competition.');
  for (const hc of staffInRole(world, clubId, 'head_coach')) {
    for (const h of world.staffHistory) if (h.staffId === hc.id && h.clubId === clubId && h.endSeason === null) { h.endSeason = world.meta.season; h.endReason = 'replaced'; }
    hc.clubId = null;
    hc.marketExcluded = false;
    hc.verification.notes += ` Replaced in-game by the user's appointment at ${club.name} (${world.meta.currentDate}).`;
    addNews(world, 'system', `${coachName(hc)} leaves ${club.shortName}`, `${coachName(hc)} steps aside as head coach of ${club.name} following your appointment and joins the coaching free-agent market.`, { clubId });
  }
  invalidateIndexes(world);
  world.meta.userClubId = clubId;
  club.rotation.auto = club.rotation.auto ?? true;
  world.managerHistory.push({ id: nextId(world, 'mh'), clubId, startSeason: world.meta.season, endSeason: null, wins: 0, losses: 0, titles: 0, endReason: 'active' });
  world.meta.boardConfidence = 60;
  for (const o of world.jobOffers) if (o.status === 'open') o.status = 'expired';
  addNews(world, 'board', `Welcome to ${club.name}`, `${world.meta.managerName} is the new head coach of ${club.name}.${reason === 'start' ? ' Rosters are fictional generated players until an authorized player dataset is imported; clubs and coaches come from the real-world dataset.' : ''}`, { clubId, important: true });
}

function leaveClub(world: World, endReason: 'resigned' | 'fired') {
  const clubId = world.meta.userClubId;
  if (!clubId) return;
  const stint = world.managerHistory.find((m) => m.clubId === clubId && m.endSeason === null);
  if (stint) {
    const rec = clubRecord(world, clubId, world.meta.season);
    stint.wins += rec.wins;
    stint.losses += rec.losses;
    stint.endSeason = world.meta.season;
    stint.endReason = endReason;
  }
  const club = world.clubs[clubId];
  club.rotation.auto = true;
  world.meta.userClubId = '';
  world.meta.boardConfidence = 50;
  invalidateIndexes(world);
}

export function resign(world: World) {
  const club = world.clubs[world.meta.userClubId];
  if (!club) throw new Error('You are not employed.');
  leaveClub(world, 'resigned');
  world.meta.managerReputation = clamp(world.meta.managerReputation - 2, 1, 99);
  addNews(world, 'board', `You resign from ${club.name}`, 'You are now available for head coaching positions. The world simulation continues; check the job market for vacancies.', { important: true });
}

export function dismissUser(world: World, why: string) {
  const club = world.clubs[world.meta.userClubId];
  if (!club) return;
  leaveClub(world, 'fired');
  world.meta.managerReputation = clamp(world.meta.managerReputation - 5, 1, 99);
  addNews(world, 'board', `Dismissed by ${club.name}`, `${why} You are now unemployed — apply for vacancies or wait for offers.`, { important: true });
}

/** Head-coach vacancies the user could apply for. */
export function jobVacancies(world: World) {
  return Object.values(world.clubs)
    .filter((c) => c.id !== world.meta.userClubId && world.leagues[c.leagueId]?.active && !headCoach(world, c.id))
    .map((c) => ({ club: c, interest: clubInterest(world, c.id) }))
    .sort((a, b) => b.club.reputation - a.club.reputation);
}

/** 0..100 chance a club hires the user, from manager vs club reputation. */
export function clubInterest(world: World, clubId: string): number {
  const c = world.clubs[clubId];
  return Math.round(clamp(55 + (world.meta.managerReputation - c.reputation) * 2.5, 3, 95));
}

export function applyForJob(world: World, clubId: string): JobOffer {
  const club = world.clubs[clubId];
  if (!club) throw new Error('Unknown club');
  if (headCoach(world, clubId) || clubId === world.meta.userClubId) throw new Error(`${club.name} has no head-coach vacancy.`);
  const recent = world.jobOffers.find((o) => o.clubId === clubId && o.kind === 'application' && o.date > addDays(world.meta.currentDate, -30));
  if (recent) throw new Error(`You already applied to ${club.name} recently.`);
  const rng = new Rng(combineSeeds(world.meta.seed, 'apply', clubId, world.meta.currentDate));
  const accepted = rng.next() * 100 < clubInterest(world, clubId);
  const app: JobOffer = {
    id: nextId(world, 'job'), clubId, kind: 'application', date: world.meta.currentDate, expires: addDays(world.meta.currentDate, 14),
    status: accepted ? 'open' : 'rejected',
    message: accepted ? `${club.name} would like to appoint you as head coach.` : `${club.name} decided to pursue other candidates.`,
  };
  world.jobOffers.push(app);
  return app;
}

export function respondToOffer(world: World, offerId: string, accept: boolean) {
  const o = world.jobOffers.find((x) => x.id === offerId);
  if (!o || o.status !== 'open') throw new Error('This offer is no longer available.');
  if (!accept) {
    o.status = 'declined';
    return;
  }
  if (headCoach(world, o.clubId)) {
    o.status = 'expired';
    throw new Error(`${world.clubs[o.clubId].name} has filled the position.`);
  }
  if (world.meta.userClubId) leaveClub(world, 'resigned');
  o.status = 'accepted';
  assignUserToClub(world, o.clubId, 'job');
}

/** Monthly: job offers, expiry, and board patience. */
export function monthlyManagerReview(world: World, rng: Rng) {
  const today = world.meta.currentDate;
  for (const o of world.jobOffers) if (o.status === 'open' && o.expires < today) o.status = 'expired';
  // Board patience.
  if (world.meta.userClubId) {
    const rec = clubRecord(world, world.meta.userClubId, world.meta.season);
    if (rec.wins + rec.losses >= 15 && world.meta.boardConfidence < 12) {
      dismissUser(world, `The board has lost confidence after a ${rec.wins}-${rec.losses} record.`);
    }
  }
  // Offers for vacancies that match the user's standing.
  const vacancies = jobVacancies(world).filter((v) => v.interest >= 55);
  for (const v of vacancies.slice(0, 3)) {
    if (world.jobOffers.some((o) => o.clubId === v.club.id && o.status === 'open')) continue;
    const chance = world.meta.userClubId ? 0.15 : 0.45;
    if (!rng.chance(chance)) continue;
    world.jobOffers.push({ id: nextId(world, 'job'), clubId: v.club.id, kind: 'offer', date: today, expires: addDays(today, 14), status: 'open', message: `${v.club.name} want you as their new head coach.` });
    addNews(world, 'board', `Job offer from ${v.club.name}`, `${v.club.name} (${world.leagues[v.club.leagueId].name}) have offered you their head-coach position. The offer expires in 14 days.`, { clubId: v.club.id, important: true });
  }
}

/** Season end: reputation follows results; a very poor season can cost the job. */
export function seasonEndManagerReview(world: World) {
  const clubId = world.meta.userClubId;
  if (!clubId) return;
  const rec = clubRecord(world, clubId, world.meta.season);
  const games = rec.wins + rec.losses;
  if (games === 0) return;
  const pct = rec.wins / games;
  const titles = world.seasonSummaries.filter((s) => s.season === world.meta.season && s.championId === clubId).length;
  const club = world.clubs[clubId];
  world.meta.managerReputation = clamp(Math.round(world.meta.managerReputation + (pct - 0.5) * 16 + titles * 8 + (club.reputation - world.meta.managerReputation) * 0.05), 1, 99);
  if (world.meta.boardConfidence < 30 && titles === 0) dismissUser(world, 'The board has decided to make a change after a disappointing season.');
}

export { openStint };
