import type { AttributeKey, Player, Rng, TrainingFocus } from '@gbm/shared-types';
import { ALL_ATTRIBUTES, MENTAL_ATTRIBUTES, PHYSICAL_ATTRIBUTES, clamp } from '@gbm/shared-types';
import { playerOverall } from './ratings';

/** Which attributes each training focus emphasises (multiplier on growth). */
export const TRAINING_FOCUS_ATTRS: Record<TrainingFocus, AttributeKey[]> = {
  balanced: [],
  shooting: ['threePoint', 'midRange', 'freeThrow'],
  ball_handling: ['ballHandling', 'agility', 'offensiveIQ'],
  strength: ['strength', 'vertical', 'insideScoring'],
  conditioning: ['stamina', 'speed', 'acceleration'],
  defense: ['perimeterDefense', 'interiorDefense', 'helpDefense', 'defensiveIQ', 'steals', 'blocks'],
  playmaking: ['passing', 'ballHandling', 'basketballIQ'],
  recovery: [],
  youth: [],
};

const SHOOTING = new Set<AttributeKey>(['threePoint', 'midRange', 'freeThrow']);

export const TRAINING_FOCUS_LABEL: Record<TrainingFocus, string> = {
  balanced: 'Balanced',
  shooting: 'Shooting',
  ball_handling: 'Ball Handling',
  strength: 'Strength',
  conditioning: 'Conditioning',
  defense: 'Defense',
  playmaking: 'Playmaking',
  recovery: 'Recovery',
  youth: 'Individual Development (Youth)',
};

export interface DevelopmentContext {
  rng: Rng;
  age: number;
  /** Share of available minutes played this season (0..1). */
  minutesShare: number;
  /** Player development coaching quality, 1..100. */
  coachRating: number;
  /** Shooting coach quality, 1..100. */
  shootingCoach: number;
  /** Staff training quality, 1..100. */
  trainingQuality: number;
  focus: TrainingFocus;
  /** Fraction of a year this tick represents (monthly tick = 1/12). */
  yearFraction: number;
}

/** Expected yearly growth in overall points from potential gap and age. */
export function yearlyGrowth(age: number, gap: number): number {
  if (gap <= 0) return 0;
  const ageFactor = age <= 19 ? 0.36 : age <= 21 ? 0.3 : age <= 23 ? 0.24 : age <= 25 ? 0.16 : age <= 27 ? 0.08 : 0.02;
  return gap * ageFactor;
}

/** Yearly decline for physical and skill attributes by age. */
export function yearlyDecline(age: number): { physical: number; skill: number } {
  return {
    physical: age >= 29 ? (age - 28) * 0.7 : 0,
    skill: age >= 32 ? (age - 31) * 0.55 : 0,
  };
}

function stochasticRound(rng: Rng, v: number): number {
  const base = Math.floor(v);
  return base + (rng.chance(v - base) ? 1 : 0);
}

/**
 * Applies one development tick to a player in place. Returns the change in
 * overall rating so callers can create news for notable progress.
 */
export function developPlayer(player: Player, ctx: DevelopmentContext): number {
  const before = playerOverall(player);
  const gap = player.potential - before;
  const ethic = player.attributes.workEthic / 100;
  const growthMult =
    (0.55 + ethic * 0.7) *
    (0.75 + (ctx.coachRating / 100) * 0.4) *
    (0.9 + (ctx.trainingQuality / 100) * 0.2) *
    (0.75 + clamp(ctx.minutesShare, 0, 1) * 0.5) *
    (ctx.focus === 'youth' && ctx.age <= 23 ? 1.15 : 1);
  const growth = yearlyGrowth(ctx.age, gap) * growthMult;
  const decline = yearlyDecline(ctx.age);
  if (ctx.focus === 'recovery') {
    decline.physical *= 0.85;
  }
  const focusAttrs = new Set(TRAINING_FOCUS_ATTRS[ctx.focus]);
  const physical = new Set<AttributeKey>(PHYSICAL_ATTRIBUTES);
  const mental = new Set<AttributeKey>(MENTAL_ATTRIBUTES);

  for (const k of ALL_ATTRIBUTES) {
    if (k === 'workEthic' || k === 'teamChemistry' || k === 'leadership') continue;
    let yearly = growth;
    if (focusAttrs.size > 0) yearly *= focusAttrs.has(k) ? 1.7 : 0.8;
    if (SHOOTING.has(k)) yearly = yearly * (0.8 + (ctx.shootingCoach / 100) * 0.45) + (ctx.shootingCoach - 60) * 0.02;
    if (physical.has(k)) yearly -= decline.physical * (k === 'stamina' || k === 'strength' ? 0.7 : 1);
    else if (mental.has(k)) yearly += ctx.age >= 24 && ctx.age <= 33 ? 0.6 : 0.2;
    else yearly -= decline.skill;
    const delta = yearly * ctx.yearFraction + ctx.rng.normal(0, 0.6 * Math.sqrt(ctx.yearFraction));
    const applied = stochasticRound(ctx.rng, delta);
    if (applied !== 0) player.attributes[k] = clamp(player.attributes[k] + applied, 15, 99);
  }
  // Leadership grows slowly with experience.
  if (ctx.age >= 25 && ctx.rng.chance(0.15 * ctx.yearFraction * 12 / 12)) {
    player.attributes.leadership = clamp(player.attributes.leadership + 1, 1, 99);
  }
  return playerOverall(player) - before;
}

/**
 * Season-end potential re-evaluation: young players can break out or stall.
 * Returns 'breakout' | 'stall' | null.
 */
export function seasonPotentialShift(player: Player, age: number, rng: Rng): 'breakout' | 'stall' | null {
  if (age > 24) {
    // Potential converges towards current ability for veterans.
    const ovr = playerOverall(player);
    if (player.potential > ovr) player.potential = Math.max(ovr, player.potential - 2);
    return null;
  }
  const r = rng.next();
  if (r < 0.05) {
    player.potential = clamp(player.potential + rng.int(4, 9), 1, 99);
    for (const k of ALL_ATTRIBUTES) {
      if (rng.chance(0.4)) player.attributes[k] = clamp(player.attributes[k] + rng.int(1, 3), 15, 99);
    }
    return 'breakout';
  }
  if (r < 0.1) {
    player.potential = Math.max(playerOverall(player), player.potential - rng.int(3, 7));
    return 'stall';
  }
  return null;
}

/** Probability that a player retires at the end of the season. */
export function retirementChance(age: number, overall: number): number {
  if (age < 31) return 0;
  const base = age >= 40 ? 0.95 : age >= 37 ? 0.55 : age >= 35 ? 0.3 : age >= 33 ? 0.12 : 0.04;
  const qualityAdj = overall >= 75 ? -0.08 : overall < 55 ? 0.12 : 0;
  return clamp(base + qualityAdj, 0, 0.98);
}
