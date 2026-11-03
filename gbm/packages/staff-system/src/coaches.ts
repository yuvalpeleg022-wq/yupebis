import type {
  CareerAmbition,
  CoachAttributes,
  CoachingPhilosophy,
  CoachPersonality,
  DataSource,
  Rng,
  Staff,
  StaffRole,
  World,
} from '@gbm/shared-types';
import { COACH_ATTRIBUTE_KEYS, addDays, ageOn, clamp, nextId } from '@gbm/shared-types';
import { COACH_FIRST, COACH_LAST, NAME_POOLS } from '@gbm/player-system';

export const ROLE_LABEL: Record<StaffRole, string> = {
  head_coach: 'Head Coach',
  assistant_coach: 'Assistant Coach',
  offensive_coordinator: 'Offensive Coordinator',
  defensive_coordinator: 'Defensive Coordinator',
  player_development: 'Player Development Coach',
  shooting_coach: 'Shooting Coach',
};

/** Seats available per role on a club's staff. */
export const ROLE_SLOTS: Record<StaffRole, number> = {
  head_coach: 1,
  assistant_coach: 2,
  offensive_coordinator: 1,
  defensive_coordinator: 1,
  player_development: 1,
  shooting_coach: 1,
};

/** Seniority rank: higher means more senior. Used for promotion/demotion. */
export const ROLE_RANK: Record<StaffRole, number> = {
  head_coach: 3,
  offensive_coordinator: 2,
  defensive_coordinator: 2,
  assistant_coach: 1,
  player_development: 1,
  shooting_coach: 1,
};

/** Salary multiplier per role relative to a head coach. */
export const ROLE_PAY: Record<StaffRole, number> = {
  head_coach: 1,
  offensive_coordinator: 0.32,
  defensive_coordinator: 0.32,
  assistant_coach: 0.22,
  player_development: 0.2,
  shooting_coach: 0.18,
};

const ROLE_WEIGHTS: Record<StaffRole, Partial<CoachAttributes>> = {
  head_coach: { gameManagement: 0.22, offense: 0.15, defense: 0.15, chemistry: 0.16, motivation: 0.14, playerDevelopment: 0.06, adaptability: 0.07, training: 0.05 },
  assistant_coach: { training: 0.2, gameManagement: 0.15, offense: 0.15, defense: 0.15, chemistry: 0.15, scouting: 0.1, adaptability: 0.1 },
  offensive_coordinator: { offense: 0.5, gameManagement: 0.15, training: 0.15, adaptability: 0.1, shooting: 0.1 },
  defensive_coordinator: { defense: 0.5, gameManagement: 0.15, training: 0.15, adaptability: 0.1, motivation: 0.1 },
  player_development: { playerDevelopment: 0.5, training: 0.25, motivation: 0.15, scouting: 0.1 },
  shooting_coach: { shooting: 0.55, playerDevelopment: 0.2, training: 0.25 },
};

export function coachRoleRating(attrs: CoachAttributes, role: StaffRole): number {
  const w = ROLE_WEIGHTS[role];
  let s = 0;
  for (const k in w) s += attrs[k as keyof CoachAttributes] * (w[k as keyof CoachAttributes] ?? 0);
  return Math.round(s);
}

/** Best role for a coach by skills. */
export function bestRole(attrs: CoachAttributes): StaffRole {
  let best: StaffRole = 'assistant_coach';
  let bestV = -1;
  for (const r of Object.keys(ROLE_WEIGHTS) as StaffRole[]) {
    const v = coachRoleRating(attrs, r) - (r === 'head_coach' ? 3 : 0);
    if (v > bestV) {
      bestV = v;
      best = r;
    }
  }
  return best;
}

const PERSONALITIES: CoachPersonality[] = ['players_coach', 'disciplinarian', 'innovator', 'loyal', 'ambitious', 'mercenary'];
const PHILOSOPHIES: CoachingPhilosophy[] = ['pace_and_space', 'defense_first', 'motion_offense', 'post_oriented', 'development', 'balanced'];

export const PERSONALITY_LABEL: Record<CoachPersonality, string> = {
  players_coach: "Players' coach",
  disciplinarian: 'Disciplinarian',
  innovator: 'Innovator',
  loyal: 'Loyal',
  ambitious: 'Ambitious',
  mercenary: 'Mercenary',
};
export const PHILOSOPHY_LABEL: Record<CoachingPhilosophy, string> = {
  pace_and_space: 'Pace & Space',
  defense_first: 'Defense First',
  motion_offense: 'Motion Offense',
  post_oriented: 'Post Oriented',
  development: 'Player Development',
  balanced: 'Balanced',
};
export const AMBITION_LABEL: Record<CareerAmbition, string> = {
  become_head_coach: 'Become a head coach',
  win_titles: 'Win championships',
  stability: 'Job stability',
  money: 'Maximise earnings',
  develop_players: 'Develop young players',
};

export interface GenerateCoachOptions {
  rng: Rng;
  role: StaffRole;
  level: number; // target role rating
  age?: number;
  nationality?: string;
  clubId?: string | null;
  onDate: string;
  season: number;
  salaryScaleMax: number;
  source?: DataSource;
}

export function generateCoach(world: Pick<World, 'meta'>, o: GenerateCoachOptions): Staff {
  const { rng } = o;
  const age = o.age ?? (o.role === 'head_coach' ? rng.int(40, 66) : rng.int(29, 60));
  const attrs = {} as CoachAttributes;
  for (const k of COACH_ATTRIBUTE_KEYS) attrs[k] = rng.normal(o.level - 4, 9);
  // Emphasise the attributes that define the role.
  const focus = ROLE_WEIGHTS[o.role];
  for (const k in focus) attrs[k as keyof CoachAttributes] += (focus[k as keyof CoachAttributes] ?? 0) * 22;
  for (const k of COACH_ATTRIBUTE_KEYS) attrs[k] = clamp(Math.round(attrs[k]), 20, 97);
  const philosophy: CoachingPhilosophy =
    attrs.defense > attrs.offense + 8 ? 'defense_first'
      : attrs.playerDevelopment > 72 && rng.chance(0.5) ? 'development'
        : rng.pick(PHILOSOPHIES);
  const ambition: CareerAmbition =
    o.role !== 'head_coach' && age < 50 && rng.chance(0.45) ? 'become_head_coach'
      : rng.pick(['win_titles', 'stability', 'money', 'develop_players'] as CareerAmbition[]);
  const natPool = rng.chance(0.4) ? null : rng.pick(NAME_POOLS);
  const nationality = o.nationality ?? natPool?.nationality ?? 'USA';
  const pool = NAME_POOLS.find((p) => p.nationality === nationality);
  const experienceYears = clamp(Math.round((age - 28) * rng.range(0.5, 0.95)), 0, 45);
  const reputation = clamp(Math.round(coachRoleRating(attrs, o.role) * 0.7 + experienceYears * 0.5 + rng.normal(0, 5)), 5, 99);
  const preferredRoles = preferredRolesFor(attrs, ambition, o.role);
  const staff: Staff = {
    id: nextId(world, 'st'),
    clubId: o.clubId ?? null,
    firstName: pool && rng.chance(0.6) ? rng.pick(pool.first) : rng.pick(COACH_FIRST),
    lastName: pool && rng.chance(0.6) ? rng.pick(pool.last) : rng.pick(COACH_LAST),
    nationality,
    birthDate: addDays(o.onDate, -Math.round(age * 365.25 + rng.int(0, 360))),
    role: o.role,
    attributes: attrs,
    personality: rng.pick(PERSONALITIES),
    philosophy,
    ambition,
    preferredRoles,
    reputation,
    experienceYears,
    salary: 0,
    contractStartSeason: o.season,
    contractEndSeason: o.season + rng.int(0, 3),
    morale: Math.round(rng.range(55, 85)),
    retired: false,
    source: o.source ?? 'generated',
    sourceRef: null,
    verification: { status: 'fictional', sources: [], verifiedOn: null, missingFields: [], notes: 'Generated game character — not a real person.' },
    marketExcluded: false,
  };
  staff.salary = expectedSalary(staff, o.role, o.salaryScaleMax);
  return staff;
}

export function preferredRolesFor(attrs: CoachAttributes, ambition: CareerAmbition, current: StaffRole): StaffRole[] {
  const ranked = (Object.keys(ROLE_WEIGHTS) as StaffRole[])
    .map((r) => ({ r, v: coachRoleRating(attrs, r) }))
    .sort((a, b) => b.v - a.v)
    .map((x) => x.r);
  const out: StaffRole[] = [];
  if (ambition === 'become_head_coach') out.push('head_coach');
  for (const r of ranked) if (!out.includes(r) && out.length < 3) out.push(r);
  if (!out.includes(current) && out.length < 3) out.push(current);
  return out;
}

/** What a coach expects to earn in a role, scaled to the league's salary level. */
export function expectedSalary(staff: Pick<Staff, 'reputation' | 'experienceYears'>, role: StaffRole, leagueSalaryMax: number): number {
  const headCoachTop = leagueSalaryMax * 0.25;
  const quality = clamp((staff.reputation - 20) / 75, 0.05, 1);
  const base = headCoachTop * Math.pow(quality, 2.2) * ROLE_PAY[role];
  const exp = 1 + Math.min(staff.experienceYears, 30) * 0.008;
  const v = Math.max(leagueSalaryMax * 0.004, base * exp);
  return Math.round(v / 5_000) * 5_000;
}

/** Age in years, or null when the birth date is unknown (real coach, unverified). */
export function coachAge(staff: Pick<Staff, 'birthDate'>, date: string): number | null {
  return staff.birthDate ? ageOn(staff.birthDate, date) : null;
}

/** Age for game logic; unknown ages are treated as a mid-career 50 (never stored). */
export function coachAgeForLogic(staff: Pick<Staff, 'birthDate'>, date: string): number {
  return coachAge(staff, date) ?? 50;
}

export function isRealCoach(staff: Pick<Staff, 'verification'>): boolean {
  return staff.verification.status !== 'fictional';
}

export function coachName(s: Pick<Staff, 'firstName' | 'lastName'>): string {
  return `${s.firstName} ${s.lastName}`;
}
