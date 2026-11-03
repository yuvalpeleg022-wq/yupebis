import type { AttributeKey, Attributes, DataSource, Player, Position, Rng, World } from '@gbm/shared-types';
import { ALL_ATTRIBUTES, addDays, clamp, nextId } from '@gbm/shared-types';
import { NAME_POOLS } from './names';
import { overallForPosition } from './ratings';

/** Relative attribute strengths per position (added to the target level). */
const ARCHETYPE: Record<Position, Partial<Record<AttributeKey, number>>> = {
  PG: {
    ballHandling: 14, passing: 14, speed: 10, acceleration: 10, agility: 8, threePoint: 5, offensiveIQ: 6, steals: 5,
    perimeterDefense: 3, freeThrow: 6, insideScoring: -12, dunking: -12, interiorDefense: -18, blocks: -20,
    defensiveRebounding: -14, offensiveRebounding: -18, strength: -12, vertical: -2,
  },
  SG: {
    threePoint: 12, midRange: 9, offBallMovement: 8, freeThrow: 7, speed: 6, acceleration: 6, agility: 5,
    perimeterDefense: 4, ballHandling: 4, interiorDefense: -14, blocks: -16, defensiveRebounding: -10,
    offensiveRebounding: -14, strength: -8, insideScoring: -6,
  },
  SF: {
    perimeterDefense: 6, layups: 4, midRange: 3, threePoint: 3, vertical: 4, helpDefense: 3, dunking: 2,
    blocks: -6, interiorDefense: -4, passing: -2, ballHandling: -2,
  },
  PF: {
    insideScoring: 8, defensiveRebounding: 9, offensiveRebounding: 7, strength: 9, interiorDefense: 8, blocks: 4,
    helpDefense: 4, dunking: 4, ballHandling: -12, passing: -6, speed: -6, acceleration: -6, threePoint: -6,
    steals: -6, perimeterDefense: -6,
  },
  C: {
    insideScoring: 12, interiorDefense: 14, blocks: 14, defensiveRebounding: 14, offensiveRebounding: 12,
    strength: 14, dunking: 8, ballHandling: -22, passing: -10, speed: -14, acceleration: -14, agility: -12,
    threePoint: -18, midRange: -8, steals: -10, perimeterDefense: -14, freeThrow: -10,
  },
};

const HEIGHT_RANGE: Record<Position, [number, number]> = {
  PG: [180, 193],
  SG: [189, 199],
  SF: [196, 206],
  PF: [202, 211],
  C: [207, 220],
};

const SECONDARY: Record<Position, Position[]> = {
  PG: ['SG'],
  SG: ['PG', 'SF'],
  SF: ['SG', 'PF'],
  PF: ['SF', 'C'],
  C: ['PF'],
};

export function generateAttributes(rng: Rng, position: Position, targetOverall: number, spread = 7): Attributes {
  const attrs = {} as Attributes;
  const profile = ARCHETYPE[position];
  for (const k of ALL_ATTRIBUTES) {
    attrs[k] = targetOverall + (profile[k] ?? 0) + rng.normal(0, spread);
  }
  // Mental attributes are individual traits, less tied to the overall level.
  for (const k of ['leadership', 'workEthic', 'teamChemistry', 'clutch', 'consistency'] as const) {
    attrs[k] = 35 + rng.normal(25, 14) + (targetOverall - 60) * 0.3;
  }
  // Shift all values until the overall matches the target.
  for (let iter = 0; iter < 12; iter++) {
    const rounded = roundAttrs(attrs);
    const diff = targetOverall - overallForPosition(rounded, position);
    if (Math.abs(diff) < 1) break;
    for (const k of ALL_ATTRIBUTES) attrs[k] += diff;
  }
  return roundAttrs(attrs);
}

function roundAttrs(a: Attributes): Attributes {
  const out = {} as Attributes;
  for (const k of ALL_ATTRIBUTES) out[k] = clamp(Math.round(a[k]), 15, 99);
  return out;
}

export interface GeneratePlayerOptions {
  rng: Rng;
  position: Position;
  age: number;
  overall: number;
  potential?: number;
  nationality?: string;
  clubId?: string | null;
  /** Reference date used to compute the birth date. */
  onDate: string;
  source?: DataSource;
}

export function randomNationality(rng: Rng, region: 'north_america' | 'europe' | 'any'): string {
  if (region === 'north_america') return rng.chance(0.78) ? 'USA' : rng.pick(NAME_POOLS).nationality;
  if (region === 'europe') return rng.chance(0.25) ? 'USA' : rng.pick(NAME_POOLS.filter((p) => p.nationality !== 'USA')).nationality;
  return rng.pick(NAME_POOLS).nationality;
}

export function generatePlayer(world: Pick<World, 'meta'>, opts: GeneratePlayerOptions): Player {
  const { rng, position, age, onDate } = opts;
  const nationality = opts.nationality ?? randomNationality(rng, 'any');
  const pool = NAME_POOLS.find((p) => p.nationality === nationality) ?? NAME_POOLS[0];
  const [hMin, hMax] = HEIGHT_RANGE[position];
  const heightCm = Math.round(rng.range(hMin, hMax));
  const weightKg = Math.round(heightCm * 0.47 + rng.normal(0, 5) - (position === 'PG' ? 6 : 0));
  const attributes = generateAttributes(rng, position, opts.overall);
  const potentialDefault = opts.overall + Math.max(0, (27 - age) * rng.range(1.2, 3.2)) + rng.normal(0, 3);
  const potential = clamp(Math.round(opts.potential ?? Math.max(opts.overall, potentialDefault)), opts.overall, 99);
  const birthDate = addDays(onDate, -Math.round(age * 365.25 + rng.int(0, 360)));
  const id = nextId(world, 'p');
  const now = new Date().toISOString();
  return {
    id,
    firstName: rng.pick(pool.first),
    lastName: rng.pick(pool.last),
    nationality,
    birthDate,
    heightCm,
    weightKg,
    position,
    secondaryPosition: rng.chance(0.6) ? rng.pick(SECONDARY[position]) : null,
    clubId: opts.clubId ?? null,
    jersey: null,
    attributes,
    potential,
    morale: Math.round(rng.range(55, 80)),
    fatigue: 0,
    loyalty: Math.round(rng.range(20, 85)),
    injuryId: null,
    retired: false,
    source: opts.source ?? 'generated',
    sourceRef: null,
    ratingBasis: 'generated',
    unverifiedFields: [],
    draftYear: null,
    createdAt: now,
    updatedAt: now,
  };
}
