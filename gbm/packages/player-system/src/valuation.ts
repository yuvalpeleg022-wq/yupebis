import type { Player } from '@gbm/shared-types';
import { clamp, hashString } from '@gbm/shared-types';
import { playerOverall } from './ratings';

export interface SalaryScale {
  min: number;
  max: number;
}

/** Contract value a player expects in a league with the given salary scale. */
export function askingSalary(overall: number, age: number, potential: number, scale: SalaryScale): number {
  // Young high-potential players price in their future; veterans discount.
  const effective = overall + (age <= 23 ? (potential - overall) * 0.25 : 0) - (age >= 33 ? (age - 32) * 1.5 : 0);
  const x = clamp((effective - 44) / 44, 0, 1);
  const salary = scale.min + (scale.max - scale.min) * Math.pow(x, 3.1);
  return roundSalary(Math.max(scale.min, salary));
}

export function roundSalary(v: number): number {
  if (v >= 1_000_000) return Math.round(v / 50_000) * 50_000;
  return Math.round(v / 5_000) * 5_000;
}

export function marketValue(overall: number, age: number, potential: number, scale: SalaryScale): number {
  const salary = askingSalary(overall, age, potential, scale);
  const ageMult = age <= 22 ? 3 : age <= 26 ? 2.4 : age <= 29 ? 1.8 : age <= 32 ? 1.0 : 0.4;
  return roundSalary(salary * ageMult);
}

/** Preferred contract length (years) based on age. */
export function preferredYears(age: number, overall: number): number {
  if (age >= 33) return 1;
  if (age >= 30) return 2;
  if (overall >= 72) return 4;
  return 3;
}

/**
 * Scouting uncertainty: an observer's estimate of a player's potential.
 * The error is deterministic per (player, observer) pair so it does not
 * flicker between screens, and shrinks with scouting quality and familiarity.
 */
export function scoutPotential(
  player: Pick<Player, 'id' | 'potential' | 'attributes' | 'position'>,
  observerId: string,
  scoutRating: number,
  familiar: boolean,
): { low: number; high: number; estimate: number } {
  const overall = playerOverall(player);
  const accuracy = clamp(scoutRating, 1, 100) / 100;
  const maxError = (familiar ? 3 : 10) * (1.3 - accuracy);
  const h = hashString(`${player.id}:${observerId}`);
  const bias = ((h % 2001) / 1000 - 1) * maxError; // [-maxError, +maxError]
  const estimate = clamp(Math.round(player.potential + bias), overall, 99);
  const halfWidth = Math.max(1, Math.round(maxError * 0.8));
  return {
    estimate,
    low: clamp(estimate - halfWidth, overall, 99),
    high: clamp(estimate + halfWidth, overall, 99),
  };
}
