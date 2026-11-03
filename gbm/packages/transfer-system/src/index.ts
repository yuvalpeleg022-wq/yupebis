import type { Club, Contract, Player, TransferNegotiation, TransferRecord, World } from '@gbm/shared-types';
import { addDays, cachedIndex, clamp, invalidateIndexes, nextId, logicAge } from '@gbm/shared-types';
import { askingSalary, playerOverall, preferredYears } from '@gbm/player-system';
import { activeContracts, contractForPlayer, payroll, recordTransaction } from '@gbm/finance-system';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function clubRules(world: World, clubId: string) {
  const club = world.clubs[clubId];
  const league = world.leagues[club.leagueId];
  return { club, league, rules: world.rules[league.rulesId] };
}

/** Players under contract with a club (indexed; see invalidateIndexes). */
export function rosterOf(world: World, clubId: string): Player[] {
  const idx = cachedIndex(world, 'rosters', () => {
    const m = new Map<string, Player[]>();
    for (const p of Object.values(world.players)) {
      if (!p.clubId || p.retired) continue;
      (m.get(p.clubId) ?? m.set(p.clubId, []).get(p.clubId)!).push(p);
    }
    return m;
  });
  return [...(idx.get(clubId) ?? [])];
}

export function freeAgents(world: World): Player[] {
  return Object.values(world.players).filter((p) => p.clubId === null && !p.retired);
}

/** The salary a player asks from a specific club. */
export function playerAsk(world: World, player: Player, club: Club, kind: 'free_agent' | 'renewal'): number {
  const { league, rules } = clubRules(world, club.id);
  const age = logicAge(player, world.meta.currentDate);
  const ovr = playerOverall(player);
  let ask = askingSalary(ovr, age, player.potential, league.salaryScale);
  // Stars expect more from weak clubs; loyal players give discounts on renewals.
  ask *= 1 + clamp((ovr - 65) * 0.004, 0, 0.1) * clamp((60 - club.reputation) / 40, 0, 1);
  if (kind === 'renewal') ask *= 1 - (player.loyalty / 100) * 0.12 - (player.morale - 50) * 0.001;
  ask = clamp(ask, rules.salaryCap.minSalary, rules.salaryCap.maxSalary || ask);
  return Math.round(ask / 10_000) * 10_000;
}

export interface ContractOffer {
  salary: number;
  years: number;
}

/** Validates that a club may legally sign a player on the offered terms. */
export function validateSigning(world: World, clubId: string, playerId: string, offer: ContractOffer, kind: 'free_agent' | 'renewal'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const player = world.players[playerId];
  const { club, rules } = clubRules(world, clubId);
  const season = signingSeason(world);
  if (!player) return { ok: false, errors: ['Player not found'], warnings };
  if (player.retired) errors.push('Player has retired.');
  if (kind === 'free_agent' && player.clubId !== null) errors.push('Player is under contract with another club.');
  if (kind === 'renewal' && player.clubId !== clubId) errors.push('Player does not play for this club.');
  if (!Number.isInteger(offer.years) || offer.years < 1 || offer.years > 5) errors.push('Contract length must be 1–5 years.');
  if (!Number.isFinite(offer.salary) || offer.salary <= 0) errors.push('Salary must be a positive amount.');
  const cap = rules.salaryCap;
  if (cap.minSalary && offer.salary < cap.minSalary) errors.push(`Salary is below the league minimum (${fmt(cap.minSalary)}).`);
  if (cap.maxSalary && offer.salary > cap.maxSalary) errors.push(`Salary exceeds the league maximum (${fmt(cap.maxSalary)}).`);

  if (kind === 'free_agent') {
    const roster = rosterOf(world, clubId).length;
    if (roster >= rules.rosterMax) errors.push(`Roster is full (${roster}/${rules.rosterMax}). Release a player first.`);
    if (rules.foreignPlayerLimit !== null) {
      const foreign = rosterOf(world, clubId).filter((p) => p.nationality !== club.country).length;
      if (player.nationality !== club.country && foreign >= rules.foreignPlayerLimit) {
        errors.push(`Foreign player limit reached (${rules.foreignPlayerLimit}).`);
      }
    }
  }
  const existing = kind === 'renewal' ? contractForPlayer(world, playerId) : null;
  const currentPayroll = payroll(world, clubId, season) - (existing && existing.endSeason >= season ? existing.salary : 0);
  const after = currentPayroll + offer.salary;
  if (cap.type === 'hard' && cap.cap > 0 && after > cap.cap) errors.push(`Hard cap exceeded (${fmt(after)} > ${fmt(cap.cap)}).`);
  if (cap.type === 'soft' && kind === 'free_agent' && after > cap.cap && offer.salary > cap.minSalary * 1.05) {
    errors.push(`Over the salary cap (${fmt(after)} > ${fmt(cap.cap)}). Only minimum contracts (${fmt(cap.minSalary)}) are allowed over the cap.`);
  }
  if (cap.type === 'soft' && cap.luxuryTax && after > cap.luxuryTax) warnings.push('This payroll is above the luxury tax line.');
  // Emergency rule: a club below the league roster minimum may always add a
  // minimum-salary player so it can field a team.
  const emergency = kind === 'free_agent' && rosterOf(world, clubId).length < rules.rosterMin && offer.salary <= cap.minSalary * 1.05;
  if (emergency) warnings.push('Emergency minimum-salary signing (roster below league minimum).');
  if (cap.type === 'none' && !emergency) {
    if (after > club.wageBudget) errors.push(`Exceeds the board's wage budget (${fmt(after)} > ${fmt(club.wageBudget)}).`);
    if (club.cash < offer.salary / 12) errors.push('Not enough cash to pay the first month of wages.');
  } else if (club.cash < -50_000_000) {
    errors.push('The club is too deep in debt to add salary.');
  }
  return { ok: errors.length === 0, errors, warnings };
}

/** The season a new contract starts: next season during the off-season. */
export function signingSeason(world: World): number {
  return world.meta.phase === 'offseason' ? world.meta.season + 1 : world.meta.season;
}

function fmt(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

export interface NegotiationResponse {
  accepted: boolean;
  negotiation: TransferNegotiation;
  message: string;
  counterSalary: number | null;
  counterYears: number | null;
}

const MAX_ROUNDS = 4;

/**
 * Player response to a contract offer. Players accept fair offers, counter
 * low ones, and walk away after repeated low offers.
 */
export function negotiate(world: World, clubId: string, playerId: string, offer: ContractOffer, kind: 'free_agent' | 'renewal'): NegotiationResponse {
  const player = world.players[playerId];
  const club = world.clubs[clubId];
  const key = `${kind}:${clubId}:${playerId}`;
  let neg = world.negotiations[key];
  const today = world.meta.currentDate;
  if (neg && neg.status !== 'open' && neg.status !== 'accepted' && neg.date > today) {
    return { accepted: false, negotiation: neg, message: neg.message, counterSalary: null, counterYears: null };
  }
  const ask = playerAsk(world, player, club, kind);
  if (!neg || neg.status !== 'open') {
    neg = {
      id: key, playerId, clubId, kind, status: 'open', rounds: 0, lastOfferSalary: 0, lastOfferYears: 0,
      askingSalary: ask, date: today, message: '',
    };
    world.negotiations[key] = neg;
  }
  neg.rounds++;
  neg.lastOfferSalary = offer.salary;
  neg.lastOfferYears = offer.years;
  const age = logicAge(player, today);
  const wantYears = preferredYears(age, playerOverall(player));
  const yearsPenalty = Math.abs(offer.years - wantYears) * 0.04;
  const required = ask * (1 + yearsPenalty) * (1 - clamp((club.reputation - 50) * 0.002, -0.05, 0.08));
  const ratio = offer.salary / required;
  if (ratio >= 0.97) {
    neg.status = 'accepted';
    neg.message = `${player.firstName} ${player.lastName} accepts the offer.`;
    return { accepted: true, negotiation: neg, message: neg.message, counterSalary: null, counterYears: null };
  }
  if (neg.rounds >= MAX_ROUNDS || ratio < 0.6) {
    neg.status = 'rejected';
    neg.date = addDays(today, 14);
    neg.message =
      ratio < 0.6
        ? `${player.lastName} is insulted by the offer and ends talks for two weeks.`
        : `${player.lastName} has ended negotiations for two weeks.`;
    return { accepted: false, negotiation: neg, message: neg.message, counterSalary: null, counterYears: null };
  }
  const counter = Math.round((required * 1.0) / 10_000) * 10_000;
  neg.message = `${player.lastName} wants about ${fmt(counter)} per year over ${wantYears} year${wantYears > 1 ? 's' : ''}. (${MAX_ROUNDS - neg.rounds} rounds left)`;
  return { accepted: false, negotiation: neg, message: neg.message, counterSalary: counter, counterYears: wantYears };
}

/** Executes a signing after validation. Throws if the signing is not legal. */
export function signContract(world: World, clubId: string, playerId: string, offer: ContractOffer, kind: 'free_agent' | 'renewal'): Contract {
  const v = validateSigning(world, clubId, playerId, offer, kind);
  if (!v.ok) throw new Error(v.errors.join(' '));
  const player = world.players[playerId];
  const { rules } = clubRules(world, clubId);
  const start = signingSeason(world);
  const existing = contractForPlayer(world, playerId);
  let startSeason = start;
  if (kind === 'renewal' && existing) {
    // Extensions start after the current deal ends, or replace it in the off-season.
    if (existing.endSeason >= start) startSeason = existing.endSeason + 1;
    if (world.meta.phase === 'offseason' && existing.endSeason <= world.meta.season) existing.active = false;
  }
  const contract: Contract = {
    id: nextId(world, 'ct'),
    playerId,
    clubId,
    salary: Math.round(offer.salary),
    startSeason,
    endSeason: startSeason + offer.years - 1,
    option: 'none',
    buyout: rules.allowBuyouts ? Math.round(offer.salary * 1.5) : null,
    nbaExitClause: false,
    signedDate: world.meta.currentDate,
    active: true,
  };
  world.contracts[contract.id] = contract;
  invalidateIndexes(world);
  if (kind === 'free_agent') {
    player.clubId = clubId;
    invalidateIndexes(world);
    player.jersey = freeJersey(world, clubId);
    player.morale = clamp(player.morale + 5, 0, 100);
    addToRotation(world, clubId, playerId);
  }
  const record: TransferRecord = {
    id: nextId(world, 'tr'),
    date: world.meta.currentDate,
    season: world.meta.season,
    playerId,
    fromClubId: kind === 'renewal' ? clubId : null,
    toClubId: clubId,
    type: kind === 'renewal' ? 'renewal' : 'free_agent',
    fee: 0,
    salary: contract.salary,
    years: offer.years,
  };
  world.transfers.push(record);
  const neg = world.negotiations[`${kind}:${clubId}:${playerId}`];
  if (neg) delete world.negotiations[neg.id];
  return contract;
}

function freeJersey(world: World, clubId: string): number {
  const used = new Set(rosterOf(world, clubId).map((p) => p.jersey));
  for (const n of [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35, 41, 42, 44, 45, 55]) {
    if (!used.has(n)) return n;
  }
  return 99;
}

function addToRotation(world: World, clubId: string, playerId: string) {
  const club = world.clubs[clubId];
  if (!(playerId in club.rotation.minutes)) club.rotation.minutes[playerId] = 0;
}

/** Cost to release a player: remaining contract value times the league's release share. */
export function releaseCost(world: World, playerId: string): number {
  const c = contractForPlayer(world, playerId);
  if (!c) return 0;
  const { rules } = clubRules(world, c.clubId);
  const season = world.meta.season;
  const seasonsLeft = Math.max(0, c.endSeason - Math.max(season, c.startSeason) + 1);
  // Portion of the current season still to be paid (season runs Jul..Jun).
  const month = Number(world.meta.currentDate.slice(5, 7));
  const monthsLeftThisSeason = c.startSeason > season ? 12 : month >= 7 ? 12 - (month - 7) : 6 - month + 1;
  const remaining = seasonsLeft === 0 ? 0 : c.salary * (seasonsLeft - 1) + c.salary * (monthsLeftThisSeason / 12);
  if (c.buyout !== null && rules.allowBuyouts) return Math.round(Math.min(remaining * rules.releaseCostShare, c.buyout));
  return Math.round(remaining * rules.releaseCostShare);
}

export function validateRelease(world: World, clubId: string, playerId: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const player = world.players[playerId];
  if (!player || player.clubId !== clubId) return { ok: false, errors: ['Player is not on this roster.'], warnings };
  const { club, rules } = clubRules(world, clubId);
  const cost = releaseCost(world, playerId);
  if (club.cash < cost) errors.push(`Not enough cash to pay the release cost (${fmt(cost)}).`);
  const rosterAfter = rosterOf(world, clubId).length - 1;
  if (rosterAfter < 8) errors.push('A club must keep at least 8 players under contract.');
  else if (rosterAfter < rules.rosterMin) warnings.push(`Roster will be below the league minimum of ${rules.rosterMin}; sign a replacement before the next game.`);
  return { ok: errors.length === 0, errors, warnings };
}

export function releasePlayer(world: World, clubId: string, playerId: string): number {
  const v = validateRelease(world, clubId, playerId);
  if (!v.ok) throw new Error(v.errors.join(' '));
  const cost = releaseCost(world, playerId);
  const player = world.players[playerId];
  const c = contractForPlayer(world, playerId);
  if (c) c.active = false;
  invalidateIndexes(world);
  if (cost > 0) recordTransaction(world, clubId, 'release', -cost, `Released ${player.firstName} ${player.lastName}`);
  player.clubId = null;
  invalidateIndexes(world);
  player.jersey = null;
  player.morale = clamp(player.morale - 10, 0, 100);
  removeFromRotation(world, clubId, playerId);
  world.transfers.push({
    id: nextId(world, 'tr'),
    date: world.meta.currentDate,
    season: world.meta.season,
    playerId,
    fromClubId: clubId,
    toClubId: null,
    type: 'release',
    fee: cost,
    salary: c?.salary ?? 0,
    years: 0,
  });
  return cost;
}

export function removeFromRotation(world: World, clubId: string, playerId: string) {
  const club = world.clubs[clubId];
  delete club.rotation.minutes[playerId];
  club.rotation.starters = club.rotation.starters.filter((id) => id !== playerId);
}

/** Contracts ending this season for a club (renewal candidates). */
export function expiringContracts(world: World, clubId: string): Contract[] {
  return activeContracts(world, clubId, world.meta.season).filter((c) => c.endSeason === world.meta.season);
}

export function hasFutureContract(world: World, playerId: string): boolean {
  return Object.values(world.contracts).some((c) => c.active && c.playerId === playerId && c.endSeason > world.meta.season);
}
