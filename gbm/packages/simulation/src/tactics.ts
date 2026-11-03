import type { DefensiveScheme, Tactics } from '@gbm/shared-types';
import { clamp } from '@gbm/shared-types';
import { composites } from '@gbm/player-system';
import type { SimPlayerInput } from './match';

export const DEFAULT_TACTICS: Tactics = {
  pace: 50,
  fastBreak: 50,
  pickAndRoll: 50,
  isolation: 50,
  motion: 50,
  postUp: 50,
  threePointFocus: 50,
  ballMovement: 50,
  defense: 'man',
  pressure: 50,
  doubleTeams: 30,
};

export const DEFENSE_LABELS: Record<DefensiveScheme, string> = {
  man: 'Man-to-Man',
  zone: 'Zone Defense',
  press: 'Full Court Press',
  switch: 'Switch Everything',
  drop: 'Drop Coverage',
};

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export interface FitBreakdown {
  total: number;
  items: { label: string; value: number }[];
}

/**
 * Tactical compatibility between the chosen system and the personnel.
 * Positive values mean the players suit the system. Range roughly ±0.04,
 * applied by the engine as a modifier on shot quality and turnovers.
 */
export function tacticalFitBreakdown(t: Tactics, players: Pick<SimPlayerInput, 'attributes' | 'position'>[]): FitBreakdown {
  if (players.length === 0) return { total: 0, items: [] };
  const c = players.map((p) => composites(p.attributes));
  const a = players.map((p) => p.attributes);
  const items: { label: string; value: number }[] = [];
  const add = (label: string, weight: number, skill: number) => {
    // weight: how far the slider is from neutral (-1..1); skill: personnel quality relative to 60.
    const v = weight * (skill - 60) * 0.0012;
    if (Math.abs(weight) > 0.05) items.push({ label, value: v });
  };
  add('Pace vs. team speed', (t.pace - 50) / 50, avg(a.map((x) => (x.speed + x.stamina) / 2)));
  add('Fast break vs. athleticism', (t.fastBreak - 50) / 50, avg(a.map((x) => (x.speed + x.acceleration) / 2)));
  add('Three-point focus vs. shooting', (t.threePointFocus - 50) / 50, avg(c.map((x) => x.threeScoring)));
  add('Post-up vs. interior scoring', (t.postUp - 50) / 50, Math.max(...c.map((x) => x.rimScoring)));
  add('Pick & roll vs. creators', (t.pickAndRoll - 50) / 50, Math.max(...c.map((x) => x.creation)) * 0.6 + Math.max(...c.map((x) => x.rimScoring)) * 0.4);
  add('Isolation vs. shot creation', (t.isolation - 50) / 50, Math.max(...c.map((x) => x.creation)));
  add('Ball movement vs. passing', (t.ballMovement - 50) / 50, avg(a.map((x) => x.passing)));
  add('Motion vs. basketball IQ', (t.motion - 50) / 50, avg(a.map((x) => (x.basketballIQ + x.offBallMovement) / 2)));
  add('Defensive pressure vs. perimeter D', (t.pressure - 50) / 50, avg(c.map((x) => x.perimeterD)));
  if (t.defense === 'switch') add('Switching vs. versatility', 0.6, avg(a.map((x) => (x.agility + x.perimeterDefense + x.strength) / 3)));
  if (t.defense === 'press') add('Press vs. stamina', 0.6, avg(a.map((x) => x.stamina)));
  if (t.defense === 'zone') add('Zone vs. help defense', 0.5, avg(a.map((x) => x.helpDefense)));
  if (t.defense === 'drop') add('Drop vs. rim protection', 0.5, Math.max(...c.map((x) => x.interiorD)));
  const total = clamp(items.reduce((s, i) => s + i.value, 0), -0.04, 0.04);
  return { total, items };
}

export function tacticalFit(t: Tactics, players: Pick<SimPlayerInput, 'attributes' | 'position'>[]): number {
  return tacticalFitBreakdown(t, players).total;
}
