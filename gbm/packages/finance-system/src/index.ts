import type { Club, Contract, FinanceCategory, FinanceTransaction, League, World } from '@gbm/shared-types';
import { cachedIndex, clamp, nextId } from '@gbm/shared-types';

function contractIndex(world: World) {
  return cachedIndex(world, 'contracts', () => {
    const byClub = new Map<string, Contract[]>();
    const byPlayer = new Map<string, Contract>();
    for (const c of Object.values(world.contracts)) {
      if (!c.active) continue;
      (byClub.get(c.clubId) ?? byClub.set(c.clubId, []).get(c.clubId)!).push(c);
      const prev = byPlayer.get(c.playerId);
      // The current deal is the one that started earliest (extensions start later).
      if (!prev || c.startSeason < prev.startSeason) byPlayer.set(c.playerId, c);
    }
    return { byClub, byPlayer };
  });
}

/** Active contracts covering a season (indexed; call invalidateIndexes after changes). */
export function activeContracts(world: World, clubId: string, season: number): Contract[] {
  return (contractIndex(world).byClub.get(clubId) ?? []).filter((c) => c.active && c.startSeason <= season && c.endSeason >= season);
}

export function contractForPlayer(world: World, playerId: string): Contract | null {
  const c = contractIndex(world).byPlayer.get(playerId);
  return c && c.active ? c : null;
}

/** Total salary committed for a season. */
export function payroll(world: World, clubId: string, season: number): number {
  let total = 0;
  for (const c of activeContracts(world, clubId, season)) total += c.salary;
  return total;
}

export function staffPayroll(world: World, clubId: string): number {
  let total = 0;
  for (const s of Object.values(world.staff)) if (s.clubId === clubId) total += s.salary;
  return total;
}

/**
 * Records a transaction and updates the club's cash. Spending is validated by
 * callers through `canAfford`; this function only refuses non-finite values.
 */
export function recordTransaction(
  world: World,
  clubId: string,
  category: FinanceCategory,
  amount: number,
  description: string,
): FinanceTransaction {
  if (!Number.isFinite(amount)) throw new Error('Invalid transaction amount');
  const club = world.clubs[clubId];
  if (!club) throw new Error(`Unknown club ${clubId}`);
  const tx: FinanceTransaction = {
    id: nextId(world, 'tx'),
    clubId,
    date: world.meta.currentDate,
    season: world.meta.season,
    category,
    amount: Math.round(amount),
    description,
  };
  club.cash += tx.amount;
  world.finances.push(tx);
  return tx;
}

export function canAfford(club: Club, amount: number): boolean {
  return club.cash >= amount;
}

/** Expected attendance for a home game. */
export function attendance(world: World, home: Club, away: Club, playoff: boolean): number {
  const demand = 0.55 + home.reputation * 0.004 + away.reputation * 0.0015 + (playoff ? 0.15 : 0);
  const priceAdj = 1 - Math.max(0, home.ticketPrice / referenceTicketPrice(world.leagues[home.leagueId]) - 1) * 0.35;
  return Math.round(home.arenaCapacity * clamp(demand * priceAdj, 0.3, 1));
}

export function referenceTicketPrice(league: League | undefined): number {
  if (!league) return 40;
  return league.region === 'north_america' ? 95 : 28;
}

/** Revenue for a home game, booked to the home club. */
export function bookGateReceipts(world: World, homeId: string, awayId: string, playoff: boolean): number {
  const home = world.clubs[homeId];
  const away = world.clubs[awayId];
  const crowd = attendance(world, home, away, playoff);
  const revenue = crowd * home.ticketPrice;
  recordTransaction(world, homeId, 'tickets', revenue, `Gate receipts vs ${away.shortName} (${crowd.toLocaleString('en-US')})`);
  return crowd;
}

/** Monthly club finances: wages, staff, operations, sponsorship and TV money. */
export function processMonthlyFinances(world: World, clubId: string) {
  const club = world.clubs[clubId];
  const league = world.leagues[club.leagueId];
  const season = world.meta.season;
  const wages = payroll(world, clubId, season) / 12;
  const staff = staffPayroll(world, clubId) / 12;
  const operations = (club.arenaCapacity * (league?.region === 'north_america' ? 120 : 45)) / 12;
  if (wages > 0) recordTransaction(world, clubId, 'salary', -wages, 'Monthly player wages');
  if (staff > 0) recordTransaction(world, clubId, 'staff', -staff, 'Monthly staff wages');
  recordTransaction(world, clubId, 'operations', -operations, 'Arena and operating costs');
  recordTransaction(world, clubId, 'sponsorship', club.sponsorshipPerSeason / 12, 'Sponsorship income');
  // Broadcast and competition revenue from every competition the club plays.
  for (const id of club.competitionIds ?? [club.leagueId]) {
    const comp = world.leagues[id];
    if (comp && comp.active && comp.tvRevenuePerClub > 0) recordTransaction(world, clubId, 'tv', comp.tvRevenuePerClub / 12, `${comp.shortName} broadcast & distribution share`);
  }
}

/** Luxury tax for leagues that apply one. Returns the tax charged. */
export function chargeLuxuryTax(world: World, clubId: string): number {
  const club = world.clubs[clubId];
  const league = world.leagues[club.leagueId];
  const rules = league ? world.rules[league.rulesId] : undefined;
  const line = rules?.salaryCap.luxuryTax;
  if (!rules || !line) return 0;
  const over = payroll(world, clubId, world.meta.season) - line;
  if (over <= 0) return 0;
  const tax = over * rules.salaryCap.luxuryTaxRate;
  recordTransaction(world, clubId, 'luxury_tax', -tax, `Luxury tax (${(over / 1e6).toFixed(1)}M over the tax line)`);
  return tax;
}

export interface FinanceSummary {
  income: Record<string, number>;
  expenses: Record<string, number>;
  totalIncome: number;
  totalExpenses: number;
  net: number;
}

export function seasonFinanceSummary(world: World, clubId: string, season: number): FinanceSummary {
  const income: Record<string, number> = {};
  const expenses: Record<string, number> = {};
  for (const tx of world.finances) {
    if (tx.clubId !== clubId || tx.season !== season) continue;
    const bucket = tx.amount >= 0 ? income : expenses;
    bucket[tx.category] = (bucket[tx.category] ?? 0) + Math.abs(tx.amount);
  }
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  return { income, expenses, totalIncome, totalExpenses, net: totalIncome - totalExpenses };
}

/** Projected yearly income used by the board to set the wage budget. */
export function projectedSeasonIncome(world: World, club: Club): number {
  const league = world.leagues[club.leagueId];
  const homeGames = league ? Math.max(1, (Object.values(world.clubs).filter((c) => c.leagueId === league.id).length - 1) * league.roundRobins / 2) : 10;
  const gate = club.arenaCapacity * 0.85 * club.ticketPrice * homeGames;
  const tv = (club.competitionIds ?? [club.leagueId]).reduce((sum, id) => sum + (world.leagues[id]?.tvRevenuePerClub ?? 0), 0);
  return gate + club.sponsorshipPerSeason + tv;
}

export const FINANCE_CATEGORY_LABEL: Record<FinanceCategory, string> = {
  tickets: 'Ticket sales',
  sponsorship: 'Sponsorship',
  tv: 'Broadcasting',
  salary: 'Player wages',
  staff: 'Staff wages',
  operations: 'Operations',
  transfer: 'Transfers',
  release: 'Contract releases',
  luxury_tax: 'Luxury tax',
  prize: 'Prize money',
};
