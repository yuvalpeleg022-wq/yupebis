import { z } from 'zod';
import type { DataIssue, Player, Staff, StaffRole, VerificationStatus, World } from '@gbm/shared-types';
import { ALL_ATTRIBUTES, POSITIONS, clamp, invalidateIndexes, nextId } from '@gbm/shared-types';
import { generateAttributes } from '@gbm/player-system';
import { Rng, hashString } from '@gbm/shared-types';
import sourcesJson from '../data/real-2026-27/sources.json';
import clubsJson from '../data/real-2026-27/clubs.json';
import coachesJson from '../data/real-2026-27/coaches.json';
import playersJson from '../data/real-2026-27/players.json';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const STATUS = z.enum(['verified', 'reported', 'unverified', 'conflicting', 'incomplete', 'fictional']);
const ROLE = z.enum(['head_coach', 'assistant_coach', 'offensive_coordinator', 'defensive_coordinator', 'player_development', 'shooting_coach']);

export const SourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  publisher: z.string(),
  accessedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.string(),
});

export const RealClubSchema = z.object({
  ref: z.string().regex(/^[a-z]+:[a-z0-9-]+$/),
  name: z.string().min(1),
  shortName: z.string().min(2).max(4),
  city: z.string(),
  country: z.string().length(3),
  league: z.string(),
  /** Domestic league also played by a EuroLeague club. */
  domestic: z.string().nullable().optional(),
  participation: STATUS,
  sources: z.array(z.string()),
  notes: z.string().default(''),
});

export const RealCoachSchema = z.object({
  ref: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nationality: z.string().length(3).nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  status: STATUS,
  sources: z.array(z.string()),
  assignment: z
    .object({ club: z.string(), role: ROLE, season: z.number().int(), since: z.string().nullable().optional() })
    .nullable(),
  /** employed = holds the assigned post; unattached = no current coaching job found; unknown = not established. */
  employment: z.enum(['employed', 'unattached', 'unknown']),
  careerHistory: z.array(z.object({ club: z.string(), role: ROLE, from: z.number().int(), to: z.number().int().nullable(), sources: z.array(z.string()) })),
  missingFields: z.array(z.string()),
  notes: z.string().default(''),
});

const POSITION = z.enum(['PG', 'SG', 'SF', 'PF', 'C']);

/** A real player in the starting-season dataset. Birth date and position are required. */
export const RealPlayerSchema = z.object({
  ref: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nationality: z.string().length(3).nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.number().min(150).max(240),
  weightKg: z.number().min(50).max(180),
  position: POSITION,
  secondaryPosition: POSITION.nullable(),
  club: z.string().nullable(),
  jersey: z.number().int().min(0).max(99).nullable(),
  status: STATUS,
  sources: z.array(z.string()).min(1),
  /** Most recent season's per-game statistics (drives game ratings). */
  stats: z
    .object({
      season: z.number().int(), league: z.string(), gp: z.number(), mpg: z.number(), ppg: z.number(), rpg: z.number(),
      apg: z.number(), spg: z.number(), bpg: z.number(), topg: z.number().optional(), orpg: z.number().optional(),
      fgPct: z.number().min(0).max(1), tpPct: z.number().min(0).max(1), ftPct: z.number().min(0).max(1),
      tpaPg: z.number().optional(), ftaPg: z.number().optional(),
    })
    .nullable(),
  contract: z.object({ salary: z.number().positive(), endSeason: z.number().int(), sources: z.array(z.string()) }).nullable(),
  notes: z.string().default(''),
});

export type RealPlayer = z.infer<typeof RealPlayerSchema>;
export type RealClub = z.infer<typeof RealClubSchema>;
export type RealCoach = z.infer<typeof RealCoachSchema>;
export type RealSource = z.infer<typeof SourceSchema>;

export interface RealDataset {
  name: string;
  season: number;
  sources: RealSource[];
  clubs: RealClub[];
  coaches: RealCoach[];
  players: RealPlayer[];
}

/** Statuses strong enough to place a real coach at a club. */
export const ASSIGNABLE: VerificationStatus[] = ['verified', 'reported'];

export function validateDataset(raw: { sources: unknown; clubs: unknown; coaches: unknown; players?: unknown }, name: string, season: number): RealDataset {
  const sources = z.array(SourceSchema).parse(raw.sources);
  const clubs = z.array(RealClubSchema).parse(raw.clubs);
  const coaches = z.array(RealCoachSchema).parse(raw.coaches);
  const players = z.array(RealPlayerSchema).parse(raw.players ?? []);
  const sourceIds = new Set(sources.map((s) => s.id));
  const clubRefs = new Set(clubs.map((c) => c.ref));
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const c of coaches) {
    if (seen.has(c.ref)) errors.push(`Duplicate coach ref ${c.ref}`);
    seen.add(c.ref);
    for (const s of c.sources) if (!sourceIds.has(s)) errors.push(`${c.ref}: unknown source ${s}`);
    if (c.assignment && !clubRefs.has(c.assignment.club)) errors.push(`${c.ref}: unknown club ${c.assignment.club}`);
    if (c.assignment && !ASSIGNABLE.includes(c.status)) errors.push(`${c.ref}: status ${c.status} cannot carry a club assignment`);
    if (c.status !== 'fictional' && c.sources.length === 0) errors.push(`${c.ref}: real coach without any source`);
    if (c.employment === 'employed' && !c.assignment) errors.push(`${c.ref}: employed coach without an assignment`);
  }
  const assigned = new Map<string, string>();
  for (const c of coaches) {
    if (c.assignment?.role !== 'head_coach') continue;
    const prev = assigned.get(c.assignment.club);
    if (prev) errors.push(`${c.assignment.club} has two head coaches: ${prev} and ${c.ref}`);
    assigned.set(c.assignment.club, c.ref);
  }
  for (const c of clubs) for (const s of c.sources) if (!sourceIds.has(s)) errors.push(`${c.ref}: unknown source ${s}`);
  const playerRefs = new Set<string>();
  for (const p of players) {
    if (playerRefs.has(p.ref)) errors.push(`Duplicate player ref ${p.ref}`);
    playerRefs.add(p.ref);
    for (const s of p.sources) if (!sourceIds.has(s)) errors.push(`${p.ref}: unknown source ${s}`);
    if (p.club && !clubRefs.has(p.club)) errors.push(`${p.ref}: unknown club ${p.club}`);
    if (p.club && !ASSIGNABLE.includes(p.status)) errors.push(`${p.ref}: status ${p.status} cannot carry a club assignment`);
  }
  if (errors.length) throw new Error(`Invalid dataset ${name}:\n${errors.join('\n')}`);
  return { name, season, sources, clubs, coaches, players };
}

export function loadRealDataset2026(): RealDataset {
  return validateDataset({ sources: sourcesJson, clubs: clubsJson, coaches: coachesJson, players: playersJson }, 'Real-world 2026-27 (researched 2026-11-03)', 2026);
}

// ---------------------------------------------------------------------------
// Coach data report
// ---------------------------------------------------------------------------

export const SIMULATED_APPOINTMENT = 'Simulated appointment';

export interface CoachDataReport {
  realCoaches: number;
  /** Real head coaches placed at their real club from sources. */
  realHeadCoachesAssigned: number;
  /** Real unattached coaches appointed in-game to clubs whose real coach is unknown. */
  simulatedRealAppointments: number;
  realUnattached: number;
  realAssistantsImported: number;
  fictionalCoaches: number;
  fictionalEmployed: number;
  clubs: number;
  clubsWithRealHeadCoach: number;
  missingOrUnverifiedAssignments: { clubId: string; club: string; field: string; severity: string; message: string; candidates: string[] }[];
  byStatus: Record<string, number>;
  sources: { id: string; title: string; url: string; accessedOn: string }[];
}

export function coachDataReport(world: World): CoachDataReport {
  const staff = Object.values(world.staff).filter((s) => !s.retired);
  const real = staff.filter((s) => s.verification.status !== 'fictional');
  const byStatus: Record<string, number> = {};
  for (const s of staff) byStatus[s.verification.status] = (byStatus[s.verification.status] ?? 0) + 1;
  const clubs = Object.values(world.clubs);
  const simulated = (s: Staff) => s.verification.notes.includes(SIMULATED_APPOINTMENT);
  const realHc = real.filter((s) => s.clubId && s.role === 'head_coach' && ASSIGNABLE.includes(s.verification.status) && !simulated(s));
  return {
    realCoaches: real.length,
    realHeadCoachesAssigned: realHc.length,
    simulatedRealAppointments: real.filter((s) => s.clubId && simulated(s)).length,
    realUnattached: real.filter((s) => !s.clubId && !s.marketExcluded).length,
    realAssistantsImported: real.filter((s) => s.role !== 'head_coach' && s.clubId).length,
    fictionalCoaches: staff.filter((s) => s.verification.status === 'fictional').length,
    fictionalEmployed: staff.filter((s) => s.verification.status === 'fictional' && s.clubId).length,
    clubs: clubs.length,
    clubsWithRealHeadCoach: new Set(realHc.map((s) => s.clubId)).size,
    missingOrUnverifiedAssignments: Object.values(world.dataIssues)
      .filter((d) => d.status === 'open')
      .map((d) => ({ clubId: d.entityId, club: world.clubs[d.entityId]?.name ?? d.entityId, field: d.field, severity: d.severity, message: d.message, candidates: d.candidates })),
    byStatus,
    sources: Object.values(world.dataSources).map((s) => ({ id: s.id, title: s.title, url: s.url, accessedOn: s.accessedOn })),
  };
}

export function coachDataReportMarkdown(r: CoachDataReport): string {
  const lines = [
    '| Metric | Count |',
    '|---|---|',
    `| Real coaches imported | ${r.realCoaches} |`,
    `| Real head coaches assigned to their real club (sourced) | ${r.realHeadCoachesAssigned} of ${r.clubs} clubs |`,
    `| Real unattached coaches appointed in-game to clubs with unknown coach | ${r.simulatedRealAppointments} |`,
    `| Real unattached coaches still on the free-agent market | ${r.realUnattached} |`,
    `| Real assistant coaches imported | ${r.realAssistantsImported} |`,
    `| Fictional coaches (total / employed) | ${r.fictionalCoaches} / ${r.fictionalEmployed} |`,
    `| Missing, conflicting or unverified assignments | ${r.missingOrUnverifiedAssignments.length} |`,
    '',
    '**By evidence status:** ' + Object.entries(r.byStatus).map(([k, v]) => `${k}: ${v}`).join(', '),
    '',
    '### Open data issues',
    '',
    '| Club / entity | Field | Severity | Detail |',
    '|---|---|---|---|',
    ...r.missingOrUnverifiedAssignments.map((d) => `| ${d.club} | ${d.field} | ${d.severity} | ${d.message}${d.candidates.length ? ` Candidates: ${d.candidates.join(', ')}.` : ''} |`),
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// User coach import (fill data gaps with the user's own sourced data)
// ---------------------------------------------------------------------------

export interface ImportLog {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
  messages: string[];
}

const UserCoachSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nationality: z.string().length(3).nullable().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  club: z.string().nullable().optional(),
  role: ROLE.default('head_coach'),
  sourceUrl: z.string().url(),
  verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function findClubByName(world: World, name: string): string | null {
  const n = normalize(name);
  for (const c of Object.values(world.clubs)) {
    if (normalize(c.name) === n || normalize(c.shortName) === n || c.sourceRef === name) return c.id;
  }
  return null;
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Imports user-supplied coach records (JSON array). Each record must cite a
 * source URL; matching real coaches are updated, never duplicated. Assigning a
 * coach to a post replaces only a missing/unverified post, never a reported one
 * unless `overrideReported` is set.
 */
export function importCoaches(world: World, raw: unknown, make: (role: StaffRole) => Staff, overrideReported = false): ImportLog {
  const log: ImportLog = { added: 0, updated: 0, skipped: 0, errors: [], messages: [] };
  if (!Array.isArray(raw)) return { ...log, errors: ['Expected a JSON array of coach records.'] };
  raw.forEach((row, i) => {
    const parsed = UserCoachSchema.safeParse(row);
    if (!parsed.success) {
      log.errors.push(`Row ${i + 1}: ${parsed.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`);
      log.skipped++;
      return;
    }
    const r = parsed.data;
    const sourceId = `user_${hashString(r.sourceUrl).toString(36)}`;
    world.dataSources[sourceId] ??= { id: sourceId, title: 'User-imported source', url: r.sourceUrl, publisher: new URL(r.sourceUrl).hostname, accessedOn: r.verifiedOn ?? world.meta.currentDate, method: 'User import' };
    let clubId: string | null = null;
    if (r.club) {
      clubId = findClubByName(world, r.club);
      if (!clubId) {
        log.errors.push(`Row ${i + 1}: club "${r.club}" not found.`);
        log.skipped++;
        return;
      }
    }
    // Duplicate detection by normalized name (+ birth date when both known).
    const existing = Object.values(world.staff).find(
      (s) => s.verification.status !== 'fictional' && normalize(s.firstName + s.lastName) === normalize(r.firstName + r.lastName) && (!s.birthDate || !r.birthDate || s.birthDate === r.birthDate),
    );
    const coach = existing ?? make(r.role);
    if (!existing) {
      coach.firstName = r.firstName;
      coach.lastName = r.lastName;
      coach.source = 'imported';
      coach.verification = { status: 'reported', sources: [], verifiedOn: null, missingFields: [], notes: 'User import' };
      world.staff[coach.id] = coach;
    }
    if (r.nationality) coach.nationality = r.nationality;
    if (r.birthDate) coach.birthDate = r.birthDate;
    coach.verification.sources = [...new Set([...coach.verification.sources, sourceId])];
    coach.verification.verifiedOn = r.verifiedOn ?? world.meta.currentDate;
    if (coach.verification.status !== 'verified') coach.verification.status = 'reported';
    coach.verification.missingFields = coach.verification.missingFields.filter((f) => !(f === 'nationality' && r.nationality) && !(f === 'birthDate' && r.birthDate));
    coach.marketExcluded = false;
    if (clubId) {
      const occupant = Object.values(world.staff).find((s) => s.clubId === clubId && s.role === r.role && s.id !== coach.id && !s.retired);
      if (occupant && ASSIGNABLE.includes(occupant.verification.status) && occupant.verification.status !== 'fictional' && !overrideReported) {
        log.errors.push(`Row ${i + 1}: ${world.clubs[clubId].name} already has a sourced ${r.role} (${occupant.firstName} ${occupant.lastName}).`);
      } else {
        if (occupant) occupant.clubId = null;
        coach.clubId = clubId;
        invalidateIndexes(world);
        coach.role = r.role;
        for (const d of Object.values(world.dataIssues)) {
          if (d.entityId === clubId && d.field === `staff:${r.role}` && d.status === 'open') d.status = 'resolved';
        }
        log.messages.push(`${coach.firstName} ${coach.lastName} assigned to ${world.clubs[clubId].name}.`);
      }
    }
    if (existing) log.updated++;
    else log.added++;
  });
  return log;
}

// ---------------------------------------------------------------------------
// Player import (CSV / JSON)
// ---------------------------------------------------------------------------

const PlayerRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nationality: z.string().min(2).max(3),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.coerce.number().min(150).max(240),
  weightKg: z.coerce.number().min(50).max(180),
  position: z.enum(['PG', 'SG', 'SF', 'PF', 'C']),
  secondaryPosition: z.enum(['PG', 'SG', 'SF', 'PF', 'C']).nullable().optional(),
  club: z.string().nullable().optional(),
  overall: z.coerce.number().min(20).max(99).optional(),
  potential: z.coerce.number().min(20).max(99).optional(),
  sourceRef: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.some((c) => c.trim() !== '')) rows.push(cur);
      cur = [];
    } else field += ch;
  }
  cur.push(field);
  if (cur.some((c) => c.trim() !== '')) rows.push(cur);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/**
 * Imports players. Players are tagged `imported`; game attributes are
 * generated from the supplied overall unless attribute columns are present.
 */
export function importPlayers(world: World, rows: Record<string, unknown>[]): ImportLog {
  const log: ImportLog = { added: 0, updated: 0, skipped: 0, errors: [], messages: [] };
  const now = new Date().toISOString();
  rows.forEach((row, i) => {
    const clean = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === '' ? undefined : v]));
    const parsed = PlayerRowSchema.safeParse(clean);
    if (!parsed.success) {
      log.errors.push(`Row ${i + 1}: ${parsed.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`);
      log.skipped++;
      return;
    }
    const r = parsed.data;
    let clubId: string | null = null;
    if (r.club) {
      clubId = findClubByName(world, r.club);
      if (!clubId) log.messages.push(`Row ${i + 1}: club "${r.club}" not found — imported as free agent.`);
    }
    const dup = Object.values(world.players).find(
      (p) => (r.sourceRef && p.sourceRef === r.sourceRef) || (normalize(p.firstName + p.lastName) === normalize(r.firstName + r.lastName) && p.birthDate === r.birthDate),
    );
    const rng = new Rng(hashString(`${r.firstName}${r.lastName}${r.birthDate}`));
    const attributes = { ...generateAttributes(rng, r.position, r.overall ?? 60) };
    const hasAttrColumns = ALL_ATTRIBUTES.some((k) => Number((row as Record<string, unknown>)[k]) > 0);
    for (const k of ALL_ATTRIBUTES) {
      const v = Number((row as Record<string, unknown>)[k]);
      if (Number.isFinite(v) && v > 0) attributes[k] = clamp(Math.round(v), 1, 100);
    }
    if (dup) {
      Object.assign(dup, { heightCm: r.heightCm, weightKg: r.weightKg, position: r.position, nationality: r.nationality, updatedAt: now });
      if (r.overall) dup.attributes = attributes;
      log.updated++;
      return;
    }
    const p: Player = {
      id: nextId(world, 'p'),
      firstName: r.firstName,
      lastName: r.lastName,
      nationality: r.nationality,
      birthDate: r.birthDate,
      heightCm: r.heightCm,
      weightKg: r.weightKg,
      position: r.position,
      secondaryPosition: r.secondaryPosition ?? null,
      clubId: null,
      jersey: null,
      attributes,
      potential: Math.max(r.potential ?? (r.overall ?? 60) + 3, r.overall ?? 60),
      morale: 65,
      fatigue: 0,
      loyalty: 50,
      injuryId: null,
      retired: false,
      source: 'imported',
      sourceRef: r.sourceRef ?? r.sourceUrl ?? null,
      ratingBasis: hasAttrColumns ? 'imported_attributes' : 'league_baseline',
      draftYear: null,
      createdAt: now,
      updatedAt: now,
    };
    world.players[p.id] = p;
    if (clubId) log.messages.push(`Row ${i + 1}: ${p.firstName} ${p.lastName} added as a free agent (club contracts must be signed in-game).`);
    log.added++;
  });
  return log;
}

export function openDataIssue(world: World, issue: Omit<DataIssue, 'id' | 'status'>): DataIssue {
  const d: DataIssue = { ...issue, id: nextId(world, 'di'), status: 'open' };
  world.dataIssues[d.id] = d;
  return d;
}

export { POSITIONS };

// ---------------------------------------------------------------------------
// Real player database report
// ---------------------------------------------------------------------------

export interface PlayerDataReport {
  realPlayers: number;
  realPlayersRatedFromStats: number;
  realPlayersBaselineRated: number;
  placeholderPlayers: number;
  clubs: { clubId: string; name: string; league: string; real: number; placeholders: number; required: number; status: string }[];
  clubsWithRealRoster: number;
  clubsMissingRoster: number;
  lockedCompetitions: { name: string; note: string }[];
  playableCompetitions: string[];
}

export function playerDataReport(world: World): PlayerDataReport {
  const players = Object.values(world.players).filter((p) => !p.retired);
  const real = players.filter((p) => p.source !== 'generated');
  const clubs = Object.values(world.clubs).map((c) => {
    const roster = players.filter((p) => p.clubId === c.id);
    const rules = world.rules[world.leagues[c.leagueId].rulesId];
    return {
      clubId: c.id, name: c.name, league: world.leagues[c.leagueId].shortName,
      real: roster.filter((p) => p.source !== 'generated').length,
      placeholders: roster.filter((p) => p.source === 'generated').length,
      required: rules.rosterMin, status: c.rosterSource,
    };
  });
  const leagues = Object.values(world.leagues);
  return {
    realPlayers: real.length,
    realPlayersRatedFromStats: real.filter((p) => p.ratingBasis === 'statistics').length,
    realPlayersBaselineRated: real.filter((p) => p.ratingBasis === 'league_baseline').length,
    placeholderPlayers: players.filter((p) => p.source === 'generated' && p.draftYear === null).length,
    clubs,
    clubsWithRealRoster: clubs.filter((c) => c.status === 'real').length,
    clubsMissingRoster: clubs.filter((c) => c.real < c.required).length,
    lockedCompetitions: leagues.filter((l) => !l.active).map((l) => ({ name: l.name, note: l.dataNote ?? '' })),
    playableCompetitions: leagues.filter((l) => l.active).map((l) => l.name),
  };
}

// ---------------------------------------------------------------------------
// Competition regulation schema (rules editor)
// ---------------------------------------------------------------------------

const SourceSchemaQ = z.discriminatedUnion('type', [
  z.object({ type: z.literal('league_position'), leagueId: z.string(), from: z.number().int().min(1), to: z.number().int().min(1) }),
  z.object({ type: z.literal('playoff_champion'), leagueId: z.string() }),
  z.object({ type: z.literal('playoff_runner_up'), leagueId: z.string() }),
  z.object({ type: z.literal('license'), clubIds: z.array(z.string()), untilSeason: z.number().int() }),
  z.object({ type: z.literal('wildcard'), minReputation: z.number().min(0).max(100), pool: z.enum(['any', 'european', 'domestic']) }),
  z.object({ type: z.literal('country_allocation'), country: z.string().length(3), leagueId: z.string() }),
  z.object({ type: z.literal('dropped_from'), leagueId: z.string() }),
]);

export const CompetitionRegulationSchema = z.object({
  leagueId: z.string(),
  fromSeason: z.number().int(),
  size: z.number().int().min(2).max(64),
  membership: z.enum(['closed', 'open', 'qualification']),
  promotion: z.object({ fromLeagueId: z.string(), places: z.number().int().min(1) }).nullable(),
  relegation: z.object({ toLeagueId: z.string(), places: z.number().int().min(1) }).nullable(),
  qualification: z.array(z.object({
    id: z.string().min(1), label: z.string(), source: SourceSchemaQ, entry: z.enum(['direct', 'qualifying_round']), places: z.number().int().min(1),
  })),
  qualifyingRound: z.object({ places: z.number().int().min(1) }).nullable(),
  priority: z.number().int().min(0),
  exclusive: z.boolean(),
  provenance: z.enum(['real_world', 'game_regulation']),
  notes: z.string(),
});

/** Validates an edited regulation against the world (ids must exist, rules must be coherent). */
export function validateRegulation(world: World, raw: unknown): { ok: true; value: import('@gbm/shared-types').CompetitionRegulation } | { ok: false; errors: string[] } {
  const parsed = CompetitionRegulationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  const r = parsed.data;
  const errors: string[] = [];
  if (!world.leagues[r.leagueId]) errors.push(`Unknown competition ${r.leagueId}`);
  if (r.fromSeason <= world.meta.season) errors.push(`Rules can only change for future seasons (from ${world.meta.season + 1}).`);
  if (r.qualifyingRound && r.qualifyingRound.places >= r.size) errors.push('Qualifying-round places must be fewer than the competition size.');
  if (r.membership !== 'qualification' && r.qualification.length) errors.push('Only qualification competitions use qualification rules.');
  for (const q of r.qualification) {
    const s = q.source;
    if ('leagueId' in s && !world.leagues[s.leagueId]) errors.push(`${q.id}: unknown competition ${s.leagueId}`);
    if (s.type === 'league_position' && s.to < s.from) errors.push(`${q.id}: 'to' must be >= 'from'`);
    if (s.type === 'license') for (const c of s.clubIds) if (!world.clubs[c]) errors.push(`${q.id}: unknown club ${c}`);
    if (q.entry === 'qualifying_round' && !r.qualifyingRound) errors.push(`${q.id}: uses a qualifying round but the competition has none`);
  }
  if (new Set(r.qualification.map((q) => q.id)).size !== r.qualification.length) errors.push('Rule ids must be unique.');
  if (r.relegation && r.relegation.toLeagueId === r.leagueId) errors.push('A league cannot relegate into itself.');
  return errors.length ? { ok: false, errors } : { ok: true, value: r };
}
