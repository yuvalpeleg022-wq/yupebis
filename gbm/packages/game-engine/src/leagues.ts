import type { League } from '@gbm/shared-types';


/**
 * Playable league definitions. Formats follow the publicly known structure of
 * each competition, simplified where noted (e.g. no NBA play-in tournament).
 * Monetary values are in-game figures.
 */
export const LEAGUE_DEFS: Record<string, League> = {
  nba: {
    id: 'lg_nba',
    name: 'NBA',
    shortName: 'NBA',
    country: 'USA',
    region: 'north_america',
    rulesId: 'nba',
    tier: 1,
    // 3 full round robins with 30 clubs = 87 games (real NBA: 82 with unbalanced schedule).
    roundRobins: 3,
    daysBetweenRounds: 2,
    seasonStartMonthDay: '10-20',
    playoff: { teams: 16, seriesLengths: [7, 7, 7, 7], neutralRounds: [] },
    tvRevenuePerClub: 150_000_000,
    salaryScale: { min: 1_200_000, max: 50_000_000 },
    currency: 'USD',
    source: 'generated',
    active: true,
  },
  euroleague: {
    id: 'lg_euroleague',
    name: 'EuroLeague',
    shortName: 'EL',
    country: 'EUR',
    region: 'europe',
    rulesId: 'euroleague',
    tier: 1,
    // 20 clubs, double round robin = 38 rounds (matches the real regular-season length).
    roundRobins: 2,
    daysBetweenRounds: 5,
    // Thursday / Tuesday rhythm (double-round weeks); domestic leagues play on Sundays.
    roundGaps: [5, 2, 7],
    seasonStartMonthDay: '09-24',
    // Simplified: top 8 play best-of-5, then a neutral-site Final Four (no play-in).
    playoff: { teams: 8, seriesLengths: [5, 1, 1], neutralRounds: [1, 2] },
    tvRevenuePerClub: 9_000_000,
    salaryScale: { min: 80_000, max: 6_000_000 },
    currency: 'EUR',
    source: 'generated',
    active: true,
  },
  eurocup: {
    id: 'lg_eurocup', name: 'EuroCup', shortName: 'EC', country: 'EUR', region: 'europe', rulesId: 'eurocup', tier: 2,
    roundRobins: 1, daysBetweenRounds: 7, seasonStartMonthDay: '09-30',
    playoff: { teams: 8, seriesLengths: [3, 3, 3], neutralRounds: [] },
    tvRevenuePerClub: 2_000_000, salaryScale: { min: 50_000, max: 2_500_000 }, currency: 'EUR', source: 'generated',
    // 2026-27 participants are not in the database; filled by qualification from 2027-28.
    active: false,
    dataNote: '2026-27 participants not in the database (real field: 32 clubs, reported). Populated by qualification from 2027-28.',
  },
  bcl: {
    id: 'lg_bcl', name: 'Basketball Champions League', shortName: 'BCL', country: 'EUR', region: 'europe', rulesId: 'eurocup', tier: 3,
    roundRobins: 1, daysBetweenRounds: 7, seasonStartMonthDay: '10-07',
    playoff: { teams: 8, seriesLengths: [3, 1, 1], neutralRounds: [1, 2] },
    tvRevenuePerClub: 1_000_000, salaryScale: { min: 40_000, max: 2_000_000 }, currency: 'EUR', source: 'generated',
    active: false,
    dataNote: '2026-27 participants not in the database. Populated by qualification (with a qualifying round) from 2027-28.',
  },
};

function domestic(id: string, name: string, shortName: string, country: string, max: number, tv: number, dataNote: string): League {
  return {
    id: `lg_${id}`, name, shortName, country, region: 'europe', rulesId: 'fiba_domestic', tier: 1, roundRobins: 2,
    // Weekly Sunday rounds (2026-10-04 is a Sunday) so they never clash with EuroLeague Tuesdays/Thursdays.
    daysBetweenRounds: 7, seasonStartMonthDay: '10-04', playoff: { teams: 8, seriesLengths: [3, 5, 5], neutralRounds: [] },
    tvRevenuePerClub: tv, salaryScale: { min: 40_000, max }, currency: 'EUR', source: 'generated',
    active: true,
    dataNote,
  };
}

const PARTIAL = (found: string) => `Partial league: only the clubs named in this session's sources are included (${found}). Missing clubs can be added via data import.`;

/** Domestic leagues (playable; EuroLeague clubs also take part). */
export const DOMESTIC_LEAGUE_DEFS: Record<string, League> = {
  acb: domestic('acb', 'Liga ACB', 'ACB', 'ESP', 3_000_000, 2_000_000, 'All 18 clubs named in sources.'),
  bsl: domestic('bsl', 'Basketbol Süper Ligi', 'BSL', 'TUR', 2_500_000, 1_500_000, PARTIAL('9 of 16')),
  gbl: domestic('gbl', 'Greek Basket League', 'GBL', 'GRC', 2_000_000, 800_000, PARTIAL('7; full size not confirmed')),
  isr: domestic('isr', 'Israeli Basketball Premier League', 'IBPL', 'ISR', 1_500_000, 700_000, PARTIAL('7 of 14')),
  lba: domestic('lba', 'Lega Basket Serie A', 'LBA', 'ITA', 2_000_000, 1_000_000, PARTIAL('9 of 16')),
  lnb: domestic('lnb', 'Betclic Élite', 'LNB', 'FRA', 1_500_000, 900_000, PARTIAL('9 of 16')),
  bbl: domestic('bbl', 'easyCredit BBL', 'BBL', 'DEU', 1_500_000, 900_000, PARTIAL('8 of 18')),
};

/** Leagues the system is designed for but whose data is not available yet. */
export const PLANNED_LEAGUES = ['EuroCup', 'G League', 'Australian NBL', 'Chinese CBA', 'Japanese B.League', 'NCAA'];
