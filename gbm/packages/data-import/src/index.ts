import { z } from 'zod';
import type { DataIssue, Player, Staff, StaffRole, VerificationStatus, World } from '@gbm/shared-types';
import { ALL_ATTRIBUTES, POSITIONS, clamp, nextId } from '@gbm/shared-types';
import { generateAttributes } from '@gbm/player-system';
import { Rng, hashString } from '@gbm/shared-types';
import sourcesJson from '../data/real-2026-27/sources.json';
import clubsJson from '../data/real-2026-27/clubs.json';
import coachesJson from '../data/real-2026-27/coaches.json';

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

export type RealClub = z.infer<typeof RealClubSchema>;
export type RealCoach = z.infer<typeof RealCoachSchema>;
export type RealSource = z.infer<typeof SourceSchema>;

export interface RealDataset {
  name: string;
  season: number;
  sources: RealSource[];
  clubs: RealClub[];
  coaches: RealCoach[];
}

/** Statuses strong enough to place a real coach at a club. */
export const ASSIGNABLE: VerificationStatus[] = ['verified', 'reported'];

export function validateDataset(raw: { sources: unknown; clubs: unknown; coaches: unknown }, name: string, season: number): RealDataset {
  const sources = z.array(SourceSchema).parse(raw.sources);
  const clubs = z.array(RealClubSchema).parse(raw.clubs);
  const coaches = z.array(RealCoachSchema).parse(raw.coaches);
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
  if (errors.length) throw new Error(`Invalid dataset ${name}:\n${errors.join('\n')}`);
  return { name, season, sources, clubs, coaches };
}

export function loadRealDataset2026(): RealDataset {
  return validateDataset({ sources: sourcesJson, clubs: clubsJson, coaches: coachesJson }, 'Real-world 2026-27 (researched 2026-11-03)', 2026);
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
