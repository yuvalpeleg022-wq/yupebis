import type {
  Club,
  CoachAttributes,
  CoachPersonality,
  CoachingPhilosophy,
  CareerAmbition,
  Contract,
  Player,
  Position,
  Staff,
  StaffRole,
  World,
} from '@gbm/shared-types';
import { COACH_ATTRIBUTE_KEYS, Rng, clamp, combineSeeds, hashString, invalidateIndexes, nextId } from '@gbm/shared-types';
import { askingSalary, attributesFromStats, baselineAttributes, generatePlayer, overallForPosition, playerOverall, preferredYears, randomNationality } from '@gbm/player-system';
import { RULESETS, generateLeagueSchedule } from '@gbm/competition-system';
import { DEFAULT_TACTICS } from '@gbm/simulation';
import { staffPayroll } from '@gbm/finance-system';
import { aiTactics, autoRotation } from '@gbm/ai-manager';
import {
  ROLE_LABEL,
  aiPickCandidate,
  coachRoleRating,
  expectedSalary,
  generateCoach,
  headCoach,
  hireStaff,
  leagueSalaryMax,
  openStint,
  preferredRolesFor,
} from '@gbm/staff-system';
import { ASSIGNABLE, SIMULATED_APPOINTMENT, type RealCoach, type RealDataset, loadRealDataset2026, openDataIssue } from '@gbm/data-import';
import { DOMESTIC_LEAGUE_DEFS, LEAGUE_DEFS } from './leagues';
import { addNews, emptyWorld } from './world';
import { foundingEntries } from './transition';
import { defaultRegulations } from './regulations';
import { EXPERIENCE_PROFILES, type ManagerExperience, assignUserToClub, managerAttributesFor } from './manager';

export interface NewCareerOptions {
  careerName: string;
  managerName: string;
  /** Dataset club ref (e.g. 'nba:bos') or world club id. Omit to pick a club later (club selection screen). */
  userClubRef?: string;
  managerExperience?: ManagerExperience;
  /** Default 'real_only'. 'placeholders' fills missing real rosters with labelled fictional players. */
  rosterPolicy?: 'real_only' | 'placeholders';
  seed?: number;
  fictionalCoachPolicy?: 'when_needed' | 'never';
  dataset?: RealDataset;
}

const ALL_LEAGUES = { ...LEAGUE_DEFS, ...DOMESTIC_LEAGUE_DEFS };

/** Clubs a user may pick (every club in a playable competition). */
export function selectableClubs(dataset: RealDataset = loadRealDataset2026()) {
  return dataset.clubs.filter((c) => ALL_LEAGUES[c.league]?.active);
}

const PERSONALITIES: CoachPersonality[] = ['players_coach', 'disciplinarian', 'innovator', 'loyal', 'ambitious', 'mercenary'];
const PHILOSOPHIES: CoachingPhilosophy[] = ['pace_and_space', 'defense_first', 'motion_offense', 'post_oriented', 'development', 'balanced'];
const AMBITIONS: CareerAmbition[] = ['win_titles', 'stability', 'money', 'develop_players'];

/**
 * Provisional game ratings for a real coach. These are gameplay estimates
 * (deterministic per coach), NOT claims about the person's real ability.
 */
function provisionalCoachAttributes(ref: string, role: StaffRole, level: number): CoachAttributes {
  const rng = new Rng(hashString(`coach-ratings:${ref}`));
  const attrs = {} as CoachAttributes;
  for (const k of COACH_ATTRIBUTE_KEYS) attrs[k] = clamp(Math.round(level + rng.normal(0, 5)), 30, 95);
  if (role === 'head_coach') attrs.gameManagement = clamp(attrs.gameManagement + 3, 30, 95);
  return attrs;
}

function leagueLevel(leagueKey: string): number {
  if (leagueKey === 'nba') return 70;
  if (leagueKey === 'euroleague') return 67;
  return 60;
}

function latestAccess(dataset: RealDataset, sourceIds: string[]): string | null {
  const dates = dataset.sources.filter((s) => sourceIds.includes(s.id)).map((s) => s.accessedOn).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/**
 * Builds a new career world from the real-world dataset. Real clubs and real
 * coaches are the primary population; generated (fictional) data is used only
 * where no authorized real data exists (players, and coaching posts that no
 * real coach can fill), and is always labelled as such.
 */
export function createCareer(opts: NewCareerOptions): World {
  const dataset = opts.dataset ?? loadRealDataset2026();
  const seed = opts.seed ?? hashString(`${opts.careerName}:${Date.now()}`);
  const rng = new Rng(seed);
  const season = dataset.season;
  const startDate = `${season}-09-01`;
  const world = emptyWorld({
    careerId: `career_${seed.toString(36)}`,
    careerName: opts.careerName,
    managerName: opts.managerName,
    userClubId: '',
    managerReputation: EXPERIENCE_PROFILES[opts.managerExperience ?? 'professional'].reputation,
    managerAttributes: managerAttributesFor(opts.managerExperience ?? 'professional'),
    season,
    currentDate: startDate,
    phase: 'preseason',
    seed,
    boardConfidence: 60,
    datasetName: dataset.name,
    datasetSource: 'verified',
    fictionalCoachPolicy: opts.fictionalCoachPolicy ?? 'when_needed',
    rosterPolicy: opts.rosterPolicy ?? 'real_only',
  });
  for (const r of Object.values(RULESETS)) world.rules[r.id] = structuredClone(r);
  for (const s of dataset.sources) world.dataSources[s.id] = { ...s };
  const leagueIdByKey: Record<string, string> = {};
  for (const [key, def] of Object.entries(ALL_LEAGUES)) {
    if (!dataset.clubs.some((c) => c.league === key) && key !== 'eurocup' && key !== 'bcl') continue;
    world.leagues[def.id] = structuredClone(def);
    leagueIdByKey[key] = def.id;
  }

  // ---- Clubs ------------------------------------------------------------
  const clubIdByRef: Record<string, string> = {};
  for (const rc of dataset.clubs) {
    const leagueId = leagueIdByKey[rc.league];
    if (!leagueId) throw new Error(`Unknown league ${rc.league} for ${rc.ref}`);
    const league = world.leagues[leagueId];
    const crng = new Rng(combineSeeds(seed, rc.ref));
    const na = league.region === 'north_america';
    const reputation = clamp(Math.round((rc.league === 'nba' ? 70 : rc.league === 'euroleague' ? 66 : 48) + crng.normal(0, 8)), 20, 95);
    const club: Club = {
      id: nextId(world, 'c'),
      name: rc.name,
      shortName: rc.shortName,
      city: rc.city,
      country: rc.country,
      leagueId,
      competitionIds: [leagueId, ...(rc.domestic && leagueIdByKey[rc.domestic] ? [leagueIdByKey[rc.domestic]] : [])],
      reputation,
      arenaCapacity: na ? crng.int(17500, 20500) : rc.league === 'euroleague' ? crng.int(7000, 16000) : crng.int(2500, 8000),
      ticketPrice: na ? crng.int(80, 120) : crng.int(20, 40),
      cash: 0,
      wageBudget: 0,
      sponsorshipPerSeason: Math.round((na ? 60_000_000 : rc.league === 'euroleague' ? 9_000_000 : 1_500_000) * (0.6 + reputation / 100)),
      tactics: { ...DEFAULT_TACTICS },
      rotation: { starters: [], minutes: {}, auto: true },
      aiPersonality: crng.pick(['win_now', 'youth_development', 'financial_conservative', 'aggressive_trader', 'superstar_collector', 'defensive_specialist', 'rebuilding']),
      trainingFocus: 'balanced',
      youthRating: crng.int(30, 80),
      staffBudget: 0,
      rosterSource: 'missing',
      primaryColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#eab308', '#f97316'][crng.int(0, 7)],
      source: 'verified',
      sourceRef: rc.ref,
      verification: {
        status: rc.participation,
        sources: rc.sources,
        verifiedOn: latestAccess(dataset, rc.sources),
        missingFields: ['arena', 'finances'],
        notes: rc.notes,
      },
    };
    world.clubs[club.id] = club;
    clubIdByRef[rc.ref] = club.id;
    if (!ASSIGNABLE.includes(rc.participation)) {
      openDataIssue(world, { entity: 'club', entityId: club.id, field: 'participation', severity: 'unverified', message: `${rc.name}: 2026-27 participation not confirmed.`, candidates: [] });
    }
  }

  // ---- Real coaches -----------------------------------------------------
  const realStaffByRef: Record<string, Staff> = {};
  for (const rc of dataset.coaches) {
    const staff = realCoachToStaff(world, dataset, rc, clubIdByRef);
    world.staff[staff.id] = staff;
    realStaffByRef[rc.ref] = staff;
    if (staff.clubId) openStint(world, staff.id, staff.clubId, staff.role);
    if (rc.status === 'conflicting' || rc.status === 'unverified' || rc.status === 'incomplete') {
      openDataIssue(world, {
        entity: 'coach', entityId: staff.id, field: 'assignment', severity: rc.status === 'conflicting' ? 'conflict' : 'unverified',
        message: `${rc.firstName} ${rc.lastName}: ${rc.notes}`, candidates: [],
      });
    }
  }

  // ---- Players: real rosters first --------------------------------------
  const leagueKeyByClubId: Record<string, string> = {};
  for (const rc of dataset.clubs) leagueKeyByClubId[clubIdByRef[rc.ref]] = rc.league;
  addRealPlayers(world, dataset, clubIdByRef, leagueKeyByClubId);
  invalidateIndexes(world);
  for (const club of Object.values(world.clubs)) {
    const rules = world.rules[world.leagues[club.leagueId].rulesId];
    const real = Object.values(world.players).filter((p) => p.clubId === club.id && p.source !== 'generated').length;
    const target = Math.min(rules.rosterMax, Math.max(rules.rosterMin, 13));
    if (real >= rules.rosterMin) {
      club.rosterSource = 'real';
      continue;
    }
    if (world.meta.rosterPolicy === 'placeholders') {
      generateRoster(world, club, rng, target - real);
      club.rosterSource = real > 0 ? 'mixed' : 'placeholder';
    } else {
      club.rosterSource = real >= MIN_PLAYABLE_ROSTER ? 'short' : 'missing';
    }
    openDataIssue(world, {
      entity: 'club', entityId: club.id, field: 'roster', severity: 'missing',
      message: `${club.name}: ${real} real player(s) found for 2026-27; league minimum is ${rules.rosterMin}.${world.meta.rosterPolicy === 'placeholders' ? ` ${target - real} labelled fictional placeholder(s) added by user choice.` : ''}`,
      candidates: [],
    });
    invalidateIndexes(world);
  }
  // Fictional free agents exist only when the user allowed placeholders.
  if (world.meta.rosterPolicy === 'placeholders') generateFreeAgents(world, rng);

  // Competitions can only be simulated when every participant can field a team.
  for (const league of Object.values(world.leagues)) {
    if (!league.active) continue;
    // Ready to simulate only when every participant has a complete roster
    // (real players, or labelled placeholders the user explicitly allowed).
    const blocked = Object.values(world.clubs).filter((c) => c.competitionIds.includes(league.id) && (c.rosterSource === 'missing' || c.rosterSource === 'short'));
    if (blocked.length) {
      league.active = false;
      league.dataNote = `Not simulated: real rosters incomplete for ${blocked.length} club(s) (${blocked.slice(0, 4).map((c) => c.shortName).join(', ')}${blocked.length > 4 ? ', …' : ''}). Import verified rosters or allow labelled placeholders.`;
    }
  }
  for (const club of Object.values(world.clubs)) club.competitionIds = club.competitionIds.filter((id) => world.leagues[id].active || id === club.leagueId);
  // Competition history starts with the real 2026-27 participation; simulated
  // seasons follow the (editable) regulations.
  foundingEntries(world);
  world.regulations = defaultRegulations(world, season + 1);

  // ---- Finances & staff budgets -----------------------------------------
  for (const club of Object.values(world.clubs)) setupClubFinances(world, club);

  // ---- Data issues for missing real-world coaching data ------------------
  for (const club of Object.values(world.clubs)) {
    const hc = headCoach(world, club.id);
    if (!hc) {
      const candidates = dataset.coaches
        .filter((c) => !c.assignment && c.notes.includes(club.name))
        .map((c) => `${c.firstName} ${c.lastName} (${c.status})`);
      openDataIssue(world, { entity: 'club', entityId: club.id, field: 'staff:head_coach', severity: 'missing', message: `${club.name}: 2026-27 head coach not found in available sources.`, candidates });
    }
    if (world.leagues[club.leagueId].active && !Object.values(world.staff).some((s) => s.clubId === club.id && s.role !== 'head_coach')) {
      openDataIssue(world, { entity: 'club', entityId: club.id, field: 'staff:assistant_coach', severity: 'missing', message: `${club.name}: no real assistant coaches found in available sources.`, candidates: [] });
    }
  }

  // ---- Fill head-coach vacancies: real unattached coaches first ----------
  // Playable clubs first (their coach affects games), strongest reputation first.
  const vacancies = Object.values(world.clubs)
    .filter((c) => !headCoach(world, c.id))
    .sort((a, b) => Number(world.leagues[b.leagueId].active) - Number(world.leagues[a.leagueId].active) || b.reputation - a.reputation);
  for (const club of vacancies) {
    const candidate = aiPickCandidate(world, club, 'head_coach', rng, (s) => !s.clubId && s.verification.status !== 'fictional');
    if (candidate) {
      const salary = expectedSalary(candidate, 'head_coach', leagueSalaryMax(world, club.id));
      club.staffBudget = Math.max(club.staffBudget, staffPayroll(world, club.id) + salary);
      hireStaff(world, club.id, candidate.id, { role: 'head_coach', salary, years: 2 });
      candidate.verification.notes += ` ${SIMULATED_APPOINTMENT} at ${club.name} (game start) — real-world 2026-27 coach of this club is unknown.`;
      addNews(world, 'system', `Simulated appointment: ${candidate.firstName} ${candidate.lastName}`, `The real 2026-27 head coach of ${club.name} could not be found in the available sources. Real free-agent coach ${candidate.firstName} ${candidate.lastName} has been appointed in-game.`, { clubId: club.id });
    } else if (world.meta.fictionalCoachPolicy === 'when_needed' && world.leagues[club.leagueId].active) {
      // Last resort: a clearly labelled fictional coach so the club can play.
      const coach = makeFictionalCoach(world, rng, 'head_coach', club.leagueId);
      world.staff[coach.id] = coach;
      club.staffBudget = Math.max(club.staffBudget, staffPayroll(world, club.id) + coach.salary);
      hireStaff(world, club.id, coach.id, { role: 'head_coach', salary: coach.salary, years: 1 });
      addNews(world, 'system', `Fictional coach at ${club.name}`, `No real head coach was available for ${club.name}. ${coach.firstName} ${coach.lastName} is a FICTIONAL generated coach.`, { clubId: club.id });
    }
  }

  // ---- AI setup and schedules ------------------------------------------
  for (const club of Object.values(world.clubs)) {
    if (!world.leagues[club.leagueId].active) continue;
    club.rotation = autoRotation(world, club.id);
    club.tactics = aiTactics(world, club.id);
  }
  for (const league of Object.values(world.leagues)) if (league.active) generateLeagueSchedule(world, league, season);

  // ---- User club (optional: may be chosen later from the club directory) ----
  if (opts.userClubRef) {
    const userClubId = clubIdByRef[opts.userClubRef] ?? (world.clubs[opts.userClubRef] ? opts.userClubRef : null);
    if (!userClubId) throw new Error(`Unknown club ${opts.userClubRef}`);
    assignUserToClub(world, userClubId, 'start');
  }
  return world;
}

function realCoachToStaff(world: World, dataset: RealDataset, rc: RealCoach, clubIdByRef: Record<string, string>): Staff {
  const clubId = rc.assignment ? clubIdByRef[rc.assignment.club] ?? null : null;
  const role: StaffRole = rc.assignment?.role ?? 'head_coach';
  const leagueKey = rc.assignment ? dataset.clubs.find((c) => c.ref === rc.assignment!.club)?.league ?? 'euroleague' : 'euroleague';
  const level = leagueLevel(leagueKey) - (role === 'head_coach' ? 0 : 6);
  const attrs = provisionalCoachAttributes(rc.ref, role, level);
  const trng = new Rng(hashString(`coach-traits:${rc.ref}`));
  const ambition = role === 'head_coach' ? trng.pick(AMBITIONS) : trng.chance(0.5) ? 'become_head_coach' : trng.pick(AMBITIONS);
  const marketExcluded = !ASSIGNABLE.includes(rc.status) || (!rc.assignment && rc.employment !== 'unattached');
  const staff: Staff = {
    id: nextId(world, 'st'),
    clubId,
    firstName: rc.firstName,
    lastName: rc.lastName,
    nationality: rc.nationality ?? '',
    birthDate: rc.birthDate,
    role,
    attributes: attrs,
    personality: trng.pick(PERSONALITIES),
    philosophy: trng.pick(PHILOSOPHIES),
    ambition,
    preferredRoles: preferredRolesFor(attrs, ambition, role),
    reputation: clamp(Math.round(coachRoleRating(attrs, role) + (leagueKey === 'nba' ? 6 : leagueKey === 'euroleague' ? 4 : 0)), 20, 95),
    experienceYears: 10,
    salary: 0,
    contractStartSeason: dataset.season,
    contractEndSeason: dataset.season + 2,
    morale: 70,
    retired: false,
    source: 'verified',
    sourceRef: rc.ref,
    verification: {
      status: rc.status,
      sources: rc.sources,
      verifiedOn: latestAccess(dataset, rc.sources),
      missingFields: rc.missingFields,
      notes: [rc.notes, 'Game ratings, traits, salary and contract length are provisional gameplay estimates, not real-world facts.'].filter(Boolean).join(' '),
    },
    marketExcluded,
  };
  // Experience is unknown for real coaches: keep a neutral placeholder value
  // used only by game formulas and listed as missing data.
  if (!staff.verification.missingFields.includes('experienceYears')) staff.verification.missingFields.push('experienceYears');
  if (clubId) staff.salary = expectedSalary(staff, role, leagueSalaryMaxFor(world, clubId));
  else staff.salary = expectedSalary(staff, role, 6_000_000);
  return staff;
}

function leagueSalaryMaxFor(world: World, clubId: string): number {
  return world.leagues[world.clubs[clubId].leagueId].salaryScale.max;
}

export function makeFictionalCoach(world: World, rng: Rng, role: StaffRole, leagueId: string): Staff {
  const league = world.leagues[leagueId];
  return generateCoach(world, {
    rng,
    role,
    level: league.region === 'north_america' ? 64 : 60,
    onDate: world.meta.currentDate,
    season: world.meta.season,
    salaryScaleMax: league.salaryScale.max,
  });
}

const ROSTER_POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', 'SG', 'SF', 'PF', 'PG', 'C'];

function generateRoster(world: World, club: Club, rng: Rng, size: number) {
  const league = world.leagues[club.leagueId];
  const rules = world.rules[league.rulesId];
  const na = league.region === 'north_america';
  const tier = (club.reputation - 65) * 0.25 + rng.normal(0, 2.5);
  const base = (na ? 69 : club.leagueId === 'lg_euroleague' ? 64 : 58) + tier;
  let foreign = 0;
  const curve = [11, 7, 5, 3, 2, 0, -1, -2, -3, -5, -6, -8, -9, -10, -11];
  for (let i = 0; i < size; i++) {
    const position = ROSTER_POSITIONS[i];
    const age = clamp(Math.round(rng.normal(26.5, 4)), 19, 36);
    const overall = clamp(Math.round(base + curve[i] + rng.normal(0, 1.5)), 40, 92);
    const p = generatePlayer(world, {
      rng, position, age, overall, onDate: world.meta.currentDate, clubId: club.id,
      nationality: na
        ? randomNationality(rng, 'north_america')
        : rules.foreignPlayerLimit !== null && foreign >= rules.foreignPlayerLimit
          ? club.country
          : rng.chance(0.45) ? club.country : randomNationality(rng, 'europe'),
    });
    if (p.nationality !== club.country) foreign++;
    p.jersey = i < 10 ? [0, 1, 3, 4, 5, 7, 8, 9, 10, 11][i] : 20 + i;
    world.players[p.id] = p;
    addContract(world, p.id, club.id, rng, rules.salaryCap.minSalary);
  }
}

function addContract(world: World, playerId: string, clubId: string, rng: Rng, minSalary: number): Contract {
  const p = world.players[playerId];
  const league = world.leagues[world.clubs[clubId].leagueId];
  const age = world.meta.season - (p.birthDate ? Number(p.birthDate.slice(0, 4)) : world.meta.season - 27);
  const ovr = playerOverall(p);
  const salary = Math.max(minSalary, Math.round((askingSalary(ovr, age, p.potential, league.salaryScale) * rng.range(0.85, 1.1)) / 10_000) * 10_000);
  const years = Math.max(1, Math.min(5, preferredYears(age, ovr) + rng.int(-1, 1)));
  const c: Contract = {
    id: nextId(world, 'ct'), playerId, clubId, salary, startSeason: world.meta.season - rng.int(0, years - 1),
    endSeason: 0, option: 'none', buyout: league.region === 'europe' ? Math.round(salary * 1.5) : null, nbaExitClause: false,
    signedDate: world.meta.currentDate, active: true,
  };
  c.endSeason = Math.max(world.meta.season, c.startSeason + years - 1);
  world.contracts[c.id] = c;
  return c;
}

function generateFreeAgents(world: World, rng: Rng) {
  const positions: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];
  for (const league of Object.values(world.leagues)) {
    if (!league.active) continue;
    const na = league.region === 'north_america';
    const n = na ? 45 : 35;
    for (let i = 0; i < n; i++) {
      const age = clamp(Math.round(rng.normal(27, 5)), 19, 37);
      const overall = clamp(Math.round((na ? 60 : 56) + rng.normal(0, 5)), 40, 80);
      const p = generatePlayer(world, { rng, position: positions[i % 5], age, overall, onDate: world.meta.currentDate, nationality: randomNationality(rng, na ? 'north_america' : 'europe') });
      world.players[p.id] = p;
    }
  }
}

function setupClubFinances(world: World, club: Club) {
  const league = world.leagues[club.leagueId];
  const na = league.region === 'north_america';
  let payroll = 0;
  for (const c of Object.values(world.contracts)) if (c.active && c.clubId === club.id && c.endSeason >= world.meta.season && c.startSeason <= world.meta.season) payroll += c.salary;
  const rules = world.rules[league.rulesId];
  club.wageBudget = Math.round(Math.max(payroll * 1.08, rules.salaryCap.salaryFloor ?? 0) / 100_000) * 100_000;
  club.cash = Math.round((na ? 40_000_000 : league.active ? 4_000_000 : 1_000_000) * (0.5 + club.reputation / 100));
  // Staff budget: real staff salaries plus room for the vacant posts.
  const current = staffPayroll(world, club.id);
  const hcRoom = expectedSalaryFallback(world, club, 'head_coach');
  club.staffBudget = Math.round((current + hcRoom * 1.6) / 50_000) * 50_000;
}

function expectedSalaryFallback(world: World, club: Club, role: StaffRole): number {
  const league = world.leagues[club.leagueId];
  return expectedSalary({ reputation: 65, experienceYears: 10 }, role, league.salaryScale.max);
}

export const MIN_PLAYABLE_ROSTER = 8;

/** Adds the dataset's real players to the world, rated from their real statistics. */
function addRealPlayers(world: World, dataset: RealDataset, clubIdByRef: Record<string, string>, leagueKeyByClubId: Record<string, string>) {
  const now = new Date().toISOString();
  for (const rp of dataset.players) {
    const clubId = rp.club ? clubIdByRef[rp.club] ?? null : null;
    const leagueKey = clubId ? leagueKeyByClubId[clubId] : rp.stats?.league ?? 'euroleague';
    // Ratings: real statistics when available; otherwise PROVISIONAL league
    // baseline adjusted only by a source-stated role (starter/rotation/reserve).
    const attributes = rp.stats ? attributesFromStats(rp.position, rp.heightCm, rp.stats) : baselineAttributes(rp.position, leagueKey);
    if (!rp.stats && rp.role) {
      const shift = rp.role === 'starter' ? 7 : rp.role === 'rotation' ? 2 : -4;
      for (const k of Object.keys(attributes) as (keyof typeof attributes)[]) attributes[k] = clamp(attributes[k] + shift, 20, 99);
    }
    const ovr = overallForPosition(attributes, rp.position);
    const age = rp.birthDate ? world.meta.season - Number(rp.birthDate.slice(0, 4)) : 27;
    const p: Player = {
      id: nextId(world, 'p'),
      firstName: rp.firstName,
      lastName: rp.lastName,
      nationality: rp.nationality ?? '',
      birthDate: rp.birthDate,
      heightCm: rp.heightCm,
      weightKg: rp.weightKg,
      position: rp.position,
      secondaryPosition: rp.secondaryPosition,
      clubId,
      jersey: rp.jersey,
      attributes,
      // Potential is a game projection from age and current level, not a real-world claim.
      potential: clamp(Math.round(ovr + Math.max(0, 26 - age) * 1.6), ovr, 99),
      morale: 65,
      fatigue: 0,
      loyalty: 50,
      injuryId: null,
      retired: false,
      source: 'verified',
      sourceRef: rp.ref,
      ratingBasis: rp.stats ? 'statistics' : 'league_baseline',
      unverifiedFields: [
        ...(rp.positionBasis !== 'reported' ? ['position_slot'] : []),
        ...(rp.birthDate ? [] : ['birthDate']),
        ...(rp.heightCm ? [] : ['height']),
        ...(rp.nationality ? [] : ['nationality']),
        ...(rp.stats ? [] : ['statistics']),
        // No verified contract: the game assigns an estimated contract, flagged as such.
        ...(rp.contract ? [] : ['contract']),
      ],
      draftYear: null,
      createdAt: now,
      updatedAt: now,
    };
    world.players[p.id] = p;
    if (clubId) {
      const c = addContract(world, p.id, clubId, new Rng(hashString(rp.ref)), world.rules[world.leagues[world.clubs[clubId].leagueId].rulesId].salaryCap.minSalary);
      if (rp.contract) {
        c.salary = Math.round(rp.contract.salary);
        c.endSeason = Math.max(world.meta.season, rp.contract.endSeason);
      }
    }
  }
}

export { ROLE_LABEL };
