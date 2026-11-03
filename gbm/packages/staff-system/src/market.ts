import type { Club, Rng, Staff, StaffCareerEntry, StaffNegotiation, StaffRole, World } from '@gbm/shared-types';
import { STAFF_ROLES, addDays, ageOn, cachedIndex, clamp, invalidateIndexes, nextId } from '@gbm/shared-types';
import { playerOverall } from '@gbm/player-system';
import { recordTransaction, staffPayroll } from '@gbm/finance-system';
import { ROLE_LABEL, ROLE_RANK, ROLE_SLOTS, coachAgeForLogic, coachName, coachRoleRating, expectedSalary } from './coaches';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Staff employed by a club (indexed; see invalidateIndexes). */
export function clubStaff(world: World, clubId: string): Staff[] {
  const idx = cachedIndex(world, 'staff', () => {
    const m = new Map<string, Staff[]>();
    for (const s of Object.values(world.staff)) {
      if (!s.clubId || s.retired) continue;
      (m.get(s.clubId) ?? m.set(s.clubId, []).get(s.clubId)!).push(s);
    }
    return m;
  });
  return [...(idx.get(clubId) ?? [])];
}

export function staffInRole(world: World, clubId: string, role: StaffRole): Staff[] {
  return clubStaff(world, clubId).filter((s) => s.role === role);
}

/** The user, represented as the head coach of their club (not stored in world.staff). */
export function userAsCoach(world: World): Staff {
  const m = world.meta;
  return {
    id: '__user__', clubId: m.userClubId || null, firstName: m.managerName, lastName: '', nationality: '', birthDate: null,
    role: 'head_coach', attributes: m.managerAttributes, personality: 'ambitious', philosophy: 'balanced', ambition: 'win_titles',
    preferredRoles: ['head_coach'], reputation: m.managerReputation, experienceYears: 0, salary: 0, contractStartSeason: m.season,
    contractEndSeason: m.season, morale: 100, retired: false, source: 'imported', sourceRef: null,
    verification: { status: 'reported', sources: [], verifiedOn: null, missingFields: [], notes: 'You' }, marketExcluded: true,
  };
}

/** Head coach of a club; for the user's club this is the user. */
export function headCoach(world: World, clubId: string): Staff | null {
  if (clubId && clubId === world.meta.userClubId) return userAsCoach(world);
  return staffInRole(world, clubId, 'head_coach')[0] ?? null;
}

/** True when a post is empty because real-world data is missing for it. */
export function isDataGapPost(world: World, clubId: string, role: StaffRole): boolean {
  for (const d of Object.values(world.dataIssues)) {
    if (d.status === 'open' && d.entityId === clubId && d.field === `staff:${role}`) return true;
  }
  return false;
}

/** Open seats on a club's staff. */
export function openSlots(world: World, clubId: string): StaffRole[] {
  const out: StaffRole[] = [];
  for (const role of STAFF_ROLES) {
    if (role === 'head_coach' && clubId === world.meta.userClubId) continue;
    const free = ROLE_SLOTS[role] - staffInRole(world, clubId, role).length;
    for (let i = 0; i < free; i++) out.push(role);
  }
  return out;
}

export function leagueSalaryMax(world: World, clubId: string): number {
  const club = world.clubs[clubId];
  return world.leagues[club.leagueId]?.salaryScale.max ?? 3_000_000;
}

/** Season record of a club (all competitions in the current season). */
export function clubRecord(world: World, clubId: string, season: number): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;
  for (const m of Object.values(world.matches)) {
    if (m.season !== season) continue;
    if (m.homeId !== clubId && m.awayId !== clubId) continue;
    const won = m.homeId === clubId ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
    if (won) wins++;
    else losses++;
  }
  return { wins, losses };
}

const strengthCache = new WeakMap<World, { date: string; map: Map<string, number> }>();

/** Average overall of a club's top eight players (cached per game day). */
export function rosterStrength(world: World, clubId: string): number {
  let c = strengthCache.get(world);
  if (!c || c.date !== world.meta.currentDate) {
    c = { date: world.meta.currentDate, map: new Map() };
    const by = new Map<string, number[]>();
    for (const p of Object.values(world.players)) {
      if (!p.clubId || p.retired) continue;
      (by.get(p.clubId) ?? by.set(p.clubId, []).get(p.clubId)!).push(playerOverall(p));
    }
    for (const [id, list] of by) {
      const top = list.sort((a, b) => b - a).slice(0, 8);
      c.map.set(id, top.reduce((a, b) => a + b, 0) / top.length);
    }
    strengthCache.set(world, c);
  }
  return c.map.get(clubId) ?? 0;
}

function leagueStrengthRank(world: World, clubId: string): { rank: number; size: number } {
  const club = world.clubs[clubId];
  const peers = Object.values(world.clubs)
    .filter((c) => c.leagueId === club.leagueId)
    .map((c) => ({ id: c.id, s: rosterStrength(world, c.id) }))
    .sort((a, b) => b.s - a.s);
  return { rank: peers.findIndex((p) => p.id === clubId) + 1, size: peers.length };
}

// ---------------------------------------------------------------------------
// Staff effects on the club
// ---------------------------------------------------------------------------

export interface StaffEffects {
  /** 1..100 ratings consumed by the simulation, development and scouting. */
  offense: number;
  defense: number;
  development: number;
  shooting: number;
  training: number;
  gameManagement: number;
  scouting: number;
  chemistry: number;
}

/** Rating used only when a club has no coaching staff at all. */
const NO_STAFF = 35;

/**
 * Club coaching effects. Missing specialists are covered by the head coach
 * (at 90% effectiveness) and assistants, as happens at real clubs.
 */
export function staffEffects(world: World, clubId: string): StaffEffects {
  const hc = headCoach(world, clubId);
  const one = (role: StaffRole) => staffInRole(world, clubId, role)[0] ?? null;
  const assistants = staffInRole(world, clubId, 'assistant_coach');
  const all = clubStaff(world, clubId);
  type K = keyof Staff['attributes'];
  const lead = (k: K): number => {
    if (hc) return hc.attributes[k];
    if (all.length) return Math.max(...all.map((s) => s.attributes[k])) * 0.9;
    return NO_STAFF;
  };
  const spec = (role: StaffRole, k: K): number => {
    const s = one(role);
    if (s) return s.attributes[k];
    const asst = assistants.length ? Math.max(...assistants.map((a) => a.attributes[k])) : 0;
    return Math.max(lead(k) * 0.9, asst * 0.95);
  };
  const asstAvg = (k: K) => (assistants.length ? assistants.reduce((s, x) => s + x.attributes[k], 0) / assistants.length : lead(k) * 0.9);
  const avgAll = (k: K) => (all.length ? all.reduce((s, x) => s + x.attributes[k], 0) / all.length : NO_STAFF);
  const depth = 0.88 + Math.min(all.length, 7) * 0.02;
  return {
    offense: Math.round(lead('offense') * 0.45 + spec('offensive_coordinator', 'offense') * 0.4 + asstAvg('offense') * 0.15),
    defense: Math.round(lead('defense') * 0.45 + spec('defensive_coordinator', 'defense') * 0.4 + asstAvg('defense') * 0.15),
    development: Math.round(lead('playerDevelopment') * 0.25 + spec('player_development', 'playerDevelopment') * 0.55 + asstAvg('playerDevelopment') * 0.2),
    shooting: Math.round(spec('shooting_coach', 'shooting') * 0.7 + lead('shooting') * 0.15 + asstAvg('shooting') * 0.15),
    training: Math.round(avgAll('training') * depth),
    gameManagement: Math.round(lead('gameManagement') * 0.8 + asstAvg('gameManagement') * 0.2),
    scouting: Math.round(Math.max(NO_STAFF, ...all.map((s) => s.attributes.scouting)) * 0.7 + avgAll('scouting') * 0.3),
    chemistry: Math.round(lead('chemistry') * 0.6 + asstAvg('chemistry') * 0.25 + avgAll('motivation') * 0.15),
  };
}

// ---------------------------------------------------------------------------
// Willingness to join
// ---------------------------------------------------------------------------

export interface StaffOffer {
  role: StaffRole;
  salary: number;
  years: number;
}

export interface WillingnessFactor {
  key: 'salary' | 'role' | 'reputation' | 'head_coach' | 'ambition' | 'opportunity' | 'relationship' | 'contract' | 'employment' | 'competition' | 'morale';
  label: string;
  value: number;
}

export interface Willingness {
  score: number;
  factors: WillingnessFactor[];
  expectedSalary: number;
  bestCompetingOffer: StaffNegotiation | null;
}

/**
 * How willing a coach is to accept an offer from a club (0..100).
 * Every factor is reported so the UI can explain the decision.
 */
export function willingness(world: World, staffId: string, clubId: string, offer: StaffOffer, opts: { ignoreCompetition?: boolean; kind?: 'hire' | 'renewal' | 'promotion' } = {}): Willingness {
  const s = world.staff[staffId];
  const club = world.clubs[clubId];
  const kind = opts.kind ?? 'hire';
  const factors: WillingnessFactor[] = [];
  const add = (key: WillingnessFactor['key'], label: string, value: number) => {
    if (Math.abs(value) >= 0.5) factors.push({ key, label, value: Math.round(value) });
  };
  const expected = expectedSalary(s, offer.role, leagueSalaryMax(world, clubId));

  // Salary relative to expectation.
  const salaryRatio = offer.salary / Math.max(1, expected);
  let salaryScore = clamp((salaryRatio - 1) * 70, -45, 22);
  if (s.ambition === 'money' || s.personality === 'mercenary') salaryScore *= 1.5;
  add('salary', salaryRatio >= 1 ? 'Salary meets expectations' : 'Salary below expectations', salaryScore);

  // Role fit.
  const preferredIdx = s.preferredRoles.indexOf(offer.role);
  if (preferredIdx === 0) add('role', `${ROLE_LABEL[offer.role]} is the preferred role`, 12);
  else if (preferredIdx > 0) add('role', `${ROLE_LABEL[offer.role]} is an acceptable role`, 5);
  else add('role', `Not interested in being ${ROLE_LABEL[offer.role]}`, -14);
  const currentRank = s.clubId ? ROLE_RANK[s.role] : ROLE_RANK[s.role] - 0.5;
  const rankDelta = ROLE_RANK[offer.role] - currentRank;
  if (kind !== 'renewal') {
    if (rankDelta > 0) add('role', 'A step up in seniority', rankDelta * 9);
    else if (rankDelta < 0 && s.clubId) add('role', 'Would be a demotion', rankDelta * 14);
  }

  // Club reputation relative to the coach.
  add('reputation', club.reputation >= s.reputation ? 'Prestigious club' : 'Club below their stature', clamp((club.reputation - s.reputation) * 0.35, -18, 14));

  // Head coach reputation matters to assistants and coordinators.
  const hc = headCoach(world, clubId);
  if (offer.role !== 'head_coach' && hc && hc.id !== s.id) {
    add('head_coach', `Working under ${coachName(hc)}`, clamp((hc.reputation - 55) * 0.25, -8, 10));
  }

  // Ambitions vs club situation.
  const { rank, size } = leagueStrengthRank(world, clubId);
  const contender = size > 0 ? 1 - (rank - 1) / Math.max(1, size - 1) : 0.5; // 1 = best roster
  if (s.ambition === 'win_titles') add('ambition', contender > 0.6 ? 'Club can contend for titles' : 'Club is not a contender', (contender - 0.5) * 28);
  else add('ambition', 'Team competitiveness', (contender - 0.5) * 8);
  if (s.ambition === 'develop_players') {
    const young = Object.values(world.players).filter((p) => p.clubId === clubId && ageOn(p.birthDate, world.meta.currentDate) <= 23).length;
    add('ambition', 'Young roster to develop', clamp((young - 3) * 3, -6, 12));
  }

  // Career opportunity.
  if (s.ambition === 'become_head_coach') {
    if (offer.role === 'head_coach') add('opportunity', 'Their first chance at a head coaching job', 18);
    else if (hc && coachAgeForLogic(hc, world.meta.currentDate) >= 62) add('opportunity', 'Head coach nearing retirement — succession path', 6);
    else if (offer.role === 'assistant_coach' || offer.role === 'shooting_coach') add('opportunity', 'Little path to a head coaching job', -6);
  }

  // Relationships through shared history.
  const myStints = world.staffHistory.filter((h) => h.staffId === s.id);
  const pastHere = myStints.filter((h) => h.clubId === clubId && h.endSeason !== null);
  if (pastHere.some((h) => h.endReason === 'fired')) add('relationship', 'Was fired by this club before', -20);
  else if (pastHere.length > 0 && kind === 'hire') add('relationship', 'Former club — fond memories', 6);
  if (hc && hc.id !== s.id) {
    const hcStints = world.staffHistory.filter((h) => h.staffId === hc.id);
    const workedTogether = myStints.some((m) =>
      hcStints.some((h) => h.clubId === m.clubId && overlaps(h.startSeason, h.endSeason, m.startSeason, m.endSeason)),
    );
    if (workedTogether) add('relationship', `Worked with ${coachName(hc)} before`, 12);
    if (hc.nationality === s.nationality) add('relationship', 'Shares a background with the head coach', 3);
  }

  // Contract length preferences.
  if (s.ambition === 'stability' || s.personality === 'loyal') add('contract', offer.years >= 3 ? 'Long-term security' : 'Wants a longer contract', offer.years >= 3 ? 8 : -12);
  else if (offer.years >= 2) add('contract', 'Reasonable contract length', 3);
  if (coachAgeForLogic(s, world.meta.currentDate) >= 60 && offer.years >= 4) add('contract', 'Prefers a shorter final contract', -5);

  // Already employed elsewhere.
  if (s.clubId && s.clubId !== clubId && kind === 'hire') {
    const loyalty = s.personality === 'loyal' ? -14 : s.personality === 'mercenary' ? -2 : -8;
    add('employment', `Under contract with ${world.clubs[s.clubId]?.shortName ?? 'another club'}`, rankDelta > 0 ? loyalty / 2 : loyalty);
  }
  if (kind === 'renewal' || kind === 'promotion') add('morale', s.morale >= 50 ? 'Happy at the club' : 'Unhappy at the club', (s.morale - 50) * 0.3);

  let score = 50 + factors.reduce((a, f) => a + f.value, 0);

  // Competing offers already on the table.
  let best: StaffNegotiation | null = null;
  if (!opts.ignoreCompetition) {
    let bestScore = 0;
    for (const n of Object.values(world.staffNegotiations)) {
      if (n.staffId !== s.id || n.status !== 'open' || n.clubId === clubId || n.response === 'rejected') continue;
      const w = willingness(world, s.id, n.clubId, { role: n.role, salary: n.salary, years: n.years }, { ignoreCompetition: true }).score;
      if (w > bestScore) {
        bestScore = w;
        best = n;
      }
    }
    if (best && bestScore > score - 5) {
      const v = -clamp((bestScore - score + 5) * 0.6, 0, 20);
      factors.push({ key: 'competition', label: `Competing offer from ${world.clubs[best.clubId]?.shortName}`, value: Math.round(v) });
      score += v;
    }
  }
  return { score: clamp(Math.round(score), 0, 100), factors, expectedSalary: expected, bestCompetingOffer: best };
}

function overlaps(a1: number, a2: number | null, b1: number, b2: number | null): boolean {
  return a1 <= (b2 ?? 9999) && b1 <= (a2 ?? 9999);
}

// ---------------------------------------------------------------------------
// Validation and execution
// ---------------------------------------------------------------------------

export interface StaffValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Compensation owed to a coach's current club when hiring them away. */
export function poachingCompensation(world: World, staffId: string, hiringClubId: string): number {
  const s = world.staff[staffId];
  if (!s.clubId || s.clubId === hiringClubId) return 0;
  const yearsLeft = Math.max(0, s.contractEndSeason - world.meta.season);
  return Math.round((s.salary * (0.5 + yearsLeft * 0.5)) / 5_000) * 5_000;
}

export function validateStaffHire(world: World, clubId: string, staffId: string, offer: StaffOffer, kind: 'hire' | 'renewal' | 'promotion'): StaffValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = world.staff[staffId];
  const club = world.clubs[clubId];
  if (!s || s.retired) return { ok: false, errors: ['Coach not available.'], warnings };
  if (!Number.isInteger(offer.years) || offer.years < 1 || offer.years > 5) errors.push('Contract length must be 1–5 years.');
  if (!Number.isFinite(offer.salary) || offer.salary <= 0) errors.push('Salary must be positive.');
  if (clubId === world.meta.userClubId && offer.role === 'head_coach') errors.push('You are the head coach of this club.');
  if (kind === 'hire') {
    if (s.clubId === clubId) errors.push('Coach already works for this club.');
    if (staffInRole(world, clubId, offer.role).length >= ROLE_SLOTS[offer.role]) {
      errors.push(`No vacancy for ${ROLE_LABEL[offer.role]}. Release or reassign a coach first.`);
    }
  } else if (s.clubId !== clubId) errors.push('Coach does not work for this club.');
  if (kind === 'promotion' && offer.role !== s.role) {
    const occupied = staffInRole(world, clubId, offer.role).filter((x) => x.id !== s.id).length;
    if (occupied >= ROLE_SLOTS[offer.role]) errors.push(`The ${ROLE_LABEL[offer.role]} position is filled.`);
  }
  const currentSalary = s.clubId === clubId ? s.salary : 0;
  const after = staffPayroll(world, clubId) - currentSalary + offer.salary;
  if (after > club.staffBudget) errors.push(`Exceeds the staff budget (${money(after)} > ${money(club.staffBudget)}).`);
  const compensation = kind === 'hire' ? poachingCompensation(world, staffId, clubId) : 0;
  if (compensation > 0) {
    if (club.cash < compensation) errors.push(`Not enough cash for the ${money(compensation)} compensation to ${world.clubs[s.clubId!]?.shortName}.`);
    else warnings.push(`Requires ${money(compensation)} compensation to ${world.clubs[s.clubId!]?.shortName}.`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

function money(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

function closeStint(world: World, staffId: string, clubId: string, reason: StaffCareerEntry['endReason']) {
  for (const h of world.staffHistory) {
    if (h.staffId === staffId && h.clubId === clubId && h.endSeason === null) {
      h.endSeason = world.meta.season;
      h.endReason = reason;
      const rec = clubRecord(world, clubId, world.meta.season);
      h.wins += rec.wins;
      h.losses += rec.losses;
    }
  }
}

export function openStint(world: World, staffId: string, clubId: string, role: StaffRole) {
  world.staffHistory.push({
    id: nextId(world, 'sh'),
    staffId,
    clubId,
    role,
    startSeason: world.meta.season,
    endSeason: null,
    wins: 0,
    losses: 0,
    titles: 0,
    endReason: 'active',
  });
}

/** Executes a hire. Throws if illegal. Returns the compensation paid. */
export function hireStaff(world: World, clubId: string, staffId: string, offer: StaffOffer): number {
  const v = validateStaffHire(world, clubId, staffId, offer, 'hire');
  if (!v.ok) throw new Error(v.errors.join(' '));
  const s = world.staff[staffId];
  const compensation = poachingCompensation(world, staffId, clubId);
  if (s.clubId) {
    if (compensation > 0) {
      recordTransaction(world, clubId, 'staff', -compensation, `Compensation for ${coachName(s)} to ${world.clubs[s.clubId].shortName}`);
      recordTransaction(world, s.clubId, 'staff', compensation, `Compensation received for ${coachName(s)}`);
    }
    closeStint(world, staffId, s.clubId, 'poached');
  }
  s.clubId = clubId;
  invalidateIndexes(world);
  s.role = offer.role;
  s.salary = Math.round(offer.salary);
  s.contractStartSeason = world.meta.season;
  s.contractEndSeason = world.meta.season + offer.years - (world.meta.phase === 'offseason' ? 0 : 1);
  s.morale = clamp(s.morale + 10, 0, 100);
  openStint(world, staffId, clubId, offer.role);
  cancelOtherOffers(world, staffId);
  return compensation;
}

function cancelOtherOffers(world: World, staffId: string) {
  for (const n of Object.values(world.staffNegotiations)) {
    if (n.staffId === staffId && n.status === 'open') {
      n.status = 'expired';
      n.response = 'signed_elsewhere';
      n.message = 'Signed with another club.';
    }
  }
}

/** Remaining salary owed when terminating a coach's contract. */
export function terminationCost(world: World, staffId: string): number {
  const s = world.staff[staffId];
  const month = Number(world.meta.currentDate.slice(5, 7));
  const monthsLeftThisSeason = month >= 7 ? 12 - (month - 7) : 6 - month + 1;
  const futureSeasons = Math.max(0, s.contractEndSeason - world.meta.season);
  return Math.round((s.salary * (futureSeasons + monthsLeftThisSeason / 12)) / 5_000) * 5_000;
}

export function validateTermination(world: World, clubId: string, staffId: string): StaffValidation {
  const s = world.staff[staffId];
  const errors: string[] = [];
  if (!s || s.clubId !== clubId) errors.push('Coach does not work for this club.');
  else if (world.clubs[clubId].cash < terminationCost(world, staffId)) errors.push(`Not enough cash to pay out the contract (${money(terminationCost(world, staffId))}).`);
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function terminateStaff(world: World, clubId: string, staffId: string): number {
  const v = validateTermination(world, clubId, staffId);
  if (!v.ok) throw new Error(v.errors.join(' '));
  const s = world.staff[staffId];
  const cost = terminationCost(world, staffId);
  if (cost > 0) recordTransaction(world, clubId, 'staff', -cost, `Contract termination: ${coachName(s)}`);
  closeStint(world, staffId, clubId, 'fired');
  s.clubId = null;
  invalidateIndexes(world);
  s.reputation = clamp(s.reputation - (s.role === 'head_coach' ? 4 : 2), 1, 99);
  s.morale = 40;
  return cost;
}

/** Promotes or demotes a coach to another role at the same club. */
export function changeStaffRole(world: World, clubId: string, staffId: string, newRole: StaffRole, newSalary?: number): { promoted: boolean } {
  const s = world.staff[staffId];
  const salary = newSalary ?? s.salary;
  const v = validateStaffHire(world, clubId, staffId, { role: newRole, salary, years: 1 }, 'promotion');
  if (!v.ok) throw new Error(v.errors.join(' '));
  if (newRole === s.role) throw new Error('Coach already holds that role.');
  const promoted = ROLE_RANK[newRole] >= ROLE_RANK[s.role];
  closeStint(world, staffId, clubId, promoted ? 'promoted' : 'demoted');
  s.role = newRole;
  s.salary = salary;
  if (promoted) {
    s.morale = clamp(s.morale + 15, 0, 100);
  } else {
    s.morale = clamp(s.morale - 30, 0, 100);
    s.reputation = clamp(s.reputation - 2, 1, 99);
  }
  openStint(world, staffId, clubId, newRole);
  return { promoted };
}

// ---------------------------------------------------------------------------
// Negotiation
// ---------------------------------------------------------------------------

const ACCEPT_THRESHOLD = 60;
const MAX_ROUNDS = 3;

export interface StaffNegotiationResult {
  negotiation: StaffNegotiation;
  willingness: Willingness;
  hired: boolean;
}

/**
 * The user's (or an AI club's immediate) offer to a coach. The coach either
 * accepts, counters on salary, asks for a different role, demands a longer
 * contract, rejects outright, or takes a better competing offer.
 */
export function offerToStaff(world: World, clubId: string, staffId: string, offer: StaffOffer, kind: 'hire' | 'renewal' = 'hire'): StaffNegotiationResult {
  const s = world.staff[staffId];
  const key = `${kind}:${clubId}:${staffId}`;
  const today = world.meta.currentDate;
  let n = world.staffNegotiations[key];
  if (n && n.status === 'rejected' && n.decisionDate > today) {
    return { negotiation: n, willingness: willingness(world, staffId, clubId, offer, { kind }), hired: false };
  }
  if (!n || n.status !== 'open') {
    n = {
      id: key, staffId, clubId, kind, role: offer.role, salary: offer.salary, years: offer.years, rounds: 0, status: 'open',
      response: 'pending', counterSalary: null, counterRole: null, counterYears: null, willingness: 0, message: '',
      createdDate: today, decisionDate: addDays(today, 7), compensation: 0,
    };
    world.staffNegotiations[key] = n;
  }
  const v = validateStaffHire(world, clubId, staffId, offer, kind);
  if (!v.ok) throw new Error(v.errors.join(' '));
  n.rounds++;
  n.role = offer.role;
  n.salary = offer.salary;
  n.years = offer.years;
  n.compensation = kind === 'hire' ? poachingCompensation(world, staffId, clubId) : 0;
  const w = willingness(world, staffId, clubId, offer, { kind });
  n.willingness = w.score;
  n.counterSalary = n.counterRole = n.counterYears = null;
  const name = coachName(s);

  // A rival offer the coach likes more wins immediately.
  if (w.bestCompetingOffer) {
    const rival = w.bestCompetingOffer;
    const rivalScore = willingness(world, staffId, rival.clubId, rival, { ignoreCompetition: true }).score;
    if (rivalScore >= ACCEPT_THRESHOLD && rivalScore > w.score + 3) {
      const rv = validateStaffHire(world, rival.clubId, staffId, rival, 'hire');
      if (rv.ok) {
        hireStaff(world, rival.clubId, staffId, rival);
        rival.status = 'accepted';
        rival.response = 'accepted';
        n.status = 'rejected';
        n.response = 'signed_elsewhere';
        n.message = `${name} accepted a competing offer from ${world.clubs[rival.clubId].name}.`;
        return { negotiation: n, willingness: w, hired: false };
      }
    }
  }

  if (w.score >= ACCEPT_THRESHOLD) {
    if (kind === 'hire') hireStaff(world, clubId, staffId, offer);
    else renewStaff(world, clubId, staffId, offer);
    n.status = 'accepted';
    n.response = 'accepted';
    n.message = `${name} accepts the offer to become ${ROLE_LABEL[offer.role]}.`;
    return { negotiation: n, willingness: w, hired: true };
  }

  if (n.rounds >= MAX_ROUNDS || w.score < 25) {
    n.status = 'rejected';
    n.response = 'rejected';
    n.decisionDate = addDays(today, 30);
    n.message = w.score < 25 ? `${name} has no interest in this offer.` : `${name} has ended talks after ${n.rounds} rounds.`;
    return { negotiation: n, willingness: w, hired: false };
  }

  // Counter on the most negative factor.
  const worst = [...w.factors].sort((a, b) => a.value - b.value)[0];
  if (worst?.key === 'role' && s.preferredRoles[0] !== offer.role) {
    const wanted = s.preferredRoles.find((r) => r !== offer.role && staffInRole(world, clubId, r).length < ROLE_SLOTS[r]) ?? s.preferredRoles[0];
    n.response = 'request_role';
    n.counterRole = wanted;
    n.message = `${name} would rather join as ${ROLE_LABEL[wanted]}.`;
  } else if (worst?.key === 'contract') {
    n.response = 'demand_years';
    n.counterYears = Math.min(5, Math.max(3, offer.years + 1));
    n.message = `${name} wants a ${n.counterYears}-year contract.`;
  } else {
    // Salary needed to reach the acceptance threshold.
    const gap = ACCEPT_THRESHOLD - w.score;
    const mult = s.ambition === 'money' || s.personality === 'mercenary' ? 1.5 : 1;
    const needed = offer.salary * (1 + gap / (70 * mult)) * 1.02;
    n.response = 'counter_salary';
    n.counterSalary = Math.round(needed / 5_000) * 5_000;
    n.message = `${name} asks for ${money(n.counterSalary)} per year.`;
  }
  n.message += ` (${MAX_ROUNDS - n.rounds} round${MAX_ROUNDS - n.rounds === 1 ? '' : 's'} left)`;
  return { negotiation: n, willingness: w, hired: false };
}

export function renewStaff(world: World, clubId: string, staffId: string, offer: StaffOffer) {
  const s = world.staff[staffId];
  const v = validateStaffHire(world, clubId, staffId, offer, 'renewal');
  if (!v.ok) throw new Error(v.errors.join(' '));
  s.salary = Math.round(offer.salary);
  s.contractEndSeason = Math.max(s.contractEndSeason, world.meta.season) + offer.years;
  s.morale = clamp(s.morale + 8, 0, 100);
}

// ---------------------------------------------------------------------------
// Market search
// ---------------------------------------------------------------------------

export interface CoachSearchFilter {
  text?: string;
  role?: StaffRole | null;
  availability?: 'all' | 'free' | 'employed';
  leagueId?: string | null;
  minRating?: number;
  maxSalary?: number | null;
}

export function searchCoaches(world: World, f: CoachSearchFilter, excludeClubId?: string): Staff[] {
  const text = f.text?.trim().toLowerCase();
  return Object.values(world.staff)
    .filter((s) => {
      if (s.retired || s.marketExcluded) return false;
      if (excludeClubId && s.clubId === excludeClubId) return false;
      if (f.availability === 'free' && s.clubId) return false;
      if (f.availability === 'employed' && !s.clubId) return false;
      if (f.leagueId && (!s.clubId || world.clubs[s.clubId]?.leagueId !== f.leagueId)) return false;
      if (f.role && !s.preferredRoles.includes(f.role) && s.role !== f.role) return false;
      if (f.minRating && coachRoleRating(s.attributes, f.role ?? s.role) < f.minRating) return false;
      if (f.maxSalary && s.salary > f.maxSalary) return false;
      if (text && !`${s.firstName} ${s.lastName} ${s.nationality}`.toLowerCase().includes(text)) return false;
      return true;
    })
    .sort((a, b) => coachRoleRating(b.attributes, f.role ?? b.role) - coachRoleRating(a.attributes, f.role ?? a.role));
}

// ---------------------------------------------------------------------------
// AI behaviour and the evolving market
// ---------------------------------------------------------------------------

export interface StaffNews {
  title: string;
  body: string;
  clubId: string | null;
  important: boolean;
}

/** AI clubs make offers for vacancies. Run every few days. */
export function aiStaffMarketTick(world: World, rng: Rng, userClubId: string, generate?: (role: StaffRole, leagueId: string) => Staff): StaffNews[] {
  const news: StaffNews[] = [];
  const today = world.meta.currentDate;
  const openOffers = new Set<string>();
  for (const n of Object.values(world.staffNegotiations)) if (n.status === 'open') openOffers.add(`${n.clubId}:${n.role}`);
  for (const club of Object.values(world.clubs)) {
    if (club.id === userClubId) continue;
    for (const role of new Set(openSlots(world, club.id))) {
      if (openOffers.has(`${club.id}:${role}`)) continue;
      if (!rng.chance(role === 'head_coach' ? 0.9 : 0.35)) continue;
      let candidate = aiPickCandidate(world, club, role, rng);
      if (!candidate && role === 'head_coach' && generate && world.meta.fictionalCoachPolicy === 'when_needed' && world.leagues[club.leagueId]?.active) {
        // Absolutely necessary: a playable club has no head coach and no real coach is available.
        const coach = generate(role, club.leagueId);
        world.staff[coach.id] = coach;
        candidate = coach;
      }
      if (!candidate) continue;
      const expected = expectedSalary(candidate, role, leagueSalaryMax(world, club.id));
      const generosity = club.aiPersonality === 'financial_conservative' ? 0.92 : club.aiPersonality === 'win_now' || club.aiPersonality === 'superstar_collector' ? 1.12 : 1.02;
      const salary = Math.round((expected * generosity * rng.range(0.95, 1.08)) / 5_000) * 5_000;
      const offer = { role, salary, years: role === 'head_coach' ? rng.int(2, 4) : rng.int(1, 3) };
      if (!validateStaffHire(world, club.id, candidate.id, offer, 'hire').ok) continue;
      const key = `hire:${club.id}:${candidate.id}`;
      world.staffNegotiations[key] = {
        id: key, staffId: candidate.id, clubId: club.id, kind: 'hire', role, salary: offer.salary, years: offer.years, rounds: 1,
        status: 'open', response: 'pending', counterSalary: null, counterRole: null, counterYears: null, willingness: 0,
        message: `${club.name} offered ${coachName(candidate)} the ${ROLE_LABEL[role]} job.`, createdDate: today,
        decisionDate: addDays(today, rng.int(3, 8)), compensation: poachingCompensation(world, candidate.id, club.id),
      };
    }
  }
  // Coaches decide on offers whose decision date has arrived.
  const byStaff = new Map<string, StaffNegotiation[]>();
  for (const n of Object.values(world.staffNegotiations)) {
    if (n.status !== 'open' || n.clubId === userClubId) continue;
    if (n.decisionDate > today) continue;
    (byStaff.get(n.staffId) ?? byStaff.set(n.staffId, []).get(n.staffId)!).push(n);
  }
  for (const [staffId, offers] of byStaff) {
    const scored = offers
      .map((n) => ({ n, w: willingness(world, staffId, n.clubId, n, { ignoreCompetition: true }).score }))
      .sort((a, b) => b.w - a.w);
    const best = scored[0];
    if (best && best.w >= ACCEPT_THRESHOLD - 5 && validateStaffHire(world, best.n.clubId, staffId, best.n, 'hire').ok) {
      const s = world.staff[staffId];
      const from = s.clubId ? world.clubs[s.clubId] : null;
      hireStaff(world, best.n.clubId, staffId, best.n);
      best.n.status = 'accepted';
      best.n.response = 'accepted';
      const club = world.clubs[best.n.clubId];
      news.push({
        title: `${club.shortName} hire ${coachName(s)}`,
        body: `${club.name} appoint ${coachName(s)} as ${ROLE_LABEL[best.n.role]}${from ? `, leaving ${from.name}` : ''}.`,
        clubId: club.id,
        important: from?.id === userClubId,
      });
      if (from && from.id === userClubId) {
        news[news.length - 1].body += ' A vacancy has opened on your staff.';
      }
    } else {
      for (const x of scored) {
        x.n.status = 'rejected';
        x.n.response = 'rejected';
      }
    }
  }
  return news;
}

export function aiPickCandidate(world: World, club: Club, role: StaffRole, rng: Rng, filter?: (s: Staff) => boolean): Staff | null {
  const budgetLeft = club.staffBudget - staffPayroll(world, club.id);
  const salaryMax = leagueSalaryMax(world, club.id);
  const candidates = Object.values(world.staff).filter((s) => {
    if (s.retired || s.marketExcluded || s.clubId === club.id) return false;
    if (filter && !filter(s)) return false;
    if (s.clubId && ROLE_RANK[role] <= ROLE_RANK[s.role]) return false; // only poach for promotions
    if (s.clubId && world.clubs[s.clubId] && world.clubs[s.clubId].cash < 0) return false;
    if (expectedSalary(s, role, salaryMax) > budgetLeft) return false;
    return true;
  });
  if (!candidates.length) return null;
  // Real coaches are the primary population; fictional ones are a last resort.
  const real = candidates.filter((s) => s.verification.status !== 'fictional');
  // Fictional coaches are only ever considered for head-coach vacancies.
  const pool = real.length ? real : world.meta.fictionalCoachPolicy === 'never' || role !== 'head_coach' ? [] : candidates;
  if (!pool.length) return null;
  const prefers = (s: Staff) => {
    let v = coachRoleRating(s.attributes, role) + s.reputation * 0.2;
    if (club.aiPersonality === 'defensive_specialist') v += s.attributes.defense * 0.15;
    if (club.aiPersonality === 'youth_development' || club.aiPersonality === 'rebuilding') v += s.attributes.playerDevelopment * 0.15;
    if (s.clubId) v -= 6; // poaching costs compensation
    return v + rng.normal(0, 3);
  };
  return pool.sort((a, b) => prefers(b) - prefers(a))[0] ?? null;
}

/**
 * Monthly AI staff management: fire under-performing head coaches, promote
 * from within, and let unhappy coaches resign.
 */
export function aiMonthlyStaffReview(world: World, rng: Rng, userClubId: string): StaffNews[] {
  const news: StaffNews[] = [];
  const season = world.meta.season;
  for (const club of Object.values(world.clubs)) {
    const staff = clubStaff(world, club.id);
    // Unhappy coaches may resign (user's club too).
    for (const s of staff) {
      if (s.morale < 20 && rng.chance(0.35)) {
        closeStint(world, s.id, club.id, 'resigned');
        s.clubId = null;
        invalidateIndexes(world);
        news.push({ title: `${coachName(s)} resigns`, body: `${coachName(s)} has resigned as ${ROLE_LABEL[s.role]} of ${club.name}.`, clubId: club.id, important: club.id === userClubId });
      }
    }
    if (club.id === userClubId || world.meta.phase !== 'regular') continue;
    const hc = headCoach(world, club.id);
    if (!hc) {
      // Interim promotion from within if the market has not filled the post.
      const internal = clubStaff(world, club.id).filter((s) => s.role !== 'head_coach').sort((a, b) => coachRoleRating(b.attributes, 'head_coach') - coachRoleRating(a.attributes, 'head_coach'))[0];
      if (internal && rng.chance(0.5)) {
        changeStaffRole(world, club.id, internal.id, 'head_coach', Math.max(internal.salary, expectedSalary(internal, 'head_coach', leagueSalaryMax(world, club.id)) * 0.8));
        news.push({ title: `${club.shortName} promote ${coachName(internal)}`, body: `${coachName(internal)} has been promoted to head coach of ${club.name}.`, clubId: club.id, important: false });
      }
      continue;
    }
    const rec = clubRecord(world, club.id, season);
    const games = rec.wins + rec.losses;
    if (games < 12) continue;
    const pct = rec.wins / games;
    const { rank, size } = leagueStrengthRank(world, club.id);
    const expectedPct = 1 - (rank - 1) / Math.max(1, size - 1) * 0.8 - 0.1;
    const impatience = club.aiPersonality === 'win_now' || club.aiPersonality === 'superstar_collector' ? 1.6 : club.aiPersonality === 'rebuilding' || club.aiPersonality === 'youth_development' ? 0.5 : 1;
    if (pct < expectedPct - 0.22 && rng.chance(0.25 * impatience) && validateTermination(world, club.id, hc.id).ok) {
      terminateStaff(world, club.id, hc.id);
      news.push({ title: `${club.shortName} fire ${coachName(hc)}`, body: `${club.name} dismiss head coach ${coachName(hc)} after a ${rec.wins}-${rec.losses} start.`, clubId: club.id, important: false });
    }
  }
  return news;
}

/**
 * End-of-season staff processing: careers develop, reputations move with
 * results, contracts expire (AI clubs decide on renewals), coaches retire and
 * new coaches enter the market.
 */
export function staffSeasonRollover(
  world: World,
  rng: Rng,
  userClubId: string,
  championIds: Set<string>,
  generate: (role: StaffRole) => Staff,
): StaffNews[] {
  const news: StaffNews[] = [];
  const season = world.meta.season;
  const today = world.meta.currentDate;
  for (const s of Object.values(world.staff)) {
    if (s.retired) continue;
    const age = coachAgeForLogic(s, today);
    // Skill development: experience early, decline late.
    for (const k of Object.keys(s.attributes) as (keyof Staff['attributes'])[]) {
      const delta = age < 45 ? rng.normal(0.9, 1.1) : age < 60 ? rng.normal(0.2, 0.9) : rng.normal(-0.8, 1);
      s.attributes[k] = clamp(Math.round(s.attributes[k] + delta), 15, 99);
    }
    if (s.clubId) {
      s.experienceYears++;
      const rec = clubRecord(world, s.clubId, season);
      const games = rec.wins + rec.losses;
      const pct = games ? rec.wins / games : 0.5;
      const weight = s.role === 'head_coach' ? 1 : 0.45;
      let repDelta = (pct - 0.5) * 18 * weight + (championIds.has(s.clubId) ? 8 * weight : 0);
      if (s.role === 'player_development' || s.role === 'shooting_coach') repDelta += rng.normal(0.5, 1);
      s.reputation = clamp(Math.round(s.reputation + repDelta), 1, 99);
      if (championIds.has(s.clubId)) {
        for (const h of world.staffHistory) if (h.staffId === s.id && h.clubId === s.clubId && h.endSeason === null) h.titles++;
      }
    } else {
      s.reputation = clamp(s.reputation - 1, 1, 99);
    }
    // Retirement.
    const retireChance = age >= 75 ? 1 : age >= 68 ? 0.35 : age >= 63 ? 0.12 : 0;
    if (rng.chance(retireChance)) {
      if (s.clubId) closeStint(world, s.id, s.clubId, 'retired');
      const club = s.clubId ? world.clubs[s.clubId] : null;
      s.retired = true;
      s.clubId = null;
      invalidateIndexes(world);
      if (s.reputation >= 60 || club?.id === userClubId) {
        news.push({ title: `${coachName(s)} retires`, body: `${coachName(s)} retires after ${s.experienceYears} years in coaching.`, clubId: club?.id ?? null, important: club?.id === userClubId });
      }
      continue;
    }
    // Contract expiry.
    if (s.clubId && s.contractEndSeason <= season) {
      const club = world.clubs[s.clubId];
      if (club.id === userClubId) {
        closeStint(world, s.id, club.id, 'contract_expired');
        news.push({ title: `${coachName(s)} leaves`, body: `${coachName(s)}'s contract as ${ROLE_LABEL[s.role]} has expired.`, clubId: club.id, important: true });
        s.clubId = null;
        invalidateIndexes(world);
        continue;
      }
      const offer = { role: s.role, salary: expectedSalary(s, s.role, leagueSalaryMax(world, club.id)), years: rng.int(1, 3) };
      const keep = coachRoleRating(s.attributes, s.role) >= 55 && rng.chance(0.7);
      const w = willingness(world, s.id, club.id, offer, { ignoreCompetition: true, kind: 'renewal' }).score;
      if (keep && w >= 45 && validateStaffHire(world, club.id, s.id, offer, 'renewal').ok) {
        renewStaff(world, club.id, s.id, offer);
      } else {
        closeStint(world, s.id, club.id, 'contract_expired');
        s.clubId = null;
        invalidateIndexes(world);
      }
    }
  }
  // Refresh the market with fictional coaches only when policy allows and the
  // real free-agent pool is too thin.
  const realFree = Object.values(world.staff).filter((s) => !s.retired && !s.clubId && !s.marketExcluded && s.verification.status !== 'fictional').length;
  const freePool = Object.values(world.staff).filter((s) => !s.retired && !s.clubId).length;
  const target = Math.max(25, Object.keys(world.clubs).length * 2);
  for (let i = world.meta.fictionalCoachPolicy === 'never' ? target : Math.max(freePool, realFree); i < target; i++) {
    const role = rng.weighted(STAFF_ROLES, [1, 2, 1, 1, 1.2, 1]);
    const coach = generate(role);
    world.staff[coach.id] = coach;
  }
  // Clear finished negotiations from previous seasons.
  for (const [k, n] of Object.entries(world.staffNegotiations)) if (n.status !== 'open') delete world.staffNegotiations[k];
  return news;
}
