import type { AiPersonality, Club, Player, Rng, Rotation, Tactics, World } from '@gbm/shared-types';
import { ageOn, clamp } from '@gbm/shared-types';
import { bestOverall, composites, playerOverall } from '@gbm/player-system';
import { teamMinutes } from '@gbm/competition-system';
import { contractForPlayer, payroll } from '@gbm/finance-system';
import { clubRules, freeAgents, negotiate, playerAsk, releasePlayer, rosterOf, signContract, signingSeason, validateRelease, validateSigning } from '@gbm/transfer-system';
import { headCoach } from '@gbm/staff-system';

export const PERSONALITY_LABEL: Record<AiPersonality, string> = {
  win_now: 'Win Now',
  youth_development: 'Youth Development',
  financial_conservative: 'Financial Conservative',
  aggressive_trader: 'Aggressive Trader',
  superstar_collector: 'Superstar Collector',
  defensive_specialist: 'Defensive Specialist',
  rebuilding: 'Rebuilding Club',
};

const isGuard = (p: Player) => p.position === 'PG' || p.position === 'SG' || p.secondaryPosition === 'PG';
const isBig = (p: Player) => p.position === 'PF' || p.position === 'C' || p.secondaryPosition === 'C';

export function isAvailable(world: World, p: Player): boolean {
  return !p.injuryId || !world.injuries[p.injuryId] || world.injuries[p.injuryId].daysRemaining <= 0;
}

/** Ranking value used for rotations; youth-focused clubs bias towards young players. */
function rotationValue(world: World, club: Club, p: Player): number {
  let v = bestOverall(p);
  if ((club.aiPersonality === 'youth_development' || club.aiPersonality === 'rebuilding') && ageOn(p.birthDate, world.meta.currentDate) <= 23) v += 3;
  if (club.aiPersonality === 'defensive_specialist') {
    const c = composites(p.attributes);
    v += ((c.perimeterD + c.interiorD) / 2 - 60) * 0.08;
  }
  return v;
}

const MINUTE_TEMPLATE_48 = [34, 33, 32, 31, 30, 24, 20, 16, 12, 8];

/** Builds a sensible rotation from healthy players. */
export function autoRotation(world: World, clubId: string): Rotation {
  const club = world.clubs[clubId];
  const { rules } = clubRules(world, clubId);
  const healthy = rosterOf(world, clubId).filter((p) => isAvailable(world, p));
  const ranked = [...healthy].sort((a, b) => rotationValue(world, club, b) - rotationValue(world, club, a));
  const starters = ranked.slice(0, 5);
  const bench = ranked.slice(5);
  const swapIn = (pred: (p: Player) => boolean) => {
    if (starters.some(pred)) return;
    const idx = bench.findIndex(pred);
    if (idx < 0) return;
    // Replace the weakest starter that is not needed for the other group.
    for (let i = starters.length - 1; i >= 0; i--) {
      const rest = starters.filter((_, j) => j !== i);
      if ((pred === isGuard || rest.some(isBig)) && (pred === isBig || rest.some(isGuard))) {
        const [out] = starters.splice(i, 1, bench[idx]);
        bench.splice(idx, 1, out);
        return;
      }
    }
  };
  swapIn(isGuard);
  swapIn(isBig);
  bench.sort((a, b) => rotationValue(world, club, b) - rotationValue(world, club, a));
  const order = [...starters, ...bench];
  const total = teamMinutes(rules);
  const scale = total / 240;
  const minutes: Record<string, number> = {};
  order.forEach((p, i) => (minutes[p.id] = Math.round((MINUTE_TEMPLATE_48[i] ?? 0) * scale)));
  normalizeMinutes(minutes, order.map((p) => p.id), total);
  for (const p of rosterOf(world, clubId)) if (!(p.id in minutes)) minutes[p.id] = 0;
  return { starters: starters.map((p) => p.id), minutes, auto: true };
}

/** Adjusts minutes so they sum exactly to the team total (5 × game length). */
export function normalizeMinutes(minutes: Record<string, number>, order: string[], total: number) {
  const ids = order.filter((id) => (minutes[id] ?? 0) > 0);
  let sum = ids.reduce((s, id) => s + minutes[id], 0);
  if (sum === 0 || ids.length === 0) return;
  for (const id of ids) minutes[id] = Math.round((minutes[id] * total) / sum);
  sum = ids.reduce((s, id) => s + minutes[id], 0);
  let i = 0;
  while (sum !== total && i < 1000) {
    const id = ids[i % ids.length];
    const delta = sum < total ? 1 : -1;
    if (minutes[id] + delta >= 0 && minutes[id] + delta <= 48) {
      minutes[id] += delta;
      sum += delta;
    }
    i++;
  }
}

export interface GameRotation {
  starters: string[];
  minutes: Record<string, number>;
  available: Player[];
  warnings: string[];
}

/**
 * Turns a club's saved rotation into a valid game-day rotation: injured
 * players are removed, starters replaced, and the minutes redistributed.
 */
export function gameDayRotation(world: World, clubId: string): GameRotation {
  const club = world.clubs[clubId];
  const { rules } = clubRules(world, clubId);
  const warnings: string[] = [];
  const base = club.rotation.auto ? autoRotation(world, clubId) : club.rotation;
  const roster = rosterOf(world, clubId);
  const healthy = roster.filter((p) => isAvailable(world, p));
  const available = [...healthy]
    .sort((a, b) => (base.minutes[b.id] ?? 0) - (base.minutes[a.id] ?? 0) || playerOverall(b) - playerOverall(a))
    .slice(0, rules.gameRosterMax);
  const ids = new Set(available.map((p) => p.id));
  const starters = base.starters.filter((id) => ids.has(id));
  for (const id of base.starters) if (!ids.has(id) && world.players[id]) warnings.push(`${world.players[id].lastName} is unavailable and will not start.`);
  const fill = available.filter((p) => !starters.includes(p.id)).sort((a, b) => (base.minutes[b.id] ?? 0) - (base.minutes[a.id] ?? 0) || playerOverall(b) - playerOverall(a));
  while (starters.length < 5 && fill.length) starters.push(fill.shift()!.id);
  const minutes: Record<string, number> = {};
  for (const p of available) minutes[p.id] = base.minutes[p.id] ?? 0;
  for (const id of starters) if (minutes[id] < 20) minutes[id] = Math.max(minutes[id], 20);
  const total = teamMinutes(rules);
  normalizeMinutes(minutes, available.map((p) => p.id), total);
  return { starters, minutes, available, warnings };
}

/** Chooses tactics that suit the roster and the head coach's philosophy. */
export function aiTactics(world: World, clubId: string): Tactics {
  const roster = rosterOf(world, clubId).sort((a, b) => playerOverall(b) - playerOverall(a)).slice(0, 8);
  const club = world.clubs[clubId];
  const c = roster.map((p) => composites(p.attributes));
  const avg = (f: (i: number) => number) => (roster.length ? roster.reduce((s, _, i) => s + f(i), 0) / roster.length : 60);
  const three = avg((i) => c[i].threeScoring);
  const speed = avg((i) => roster[i].attributes.speed);
  const passing = avg((i) => roster[i].attributes.passing);
  const bigRim = Math.max(60, ...c.map((x) => x.rimScoring));
  const creator = Math.max(60, ...c.map((x) => x.creation));
  const perimD = avg((i) => c[i].perimeterD);
  const hc = headCoach(world, clubId);
  const phil = hc?.philosophy ?? 'balanced';
  const s = (v: number) => clamp(Math.round(v), 10, 90);
  const t: Tactics = {
    pace: s(50 + (speed - 60) * 1.2 + (phil === 'pace_and_space' ? 12 : 0) - (phil === 'post_oriented' ? 8 : 0)),
    fastBreak: s(50 + (speed - 60) * 1.4),
    pickAndRoll: s(50 + (creator - 70) * 1.2),
    isolation: s(40 + (creator - 72) * 1.5),
    motion: s(50 + (passing - 60) * 1.0 + (phil === 'motion_offense' ? 15 : 0)),
    postUp: s(40 + (bigRim - 70) * 1.5 + (phil === 'post_oriented' ? 15 : 0)),
    threePointFocus: s(50 + (three - 58) * 1.5 + (phil === 'pace_and_space' ? 12 : 0)),
    ballMovement: s(50 + (passing - 60) * 1.2),
    defense: phil === 'defense_first' && perimD > 64 ? 'switch' : bigRim > 75 ? 'drop' : perimD < 56 ? 'zone' : 'man',
    pressure: s(50 + (perimD - 60) * 1.2 + (club.aiPersonality === 'defensive_specialist' || phil === 'defense_first' ? 12 : 0)),
    doubleTeams: s(30),
  };
  return t;
}

export interface AiSigning {
  playerId: string;
  clubId: string;
  salary: number;
  years: number;
}

/** Scores a free agent for an AI club given its personality and needs. */
function targetScore(world: World, club: Club, p: Player, needGuard: boolean, needBig: boolean): number {
  const age = ageOn(p.birthDate, world.meta.currentDate);
  const ovr = playerOverall(p);
  let v = ovr;
  switch (club.aiPersonality) {
    case 'youth_development':
    case 'rebuilding':
      v += age <= 23 ? (p.potential - ovr) * 0.4 : age >= 30 ? -6 : 0;
      break;
    case 'win_now':
    case 'superstar_collector':
      v += age >= 27 && age <= 32 ? 3 : 0;
      v += ovr >= 75 ? 4 : 0;
      break;
    case 'defensive_specialist': {
      const c = composites(p.attributes);
      v += ((c.perimeterD + c.interiorD) / 2 - 60) * 0.2;
      break;
    }
    default:
      break;
  }
  if (needGuard && isGuard(p)) v += 4;
  if (needBig && isBig(p)) v += 4;
  return v;
}

/** AI fills empty roster spots from the free-agent pool within its means. */
export function aiFillRoster(world: World, clubId: string, rng: Rng, maxSignings = 3): AiSigning[] {
  const club = world.clubs[clubId];
  const { rules } = clubRules(world, clubId);
  const signings: AiSigning[] = [];
  for (let i = 0; i < maxSignings; i++) {
    const roster = rosterOf(world, clubId);
    const desired = club.aiPersonality === 'financial_conservative' ? rules.rosterMin : Math.min(rules.rosterMax, rules.rosterMin + 1);
    if (roster.length >= desired) break;
    const needGuard = roster.filter(isGuard).length < 4;
    const needBig = roster.filter(isBig).length < 4;
    const pool = freeAgents(world)
      .map((p) => ({ p, s: targetScore(world, club, p, needGuard, needBig) + rng.normal(0, 1.5) }))
      .sort((a, b) => b.s - a.s);
    let signed = false;
    for (const { p } of pool.slice(0, 25)) {
      const ask = playerAsk(world, p, club, 'free_agent');
      const frugal = club.aiPersonality === 'financial_conservative' ? 0.98 : 1.0;
      let salary = Math.round((ask * frugal) / 10_000) * 10_000;
      // Over a soft cap, clubs can only offer minimum deals.
      const v0 = validateSigning(world, clubId, p.id, { salary, years: 1 }, 'free_agent');
      if (!v0.ok && rules.salaryCap.type === 'soft') salary = rules.salaryCap.minSalary;
      const age = ageOn(p.birthDate, world.meta.currentDate);
      const years = age >= 32 ? 1 : rng.int(1, 3);
      const v = validateSigning(world, clubId, p.id, { salary, years }, 'free_agent');
      if (!v.ok) continue;
      // Minimum deals are accepted by players nobody else wants.
      const resp = negotiate(world, clubId, p.id, { salary, years }, 'free_agent');
      const accepts = resp.accepted || (salary <= rules.salaryCap.minSalary * 1.05 && ask <= rules.salaryCap.minSalary * 1.6);
      if (!accepts) continue;
      signContract(world, clubId, p.id, { salary, years }, 'free_agent');
      signings.push({ playerId: p.id, clubId, salary, years });
      signed = true;
      break;
    }
    if (!signed) break;
  }
  // Emergency: below the league minimum, sign the best eligible player on a minimum deal.
  for (let guard = 0; guard < 8 && rosterOf(world, clubId).length < rules.rosterMin; guard++) {
    const salary = rules.salaryCap.minSalary;
    const pick = freeAgents(world)
      .filter((p) => validateSigning(world, clubId, p.id, { salary, years: 1 }, 'free_agent').ok)
      .sort((a, b) => playerOverall(b) - playerOverall(a))[0];
    if (!pick) break;
    signContract(world, clubId, pick.id, { salary, years: 1 }, 'free_agent');
    signings.push({ playerId: pick.id, clubId, salary, years: 1 });
  }
  return signings;
}

/** Off-season: AI decides which expiring players to re-sign. Returns renewed ids. */
export function aiRenewals(world: World, clubId: string, rng: Rng): string[] {
  const club = world.clubs[clubId];
  const renewed: string[] = [];
  const season = world.meta.season;
  const expiring = rosterOf(world, clubId).filter((p) => {
    const c = contractForPlayer(world, p.id);
    return c && c.endSeason === season && !Object.values(world.contracts).some((x) => x.active && x.playerId === p.id && x.startSeason > season);
  });
  const ranked = expiring.sort((a, b) => playerOverall(b) - playerOverall(a));
  for (const p of ranked) {
    const age = ageOn(p.birthDate, world.meta.currentDate);
    const ovr = playerOverall(p);
    const teamAvg = rosterOf(world, clubId).map(playerOverall).sort((a, b) => b - a).slice(0, 10);
    const median = teamAvg[Math.floor(teamAvg.length / 2)] ?? 60;
    let want = ovr >= median - 2;
    if (club.aiPersonality === 'youth_development' || club.aiPersonality === 'rebuilding') want = want ? age <= 30 : age <= 23 && p.potential >= median;
    if (club.aiPersonality === 'financial_conservative' && ovr < median + 2) want = rng.chance(0.4);
    if (!want) continue;
    const ask = playerAsk(world, p, club, 'renewal');
    const years = age >= 31 ? 1 : rng.int(2, 4);
    const v = validateSigning(world, clubId, p.id, { salary: ask, years }, 'renewal');
    if (!v.ok) continue;
    const resp = negotiate(world, clubId, p.id, { salary: ask, years }, 'renewal');
    if (!resp.accepted) continue;
    signContract(world, clubId, p.id, { salary: ask, years }, 'renewal');
    renewed.push(p.id);
  }
  return renewed;
}

/** Releases surplus players if a roster is above the league maximum. */
export function aiTrimRoster(world: World, clubId: string): string[] {
  const { rules } = clubRules(world, clubId);
  const released: string[] = [];
  let roster = rosterOf(world, clubId);
  while (roster.length > rules.rosterMax) {
    const worst = [...roster].sort((a, b) => playerOverall(a) - playerOverall(b))[0];
    if (!validateRelease(world, clubId, worst.id).ok) break;
    releasePlayer(world, clubId, worst.id);
    released.push(worst.id);
    roster = rosterOf(world, clubId);
  }
  return released;
}

/** Sets a wage budget and ticket price that suit the club's finances and personality. */
export function aiBudget(world: World, clubId: string, projectedIncome: number) {
  const club = world.clubs[clubId];
  const { rules } = clubRules(world, clubId);
  const share =
    club.aiPersonality === 'financial_conservative' ? 0.55
      : club.aiPersonality === 'win_now' || club.aiPersonality === 'superstar_collector' ? 0.72
        : 0.64;
  const cashAdj = club.cash < 0 ? 0.85 : 1;
  const committed = payroll(world, clubId, signingSeason(world));
  club.wageBudget = Math.round(Math.max(committed, projectedIncome * share * cashAdj) / 100_000) * 100_000;
  if (rules.salaryCap.type === 'soft') club.wageBudget = Math.max(club.wageBudget, rules.salaryCap.salaryFloor ?? 0);
}
