import type { Attributes, Position } from '@gbm/shared-types';
import { ALL_ATTRIBUTES, clamp } from '@gbm/shared-types';
import { overallForPosition } from './ratings';

/**
 * Real per-game statistics for a player's most recent season. These are the
 * only inputs used to rate real players — no hidden or invented values.
 */
export interface RealSeasonStats {
  season: number;
  league: string;
  gp: number;
  mpg: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg?: number;
  orpg?: number;
  fgPct: number; // 0..1
  tpPct: number; // 0..1
  ftPct: number; // 0..1
  tpaPg?: number;
  ftaPg?: number;
}

/** Competition strength offsets: identical stats mean more in a stronger league. */
export const LEAGUE_STRENGTH: Record<string, number> = {
  nba: 8, euroleague: 3, eurocup: 0, acb: 0, bsl: -1, gbl: -2, isr: -2, lba: -1, lnb: -1, bbl: -2, gleague: -3, ncaa: -6,
};

const r = (v: number) => clamp(Math.round(v), 20, 99);

/**
 * Converts real statistics into game attributes. Formula (documented in
 * GAME_RULES.md): per-36-minute production and shooting percentages map onto
 * the 1–100 scale, shifted by competition strength and playing-time trust;
 * physical attributes come from height and position. Shooting percentages are
 * regressed towards the mean for low volumes.
 */
export function attributesFromStats(position: Position, heightCm: number | null, s: RealSeasonStats): Attributes {
  const m = Math.max(s.mpg, 6);
  const per36 = 36 / m;
  const pts = s.ppg * per36;
  const reb = s.rpg * per36;
  const orb = (s.orpg ?? s.rpg * (position === 'C' || position === 'PF' ? 0.3 : 0.18)) * per36;
  const drb = Math.max(0, reb - orb);
  const ast = s.apg * per36;
  const stl = s.spg * per36;
  const blk = s.bpg * per36;
  const tov = (s.topg ?? s.apg * 0.45 + 0.8) * per36;
  const tpa = (s.tpaPg ?? s.ppg * 0.12) * per36;
  const fta = (s.ftaPg ?? s.ppg * 0.2) * per36;
  const level = LEAGUE_STRENGTH[s.league] ?? 0;
  const trust = clamp((s.mpg - 18) * 0.45, -6, 7) + clamp((s.gp - 20) * 0.08, -4, 2);
  const shift = level + trust;
  const big = position === 'C' || position === 'PF';
  const h = heightCm ?? { PG: 188, SG: 195, SF: 201, PF: 206, C: 211 }[position];

  // Regress shooting percentages by volume.
  const tpReg = (s.tpPct * tpa + 0.33 * 2) / (tpa + 2);
  const ftReg = (s.ftPct * fta + 0.74 * 2) / (fta + 2);
  const fgEff = s.fgPct - (big ? 0.54 : 0.45);

  const a = {} as Attributes;
  a.threePoint = r(45 + (tpReg - 0.33) * 260 + Math.min(tpa, 8) * 2.2 - (tpa < 0.8 ? 18 : 0) + shift);
  a.freeThrow = r((ftReg - 0.38) / 0.0058 + shift * 0.3);
  a.midRange = r((a.threePoint + a.freeThrow) / 2 + (pts - 14) * 0.6 + shift * 0.5);
  a.insideScoring = r(50 + (pts - 14) * 1.3 + fgEff * 120 + (big ? 8 : 0) + shift);
  a.layups = r(50 + (pts - 14) * 1.0 + fgEff * 90 + (position === 'PG' || position === 'SG' ? 4 : 0) + shift);
  a.dunking = r(40 + (h - 195) * 0.9 + fgEff * 60 + (pts - 14) * 0.5 + shift * 0.6);
  a.ballHandling = r(42 + ast * 4.2 - (big ? 8 : 0) + (pts - 14) * 0.5 + shift * 0.7);
  a.passing = r(40 + ast * 5.0 - Math.max(0, tov - ast * 0.5) * 2 + shift * 0.7);
  a.offensiveIQ = r(48 + (ast - tov) * 2.5 + (pts - 14) * 0.6 + fgEff * 60 + shift);
  a.offBallMovement = r(48 + (pts - 14) * 0.8 + fgEff * 60 + shift * 0.6);
  a.offensiveRebounding = r(30 + orb * 11 + shift * 0.4);
  a.defensiveRebounding = r(30 + drb * 5.2 + shift * 0.4);
  a.steals = r(35 + stl * 22 + shift * 0.4);
  a.blocks = r(28 + blk * 20 + (h - 200) * 0.4 + shift * 0.4);
  a.perimeterDefense = r(48 + stl * 9 + (big ? -10 : 2) + trust * 0.8 + level * 0.6);
  a.interiorDefense = r(42 + blk * 9 + drb * 1.4 + (big ? 8 : -6) + shift * 0.6);
  a.helpDefense = r(48 + (stl + blk) * 6 + trust * 0.7 + level * 0.5);
  a.defensiveIQ = r(50 + (stl + blk) * 5 + trust + level * 0.5);
  // Physical profile from height/position (no physical testing data available).
  const guardness = { PG: 1, SG: 0.75, SF: 0.45, PF: 0.2, C: 0 }[position];
  a.speed = r(55 + guardness * 22 - (h - 200) * 0.5 + level * 0.3);
  a.acceleration = r(55 + guardness * 20 - (h - 200) * 0.4 + level * 0.3);
  a.agility = r(55 + guardness * 18 - (h - 200) * 0.45 + level * 0.3);
  a.strength = r(50 + (1 - guardness) * 22 + (h - 200) * 0.4 + level * 0.3);
  a.vertical = r(55 + blk * 5 + orb * 2 + level * 0.3);
  a.stamina = r(45 + s.mpg * 1.1 + level * 0.2);
  // Mental attributes: only what production supports; others neutral.
  a.basketballIQ = r(50 + (ast - tov) * 2 + trust + level * 0.5);
  a.consistency = r(50 + clamp(s.gp - 30, -20, 30) * 0.4 + trust * 0.6);
  a.clutch = r(50 + (pts - 14) * 0.5 + level * 0.3);
  a.leadership = 50;
  a.workEthic = 55;
  a.teamChemistry = 55;
  for (const k of ALL_ATTRIBUTES) a[k] = clamp(a[k], 20, 99);
  return a;
}

/** Baseline attributes for a real player whose statistics are unavailable. */
export function baselineAttributes(_position: Position, leagueKey: string): Attributes {
  const level = 58 + (LEAGUE_STRENGTH[leagueKey] ?? 0);
  const a = {} as Attributes;
  for (const k of ALL_ATTRIBUTES) a[k] = level;
  return a;
}

export function overallFromStats(position: Position, heightCm: number | null, s: RealSeasonStats): number {
  return overallForPosition(attributesFromStats(position, heightCm, s), position);
}
