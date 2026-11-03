import type { Match, StandingRow, World } from '@gbm/shared-types';

function emptyRow(clubId: string): StandingRow {
  return {
    clubId,
    played: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    streak: 0,
    last10: '0-0',
  };
}

export function winPct(r: StandingRow): number {
  return r.played === 0 ? 0 : r.wins / r.played;
}

/** Regular-season matches for a league/season in chronological order. */
export function regularSeasonMatches(world: World, leagueId: string, season: number): Match[] {
  const out: Match[] = [];
  for (const m of Object.values(world.matches)) {
    if (m.leagueId !== leagueId || m.season !== season) continue;
    const f = world.fixtures[m.fixtureId];
    if (f && f.stage !== 'regular') continue;
    out.push(m);
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
}

/**
 * Computes standings from played matches. Tiebreakers, in order:
 * 1. Win percentage. 2. Head-to-head win percentage among tied clubs.
 * 3. Point differential. 4. Points scored. 5. Club id (stable).
 */
export function computeStandings(world: World, leagueId: string, season: number): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  // Participants of that season (history), falling back to current membership.
  const entries = (world.competitionEntries ?? []).filter((e) => e.season === season && e.leagueId === leagueId && e.status === 'confirmed');
  if (entries.length) for (const e of entries) rows.set(e.clubId, emptyRow(e.clubId));
  else for (const c of Object.values(world.clubs)) if (c.competitionIds.includes(leagueId)) rows.set(c.id, emptyRow(c.id));
  const matches = regularSeasonMatches(world, leagueId, season);
  const results = new Map<string, boolean[]>();
  for (const m of matches) {
    const home = rows.get(m.homeId) ?? emptyRow(m.homeId);
    const away = rows.get(m.awayId) ?? emptyRow(m.awayId);
    rows.set(m.homeId, home);
    rows.set(m.awayId, away);
    const homeWon = m.homeScore > m.awayScore;
    home.played++;
    away.played++;
    home.pointsFor += m.homeScore;
    home.pointsAgainst += m.awayScore;
    away.pointsFor += m.awayScore;
    away.pointsAgainst += m.homeScore;
    if (homeWon) {
      home.wins++; home.homeWins++; away.losses++; away.awayLosses++;
    } else {
      away.wins++; away.awayWins++; home.losses++; home.homeLosses++;
    }
    (results.get(m.homeId) ?? results.set(m.homeId, []).get(m.homeId)!).push(homeWon);
    (results.get(m.awayId) ?? results.set(m.awayId, []).get(m.awayId)!).push(!homeWon);
  }
  for (const [id, r] of rows) {
    const res = results.get(id) ?? [];
    let streak = 0;
    for (let i = res.length - 1; i >= 0; i--) {
      if (streak === 0) streak = res[i] ? 1 : -1;
      else if (res[i] === streak > 0) streak += streak > 0 ? 1 : -1;
      else break;
    }
    r.streak = streak;
    const last = res.slice(-10);
    r.last10 = `${last.filter(Boolean).length}-${last.filter((x) => !x).length}`;
  }
  return sortStandings([...rows.values()], matches);
}

export function sortStandings(rows: StandingRow[], matches: Match[]): StandingRow[] {
  const byPct = [...rows].sort((a, b) => winPct(b) - winPct(a));
  const out: StandingRow[] = [];
  let i = 0;
  while (i < byPct.length) {
    let j = i + 1;
    while (j < byPct.length && winPct(byPct[j]) === winPct(byPct[i])) j++;
    const group = byPct.slice(i, j);
    if (group.length > 1) {
      const ids = new Set(group.map((g) => g.clubId));
      const h2h = new Map<string, { w: number; g: number }>();
      for (const id of ids) h2h.set(id, { w: 0, g: 0 });
      for (const m of matches) {
        if (!ids.has(m.homeId) || !ids.has(m.awayId)) continue;
        const winner = m.homeScore > m.awayScore ? m.homeId : m.awayId;
        h2h.get(m.homeId)!.g++;
        h2h.get(m.awayId)!.g++;
        h2h.get(winner)!.w++;
      }
      const pct = (id: string) => {
        const x = h2h.get(id)!;
        return x.g === 0 ? 0 : x.w / x.g;
      };
      group.sort(
        (a, b) =>
          pct(b.clubId) - pct(a.clubId) ||
          b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
          b.pointsFor - a.pointsFor ||
          (a.clubId < b.clubId ? -1 : 1),
      );
    }
    out.push(...group);
    i = j;
  }
  return out;
}
