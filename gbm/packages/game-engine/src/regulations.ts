import type { CompetitionRegulation, QualificationRule, World } from '@gbm/shared-types';

/**
 * Default competition regulations for SIMULATED seasons (2027-28 onwards).
 *
 * The 2026-27 memberships come from the real-world dataset. Real 2027-28
 * qualification rules were not available from authorized sources in this
 * session, so the regulations below are GAME REGULATIONS (provenance
 * 'game_regulation'), modelled on the general structure of European basketball
 * and fully editable in the Competition Rules editor. The only real-world
 * facts used are marked in rule labels with their source.
 */
export function defaultRegulations(world: World, fromSeason: number): CompetitionRegulation[] {
  const regs: CompetitionRegulation[] = [];
  const has = (id: string) => !!world.leagues[id];
  const clubByRef = (ref: string) => Object.values(world.clubs).find((c) => c.sourceRef === ref)?.id ?? null;
  const domesticIds = ['lg_acb', 'lg_bsl', 'lg_gbl', 'lg_isr', 'lg_lba', 'lg_lnb', 'lg_bbl'].filter(has);
  const pos = (leagueId: string, from: number, to: number, places: number, entry: 'direct' | 'qualifying_round', tag: string): QualificationRule => ({
    id: `${tag}_${leagueId}_${from}`, label: `${world.leagues[leagueId].shortName} positions ${from}–${to}`, source: { type: 'league_position', leagueId, from, to }, entry, places,
  });

  if (has('lg_nba')) {
    regs.push({ leagueId: 'lg_nba', fromSeason, size: 30, membership: 'closed', promotion: null, relegation: null, qualification: [], qualifyingRound: null, priority: 0, exclusive: false, provenance: 'real_world', notes: 'Closed league: franchises keep their place; no promotion or relegation.' });
  }
  for (const id of domesticIds) {
    regs.push({
      leagueId: id, fromSeason, size: 18, membership: 'open', promotion: null,
      relegation: { toLeagueId: `${id}_2`, places: 2 }, qualification: [], qualifyingRound: null, priority: 0, exclusive: false,
      provenance: 'game_regulation',
      notes: 'Game regulation: bottom two relegated. The second division is not in the database, so relegation is reported as suspended until one is added (Rules editor / data import).',
    });
  }
  if (has('lg_euroleague')) {
    const el = world.leagues.lg_euroleague;
    const elClubs = Object.values(world.clubs).filter((c) => c.competitionIds.includes(el.id));
    const fener = clubByRef('el:fen');
    const oneYear = new Set(['el:prs', 'el:bjk', 'el:hta'].map(clubByRef));
    const assumed = elClubs.map((c) => c.id).filter((id) => id !== fener && !oneYear.has(id));
    regs.push({
      leagueId: el.id, fromSeason, size: 20, membership: 'qualification', promotion: null, relegation: null, qualifyingRound: null,
      priority: 1, exclusive: true, provenance: 'game_regulation',
      notes: 'EuroLeague (20 clubs, reported). Licence terms other than Fenerbahçe are not verified: other 2026-27 members (except one-year wildcards Paris and Beşiktaş, and Hapoel Tel Aviv\'s temporary licence) are treated as licence holders through 2030 as a game assumption.',
      qualification: [
        ...(fener ? [{ id: 'el_lic_fen', label: 'Fenerbahçe 10-year licence (reported: Eurohoops)', source: { type: 'license' as const, clubIds: [fener], untilSeason: 2035 }, entry: 'direct' as const, places: 1 }] : []),
        { id: 'el_lic_assumed', label: 'Long-term licences (game assumption)', source: { type: 'license', clubIds: assumed, untilSeason: 2030 }, entry: 'direct', places: assumed.length },
        { id: 'el_ec_champ', label: 'EuroCup champion', source: { type: 'playoff_champion', leagueId: 'lg_eurocup' }, entry: 'direct', places: 1 },
        { id: 'el_ec_runner', label: 'EuroCup runner-up', source: { type: 'playoff_runner_up', leagueId: 'lg_eurocup' }, entry: 'direct', places: 1 },
        { id: 'el_wildcard', label: 'Wildcards (reputation)', source: { type: 'wildcard', minReputation: 55, pool: 'any' }, entry: 'direct', places: 20 },
      ],
    });
  }
  if (has('lg_eurocup')) {
    const share: Record<string, number> = { lg_acb: 3, lg_bsl: 3, lg_lba: 2, lg_lnb: 2, lg_bbl: 2, lg_gbl: 2, lg_isr: 2 };
    regs.push({
      leagueId: 'lg_eurocup', fromSeason, size: 20, membership: 'qualification', promotion: null, relegation: null, qualifyingRound: null,
      priority: 2, exclusive: true, provenance: 'game_regulation',
      notes: 'Game regulation (the real EuroCup has 32 clubs; scaled to the clubs in the database). EuroLeague clubs that lose their place drop here; domestic places cascade to the next eligible club.',
      qualification: [
        { id: 'ec_dropped', label: 'Dropped from EuroLeague', source: { type: 'dropped_from', leagueId: 'lg_euroleague' }, entry: 'direct', places: 4 },
        ...domesticIds.map((id) => pos(id, 1, 6, share[id] ?? 2, 'direct', 'ec')),
        { id: 'ec_wildcard', label: 'Wildcards (reputation)', source: { type: 'wildcard', minReputation: 40, pool: 'domestic' }, entry: 'direct', places: 20 },
      ],
    });
  }
  if (has('lg_bcl')) {
    regs.push({
      leagueId: 'lg_bcl', fromSeason, size: 16, membership: 'qualification', promotion: null, relegation: null, qualifyingRound: { places: 4 },
      priority: 3, exclusive: true, provenance: 'game_regulation',
      notes: 'Game regulation modelled on a FIBA club competition with a qualifying round: 12 direct places, 4 decided by a knockout qualifying round.',
      qualification: [
        ...domesticIds.map((id) => pos(id, 1, 10, 1, 'direct', 'bcl')),
        { id: 'bcl_wildcard', label: 'Direct wildcards', source: { type: 'wildcard', minReputation: 30, pool: 'domestic' }, entry: 'direct', places: 12 },
        ...domesticIds.map((id) => pos(id, 1, 12, 1, 'qualifying_round', 'bclq')),
        { id: 'bclq_wildcard', label: 'Qualifying-round wildcards', source: { type: 'wildcard', minReputation: 20, pool: 'domestic' }, entry: 'qualifying_round', places: 8 },
      ],
    });
  }
  return regs;
}
