import type { AttributeKey, Attributes, Player, Position } from '@gbm/shared-types';
import { ALL_ATTRIBUTES, clamp } from '@gbm/shared-types';

type Weights = Partial<Record<AttributeKey, number>>;

/**
 * Position-dependent weights for the overall rating. Each set sums to 1.
 * A point guard is valued for creation and ball security, a center for
 * interior play, rebounding and rim protection.
 */
export const POSITION_WEIGHTS: Record<Position, Weights> = {
  PG: {
    ballHandling: 0.16, passing: 0.16, threePoint: 0.1, midRange: 0.06, layups: 0.07, offensiveIQ: 0.08,
    perimeterDefense: 0.08, steals: 0.05, speed: 0.07, acceleration: 0.05, basketballIQ: 0.07, freeThrow: 0.03,
    offBallMovement: 0.02,
  },
  SG: {
    threePoint: 0.15, midRange: 0.1, layups: 0.07, ballHandling: 0.08, offBallMovement: 0.08, offensiveIQ: 0.07,
    perimeterDefense: 0.1, steals: 0.05, speed: 0.06, acceleration: 0.05, freeThrow: 0.05, passing: 0.05,
    basketballIQ: 0.05, agility: 0.04,
  },
  SF: {
    threePoint: 0.1, midRange: 0.08, layups: 0.08, insideScoring: 0.06, dunking: 0.04, perimeterDefense: 0.1,
    helpDefense: 0.06, defensiveRebounding: 0.05, offensiveIQ: 0.07, defensiveIQ: 0.06, speed: 0.05, strength: 0.05,
    vertical: 0.04, ballHandling: 0.05, passing: 0.04, basketballIQ: 0.07,
  },
  PF: {
    insideScoring: 0.12, layups: 0.05, dunking: 0.05, midRange: 0.06, threePoint: 0.04, interiorDefense: 0.11,
    helpDefense: 0.07, defensiveRebounding: 0.11, offensiveRebounding: 0.07, blocks: 0.06, strength: 0.09,
    vertical: 0.05, defensiveIQ: 0.06, basketballIQ: 0.06,
  },
  C: {
    insideScoring: 0.14, dunking: 0.06, layups: 0.03, interiorDefense: 0.14, blocks: 0.1, defensiveRebounding: 0.13,
    offensiveRebounding: 0.09, strength: 0.11, vertical: 0.05, helpDefense: 0.06, defensiveIQ: 0.05, freeThrow: 0.02,
    basketballIQ: 0.02,
  },
};

const MENTAL_FOR_OVERALL: AttributeKey[] = ['consistency', 'basketballIQ', 'clutch', 'stamina'];

/** Overall rating for a set of attributes at a given position (1..100). */
export function overallForPosition(attrs: Attributes, position: Position): number {
  const w = POSITION_WEIGHTS[position];
  let total = 0;
  for (const k in w) total += attrs[k as AttributeKey] * (w[k as AttributeKey] ?? 0);
  let mental = 0;
  for (const k of MENTAL_FOR_OVERALL) mental += attrs[k];
  mental /= MENTAL_FOR_OVERALL.length;
  return clamp(Math.round(total * 0.9 + mental * 0.1), 1, 100);
}

export function playerOverall(player: Pick<Player, 'attributes' | 'position'>): number {
  return overallForPosition(player.attributes, player.position);
}

/** Best overall across primary and secondary positions. */
export function bestOverall(player: Pick<Player, 'attributes' | 'position' | 'secondaryPosition'>): number {
  const a = overallForPosition(player.attributes, player.position);
  if (!player.secondaryPosition) return a;
  return Math.max(a, overallForPosition(player.attributes, player.secondaryPosition) - 2);
}

export function attributeAverage(attrs: Attributes, keys: readonly AttributeKey[]): number {
  let s = 0;
  for (const k of keys) s += attrs[k];
  return s / keys.length;
}

/** Composite skill ratings used by the simulation and the UI. */
export function composites(attrs: Attributes) {
  return {
    rimScoring: attrs.insideScoring * 0.4 + attrs.layups * 0.3 + attrs.dunking * 0.15 + attrs.strength * 0.15,
    midScoring: attrs.midRange * 0.8 + attrs.offensiveIQ * 0.1 + attrs.consistency * 0.1,
    threeScoring: attrs.threePoint * 0.85 + attrs.offensiveIQ * 0.05 + attrs.consistency * 0.1,
    creation: attrs.ballHandling * 0.45 + attrs.passing * 0.25 + attrs.speed * 0.15 + attrs.offensiveIQ * 0.15,
    perimeterD: attrs.perimeterDefense * 0.55 + attrs.agility * 0.15 + attrs.speed * 0.1 + attrs.defensiveIQ * 0.2,
    interiorD: attrs.interiorDefense * 0.45 + attrs.blocks * 0.2 + attrs.strength * 0.15 + attrs.vertical * 0.1 + attrs.defensiveIQ * 0.1,
    rebounding: attrs.defensiveRebounding * 0.5 + attrs.offensiveRebounding * 0.2 + attrs.strength * 0.15 + attrs.vertical * 0.15,
  };
}

export function emptyAttributes(value = 50): Attributes {
  const a = {} as Attributes;
  for (const k of ALL_ATTRIBUTES) a[k] = value;
  return a;
}

export function ratingTier(overall: number): 'elite' | 'great' | 'good' | 'average' | 'weak' {
  if (overall >= 80) return 'elite';
  if (overall >= 72) return 'great';
  if (overall >= 64) return 'good';
  if (overall >= 55) return 'average';
  return 'weak';
}
