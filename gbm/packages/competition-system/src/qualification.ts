import type {
  CompetitionEntry,
  CompetitionRegulation,
  EntryReason,
  QualificationRule,
  World,
} from '@gbm/shared-types';
import { computeStandings } from './standings';

// ---------------------------------------------------------------------------
// Regulation lookup
// ---------------------------------------------------------------------------

/** The regulation in force for a competition in a given season. */
export function regulationFor(world: World, leagueId: string, season: number): CompetitionRegulation | null {
  let best: CompetitionRegulation | null = null;
  for (const r of world.regulations) {
    if (r.leagueId !== leagueId || r.fromSeason > season) continue;
    // Later versions for the same season override earlier ones (rules editor).
    if (!best || r.fromSeason >= best.fromSeason) best = r;
  }
  return best;
}

export function entriesFor(world: World, season: number, leagueId?: string): CompetitionEntry[] {
  return world.competitionEntries.filter((e) => e.season === season && (!leagueId || e.leagueId === leagueId));
}

// ---------------------------------------------------------------------------
// Season results used by qualification
// ---------------------------------------------------------------------------

export interface LeagueResult {
  leagueId: string;
  /** Final regular-season order (club ids). */
  order: string[];
  champion: string | null;
  runnerUp: string | null;
  played: boolean;
}

export function seasonResults(world: World, season: number): Map<string, LeagueResult> {
  const out = new Map<string, LeagueResult>();
  for (const league of Object.values(world.leagues)) {
    const archived = world.seasonStandings.filter((s) => s.season === season && s.leagueId === league.id).sort((a, b) => a.rank - b.rank);
    const order = archived.length ? archived.map((s) => s.row.clubId) : computeStandings(world, league.id, season).map((r) => r.clubId);
    const summary = world.seasonSummaries.find((s) => s.season === season && s.leagueId === league.id);
    const played = Object.values(world.matches).some((m) => m.leagueId === league.id && m.season === season) || archived.length > 0;
    out.set(league.id, { leagueId: league.id, order: played ? order : [], champion: summary?.championId ?? null, runnerUp: summary?.runnerUpId ?? null, played });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

export interface AllocationNote {
  leagueId: string;
  message: string;
}

export interface AllocationResult {
  entries: CompetitionEntry[];
  notes: AllocationNote[];
}

/**
 * Computes every competition's membership for `nextSeason` from the results of
 * `season`. Order: closed and open (domestic) leagues first, including
 * promotion and relegation; then qualification competitions by priority, so a
 * club already placed in a higher exclusive competition is skipped and the
 * place cascades to the next eligible club.
 */
export function allocateNextSeason(world: World, season: number, results = seasonResults(world, season)): AllocationResult {
  const nextSeason = season + 1;
  const entries: CompetitionEntry[] = [];
  const notes: AllocationNote[] = [];
  const regs = Object.keys(world.leagues)
    .map((id) => regulationFor(world, id, nextSeason))
    .filter((r): r is CompetitionRegulation => !!r);
  const current = (leagueId: string) => entriesFor(world, season, leagueId).filter((e) => e.status === 'confirmed').map((e) => e.clubId);
  const add = (leagueId: string, clubId: string, reason: EntryReason, ruleId: string | null, detail: string, pending = false) =>
    entries.push({ season: nextSeason, leagueId, clubId, reason, ruleId, status: pending ? 'pending_qualifier' : 'confirmed', detail });

  // --- 1. Domestic and closed leagues, with promotion / relegation --------
  const domesticOf = new Map<string, string>(); // club -> domestic league next season
  const relegated = new Map<string, string>(); // club -> destination league
  const promoted = new Map<string, string>();
  for (const reg of regs.filter((r) => r.membership !== 'qualification')) {
    const members = current(reg.leagueId);
    if (reg.relegation) {
      const res = results.get(reg.leagueId);
      if (!world.leagues[reg.relegation.toLeagueId]) {
        notes.push({ leagueId: reg.leagueId, message: `Relegation (${reg.relegation.places}) suspended: the lower division is not in the database.` });
      } else if (!res?.played) {
        notes.push({ leagueId: reg.leagueId, message: 'Relegation skipped: the league was not played this season.' });
      } else {
        const bottom = res.order.filter((c) => members.includes(c)).slice(-reg.relegation.places);
        for (const c of bottom) relegated.set(c, reg.relegation.toLeagueId);
      }
    }
    if (reg.promotion) {
      const res = results.get(reg.promotion.fromLeagueId);
      if (!world.leagues[reg.promotion.fromLeagueId] || !res?.played) {
        notes.push({ leagueId: reg.leagueId, message: 'Promotion skipped: the lower division was not played or is not in the database.' });
      } else {
        const lower = current(reg.promotion.fromLeagueId);
        for (const c of res.order.filter((x) => lower.includes(x)).slice(0, reg.promotion.places)) promoted.set(c, reg.leagueId);
      }
    }
  }
  for (const reg of regs.filter((r) => r.membership !== 'qualification')) {
    for (const c of current(reg.leagueId)) {
      if (relegated.has(c) || promoted.has(c)) continue;
      add(reg.leagueId, c, 'member', null, 'Retained place');
      domesticOf.set(c, reg.leagueId);
    }
  }
  for (const [c, to] of relegated) {
    add(to, c, 'relegated', null, `Relegated from ${world.leagues[[...regs].find((r) => r.relegation?.toLeagueId === to)!.leagueId].name}`);
    domesticOf.set(c, to);
  }
  for (const [c, to] of promoted) {
    add(to, c, 'promoted', null, `Promoted from ${world.leagues[regs.find((r) => r.leagueId === to)!.promotion!.fromLeagueId].name}`);
    domesticOf.set(c, to);
  }

  // --- 2. Qualification competitions, by priority --------------------------
  const exclusiveTaken = new Set<string>();
  for (const reg of regs.filter((r) => r.membership === 'qualification').sort((a, b) => a.priority - b.priority)) {
    const placed = new Set<string>();
    const pending: string[] = [];
    // Eligibility: regional competitions only admit clubs whose home league is
    // in the same region (e.g. no NBA franchise in European competitions).
    const region = world.leagues[reg.leagueId]?.region;
    const homeRegion = (c: string) => world.leagues[domesticOf.get(c) ?? world.clubs[c]?.leagueId]?.region;
    const eligible = (c: string) =>
      !!world.clubs[c] && !placed.has(c) && !pending.includes(c) && !(reg.exclusive && exclusiveTaken.has(c)) && homeRegion(c) === region;
    const directCap = reg.size - (reg.qualifyingRound?.places ?? 0);
    const room = (rule: QualificationRule) => (rule.entry === 'direct' ? directCap - placed.size : Infinity);
    for (const rule of reg.qualification) {
      let budget = Math.min(rule.places, room(rule));
      if (budget <= 0) continue;
      const take = (c: string, reason: EntryReason, detail: string) => {
        if (!eligible(c) || budget <= 0) return;
        if (rule.entry === 'qualifying_round') pending.push(c);
        else placed.add(c);
        add(reg.leagueId, c, reason, rule.id, detail, rule.entry === 'qualifying_round');
        budget--;
      };
      const src = rule.source;
      switch (src.type) {
        case 'license':
          if (src.untilSeason >= nextSeason) for (const c of src.clubIds) take(c, 'license', `Licence valid through ${src.untilSeason}`);
          break;
        case 'playoff_champion': {
          const r = results.get(src.leagueId);
          if (r?.champion) take(r.champion, 'champion', `${world.leagues[src.leagueId]?.name} champion ${season}`);
          break;
        }
        case 'playoff_runner_up': {
          const r = results.get(src.leagueId);
          if (r?.runnerUp) take(r.runnerUp, 'runner_up', `${world.leagues[src.leagueId]?.name} runner-up ${season}`);
          break;
        }
        case 'league_position': {
          const r = results.get(src.leagueId);
          if (!r?.played) break;
          // Cascade: positions from..to, extended by the number of places so the
          // next best eligible club inherits a place when a club is ineligible.
          const last = src.to + rule.places;
          for (let pos = src.from; pos <= Math.min(last, r.order.length) && budget > 0; pos++) {
            take(r.order[pos - 1], 'position', `${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'} in ${world.leagues[src.leagueId]?.name} ${season}`);
          }
          break;
        }
        case 'country_allocation': {
          const r = results.get(src.leagueId);
          if (!r?.played) break;
          for (const c of r.order) if (world.clubs[c]?.country === src.country) take(c, 'country', `${src.country} allocation from ${world.leagues[src.leagueId]?.name}`);
          break;
        }
        case 'dropped_from':
          for (const c of current(src.leagueId)) take(c, 'dropped', `Did not re-qualify for ${world.leagues[src.leagueId]?.name}`);
          break;
        case 'wildcard': {
          const pool = Object.values(world.clubs)
            .filter((c) => c.reputation >= src.minReputation)
            .filter((c) => (src.pool === 'european' ? world.regulations.some((g) => g.membership === 'qualification' && current(g.leagueId).includes(c.id)) : src.pool === 'domestic' ? domesticOf.has(c.id) : true))
            .sort((a, b) => b.reputation - a.reputation || a.id.localeCompare(b.id));
          for (const c of pool) take(c.id, 'wildcard', `Invitation (reputation ${c.reputation})`);
          break;
        }
      }
    }
    if (reg.qualifyingRound && pending.length > 0 && pending.length < reg.qualifyingRound.places * 2) {
      notes.push({ leagueId: reg.leagueId, message: `Qualifying round has ${pending.length} entrants for ${reg.qualifyingRound.places} places; byes granted to the best seeds.` });
    }
    if (placed.size + Math.min(pending.length, reg.qualifyingRound?.places ?? 0) < reg.size) {
      notes.push({ leagueId: reg.leagueId, message: `${placed.size + Math.min(pending.length, reg.qualifyingRound?.places ?? 0)} of ${reg.size} places filled.` });
    }
    if (reg.exclusive) for (const c of [...placed, ...pending]) exclusiveTaken.add(c);
  }
  return { entries, notes };
}

/**
 * Validates a set of entries: a club may play at most one domestic/closed
 * league and at most one exclusive competition per season.
 */
export function entryConflicts(world: World, entries: CompetitionEntry[]): string[] {
  const problems: string[] = [];
  const bySeasonClub = new Map<string, CompetitionEntry[]>();
  for (const e of entries) {
    if (e.status === 'eliminated') continue;
    const k = `${e.season}:${e.clubId}`;
    (bySeasonClub.get(k) ?? bySeasonClub.set(k, []).get(k)!).push(e);
  }
  for (const [k, list] of bySeasonClub) {
    const regs = list.map((e) => ({ e, r: regulationFor(world, e.leagueId, e.season) }));
    const domestic = regs.filter((x) => x.r && x.r.membership !== 'qualification');
    const exclusive = regs.filter((x) => x.r?.exclusive);
    if (domestic.length > 1) problems.push(`${k}: in ${domestic.length} domestic leagues (${domestic.map((x) => x.e.leagueId).join(', ')})`);
    if (exclusive.length > 1) problems.push(`${k}: in ${exclusive.length} exclusive competitions (${exclusive.map((x) => x.e.leagueId).join(', ')})`);
    const dup = new Set<string>();
    for (const x of list) {
      if (dup.has(x.leagueId)) problems.push(`${k}: entered ${x.leagueId} twice`);
      dup.add(x.leagueId);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Zones for standings and the qualification dashboard
// ---------------------------------------------------------------------------

export interface StandingsZone {
  from: number;
  to: number;
  label: string;
  kind: 'qualification' | 'qualifying_round' | 'promotion' | 'relegation';
  targetLeagueId: string;
}

/** Position bands in a league that lead to other competitions next season. */
export function standingsZones(world: World, leagueId: string, season: number): StandingsZone[] {
  const zones: StandingsZone[] = [];
  const next = season + 1;
  for (const id of Object.keys(world.leagues)) {
    const reg = regulationFor(world, id, next);
    if (!reg) continue;
    if (reg.leagueId === leagueId && reg.relegation) {
      const size = Object.values(world.clubs).filter((c) => c.competitionIds.includes(leagueId)).length;
      zones.push({ from: size - reg.relegation.places + 1, to: size, label: `Relegation to ${world.leagues[reg.relegation.toLeagueId]?.name ?? 'lower division (not in database)'}`, kind: 'relegation', targetLeagueId: reg.relegation.toLeagueId });
    }
    if (reg.promotion?.fromLeagueId === leagueId) zones.push({ from: 1, to: reg.promotion.places, label: `Promotion to ${world.leagues[reg.leagueId].name}`, kind: 'promotion', targetLeagueId: reg.leagueId });
    for (const rule of reg.qualification) {
      if (rule.source.type === 'league_position' && rule.source.leagueId === leagueId) {
        zones.push({ from: rule.source.from, to: rule.source.to, label: `${world.leagues[reg.leagueId].name}${rule.entry === 'qualifying_round' ? ' qualifying round' : ''}`, kind: rule.entry === 'qualifying_round' ? 'qualifying_round' : 'qualification', targetLeagueId: reg.leagueId });
      }
    }
  }
  return zones.sort((a, b) => a.from - b.from);
}
