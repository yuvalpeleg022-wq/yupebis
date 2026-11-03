import type { Database, SqlValue } from 'sql.js';
import type {
  AttributeKey, Attributes, Club, Fixture, League, Match, Player, Staff, World,
} from '@gbm/shared-types';
import { ALL_ATTRIBUTES } from '@gbm/shared-types';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';

export function migrate(db: Database): number {
  const current = Number(db.exec('PRAGMA user_version')[0]?.values[0]?.[0] ?? 0);
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      db.exec(`PRAGMA user_version = ${m.version}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${m.version} (${m.description}) failed: ${(e as Error).message}`);
    }
  }
  return SCHEMA_VERSION;
}

const b = (v: boolean) => (v ? 1 : 0);
const j = (v: unknown) => JSON.stringify(v);

function insertAll(db: Database, table: string, columns: string[], rows: SqlValue[][]) {
  if (rows.length === 0) return;
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
  try {
    for (const r of rows) stmt.run(r);
  } finally {
    stmt.free();
  }
}

function select<T = Record<string, SqlValue>>(db: Database, sql: string): T[] {
  const res = db.exec(sql);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map((v) => Object.fromEntries(columns.map((c, i) => [c, v[i]])) as T);
}

const TABLES = [
  'game_saves', 'game_settings', 'id_counters', 'data_sources', 'data_issues', 'competition_rules', 'leagues', 'clubs',
  'competitions', 'training_programs', 'players', 'player_attributes', 'draft_classes', 'player_contracts', 'player_injuries',
  'club_rosters', 'club_staff', 'staff_career_history', 'staff_negotiations', 'fixtures', 'matches', 'match_events',
  'match_player_stats', 'playoff_series', 'standings', 'seasons', 'player_seasons', 'player_career_history', 'awards',
  'transfers', 'transfer_negotiations', 'scouting_reports', 'club_finances', 'news_events', 'manager_history', 'job_offers',
  'competition_regulations', 'competition_entries',
];

/** Writes the full world into normalized tables inside one transaction. */
export function saveWorld(db: Database, world: World) {
  migrate(db);
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN');
  try {
    for (const t of TABLES) db.exec(`DELETE FROM ${t}`);
    const m = world.meta;
    insertAll(db, 'game_saves', ['career_id', 'career_name', 'manager_name', 'user_club_id', 'season', 'current_date', 'phase', 'seed', 'save_version', 'board_confidence', 'manager_reputation', 'manager_attributes', 'dataset_name', 'dataset_source', 'fictional_coach_policy', 'roster_policy', 'created_at', 'updated_at'],
      [[m.careerId, m.careerName, m.managerName, m.userClubId || null, m.season, m.currentDate, m.phase, m.seed, m.saveVersion, m.boardConfidence, m.managerReputation, j(m.managerAttributes), m.datasetName, m.datasetSource, m.fictionalCoachPolicy, m.rosterPolicy, m.createdAt, m.updatedAt]]);
    insertAll(db, 'id_counters', ['prefix', 'value'], Object.entries(m.idCounters));
    insertAll(db, 'data_sources', ['id', 'title', 'url', 'publisher', 'accessed_on', 'method'], Object.values(world.dataSources).map((s) => [s.id, s.title, s.url, s.publisher, s.accessedOn, s.method]));
    insertAll(db, 'data_issues', ['id', 'entity', 'entity_id', 'field', 'severity', 'message', 'candidates', 'status'], Object.values(world.dataIssues).map((d) => [d.id, d.entity, d.entityId, d.field, d.severity, d.message, j(d.candidates), d.status]));
    insertAll(db, 'competition_rules', ['id', 'name', 'family', 'definition'], Object.values(world.rules).map((r) => [r.id, r.name, r.family, j(r)]));
    insertAll(db, 'leagues', ['id', 'name', 'short_name', 'country', 'region', 'rules_id', 'tier', 'active', 'format', 'source'], Object.values(world.leagues).map((l) => [l.id, l.name, l.shortName, l.country, l.region, l.rulesId, l.tier, b(l.active), j(l), l.source]));
    const clubs = Object.values(world.clubs);
    insertAll(db, 'clubs', ['id', 'name', 'short_name', 'city', 'country', 'league_id', 'reputation', 'arena_capacity', 'ticket_price', 'cash', 'wage_budget', 'staff_budget', 'sponsorship', 'tactics', 'rotation_auto', 'ai_personality', 'youth_rating', 'primary_color', 'roster_source', 'source', 'source_ref', 'verification'],
      clubs.map((c) => [c.id, c.name, c.shortName, c.city, c.country, c.leagueId, c.reputation, c.arenaCapacity, c.ticketPrice, Math.round(c.cash), c.wageBudget, c.staffBudget, c.sponsorshipPerSeason, j(c.tactics), b(c.rotation.auto), c.aiPersonality, c.youthRating, c.primaryColor, c.rosterSource, c.source, c.sourceRef, j(c.verification)]));
    insertAll(db, 'competitions', ['club_id', 'league_id', 'is_primary'], clubs.flatMap((c) => c.competitionIds.map((l) => [c.id, l, b(l === c.leagueId)])));
    insertAll(db, 'training_programs', ['club_id', 'focus'], clubs.map((c) => [c.id, c.trainingFocus]));
    insertAll(db, 'club_rosters', ['club_id', 'player_id', 'starter_slot', 'target_minutes'], clubs.flatMap((c) => {
      const ids = new Set([...Object.keys(c.rotation.minutes), ...c.rotation.starters]);
      return [...ids].filter((id) => world.players[id]).map((id) => [c.id, id, c.rotation.starters.includes(id) ? c.rotation.starters.indexOf(id) : null, Math.round(c.rotation.minutes[id] ?? 0)]);
    }));
    const players = Object.values(world.players);
    insertAll(db, 'players', ['id', 'first_name', 'last_name', 'nationality', 'birth_date', 'height_cm', 'weight_kg', 'position', 'secondary_position', 'club_id', 'jersey', 'potential', 'morale', 'fatigue', 'loyalty', 'injury_id', 'retired', 'source', 'source_ref', 'rating_basis', 'draft_year', 'created_at', 'updated_at'],
      players.map((p) => [p.id, p.firstName, p.lastName, p.nationality, p.birthDate, p.heightCm, p.weightKg, p.position, p.secondaryPosition, p.clubId, p.jersey, p.potential, p.morale, p.fatigue, p.loyalty, p.injuryId, b(p.retired), p.source, p.sourceRef, p.ratingBasis, p.draftYear, p.createdAt, p.updatedAt]));
    insertAll(db, 'player_attributes', ['player_id', 'attribute', 'value'], players.flatMap((p) => ALL_ATTRIBUTES.map((k) => [p.id, k, p.attributes[k]])));
    insertAll(db, 'draft_classes', ['player_id', 'season'], players.filter((p) => p.draftYear !== null).map((p) => [p.id, p.draftYear]));
    insertAll(db, 'player_contracts', ['id', 'player_id', 'club_id', 'salary', 'start_season', 'end_season', 'option_type', 'buyout', 'nba_exit_clause', 'signed_date', 'active'],
      Object.values(world.contracts).map((c) => [c.id, c.playerId, c.clubId, c.salary, c.startSeason, c.endSeason, c.option, c.buyout, b(c.nbaExitClause), c.signedDate, b(c.active)]));
    insertAll(db, 'player_injuries', ['id', 'player_id', 'type', 'start_date', 'days_out', 'days_remaining', 'season'], Object.values(world.injuries).map((i) => [i.id, i.playerId, i.type, i.startDate, i.daysOut, i.daysRemaining, i.season]));
    insertAll(db, 'club_staff', ['id', 'club_id', 'first_name', 'last_name', 'nationality', 'birth_date', 'role', 'attributes', 'personality', 'philosophy', 'ambition', 'preferred_roles', 'reputation', 'experience_years', 'salary', 'contract_start', 'contract_end', 'morale', 'retired', 'source', 'source_ref', 'verification', 'market_excluded'],
      Object.values(world.staff).map((s) => [s.id, s.clubId, s.firstName, s.lastName, s.nationality, s.birthDate, s.role, j(s.attributes), s.personality, s.philosophy, s.ambition, j(s.preferredRoles), s.reputation, s.experienceYears, s.salary, s.contractStartSeason, s.contractEndSeason, s.morale, b(s.retired), s.source, s.sourceRef, j(s.verification), b(s.marketExcluded)]));
    insertAll(db, 'staff_career_history', ['id', 'staff_id', 'club_id', 'role', 'start_season', 'end_season', 'wins', 'losses', 'titles', 'end_reason'], world.staffHistory.map((h) => [h.id, h.staffId, h.clubId, h.role, h.startSeason, h.endSeason, h.wins, h.losses, h.titles, h.endReason]));
    insertAll(db, 'staff_negotiations', ['id', 'staff_id', 'club_id', 'kind', 'role', 'salary', 'years', 'rounds', 'status', 'response', 'counter_salary', 'counter_role', 'counter_years', 'willingness', 'message', 'created_date', 'decision_date', 'compensation'],
      Object.values(world.staffNegotiations).map((n) => [n.id, n.staffId, n.clubId, n.kind, n.role, n.salary, n.years, n.rounds, n.status, n.response, n.counterSalary, n.counterRole, n.counterYears, n.willingness, n.message, n.createdDate, n.decisionDate, n.compensation]));
    insertAll(db, 'fixtures', ['id', 'league_id', 'season', 'date', 'home_id', 'away_id', 'stage', 'round', 'series_id', 'game_number', 'neutral', 'match_id'],
      Object.values(world.fixtures).map((f) => [f.id, f.leagueId, f.season, f.date, f.homeId, f.awayId, f.stage, f.round, f.seriesId, f.gameNumber, b(f.neutral), f.matchId]));
    const matches = Object.values(world.matches);
    insertAll(db, 'matches', ['id', 'fixture_id', 'league_id', 'season', 'date', 'home_id', 'away_id', 'home_score', 'away_score', 'home_quarters', 'away_quarters', 'overtimes', 'attendance', 'home_stats', 'away_stats', 'seed'],
      matches.map((x) => [x.id, x.fixtureId, x.leagueId, x.season, x.date, x.homeId, x.awayId, x.homeScore, x.awayScore, j(x.homeQuarters), j(x.awayQuarters), x.overtimes, x.attendance, j(x.homeStats), j(x.awayStats), x.seed]));
    insertAll(db, 'match_events', ['match_id', 'events'], matches.filter((x) => x.events).map((x) => [x.id, j(x.events)]));
    insertAll(db, 'match_player_stats', ['match_id', 'player_id', 'club_id', 'starter', 'seconds', 'pts', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'tov', 'pf', 'plus_minus'],
      world.playerGameStats.map((s) => [s.matchId, s.playerId, s.clubId, b(s.starter), s.seconds, s.pts, s.fgm, s.fga, s.tpm, s.tpa, s.ftm, s.fta, s.oreb, s.dreb, s.ast, s.stl, s.blk, s.tov, s.pf, s.plusMinus]));
    insertAll(db, 'playoff_series', ['id', 'league_id', 'season', 'round', 'slot', 'high_seed_id', 'low_seed_id', 'high_seed', 'low_seed', 'high_wins', 'low_wins', 'best_of', 'winner_id'],
      Object.values(world.series).map((s) => [s.id, s.leagueId, s.season, s.round, s.slot, s.highSeedId, s.lowSeedId, s.highSeed, s.lowSeed, s.highWins, s.lowWins, s.bestOf, s.winnerId]));
    insertAll(db, 'standings', ['season', 'league_id', 'rank', 'club_id', 'row'], world.seasonStandings.map((s) => [s.season, s.leagueId, s.rank, s.row.clubId, j(s.row)]));
    insertAll(db, 'seasons', ['season', 'league_id', 'champion_id', 'runner_up_id', 'regular_season_winner_id'], world.seasonSummaries.map((s) => [s.season, s.leagueId, s.championId, s.runnerUpId, s.regularSeasonWinnerId]));
    const statCols = ['gp', 'gs', 'seconds', 'pts', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'tov', 'pf', 'overall'] as const;
    insertAll(db, 'player_seasons', ['player_id', 'season', 'club_id', 'league_id', 'stage', ...statCols], world.playerSeasons.map((s) => [s.playerId, s.season, s.clubId, s.leagueId, s.stage, ...statCols.map((k) => s[k])]));
    const career = new Map<string, SqlValue[]>();
    for (const s of world.playerSeasons) {
      const k = `${s.playerId}|${s.season}|${s.clubId}`;
      const row = career.get(k) ?? [s.playerId, s.season, s.clubId, 0, 0];
      row[3] = (row[3] as number) + s.gp;
      row[4] = (row[4] as number) + s.pts;
      career.set(k, row);
    }
    insertAll(db, 'player_career_history', ['player_id', 'season', 'club_id', 'games', 'points'], [...career.values()]);
    insertAll(db, 'awards', ['id', 'season', 'league_id', 'award', 'player_id', 'club_id', 'value'], world.awards.map((a) => [a.id, a.season, a.leagueId, a.award, a.playerId, a.clubId, a.value]));
    insertAll(db, 'transfers', ['id', 'date', 'season', 'player_id', 'from_club_id', 'to_club_id', 'type', 'fee', 'salary', 'years'], world.transfers.map((t) => [t.id, t.date, t.season, t.playerId, t.fromClubId, t.toClubId, t.type, t.fee, t.salary, t.years]));
    insertAll(db, 'transfer_negotiations', ['id', 'player_id', 'club_id', 'kind', 'status', 'rounds', 'last_offer_salary', 'last_offer_years', 'asking_salary', 'date', 'message'],
      Object.values(world.negotiations).map((n) => [n.id, n.playerId, n.clubId, n.kind, n.status, n.rounds, n.lastOfferSalary, n.lastOfferYears, n.askingSalary, n.date, n.message]));
    insertAll(db, 'scouting_reports', ['id', 'player_id', 'club_id', 'date', 'potential_low', 'potential_high', 'overall_estimate', 'notes'],
      Object.values(world.scoutingReports).map((r) => [r.id, r.playerId, r.clubId, r.date, r.potentialLow, r.potentialHigh, r.overallEstimate, r.notes]));
    insertAll(db, 'club_finances', ['id', 'club_id', 'date', 'season', 'category', 'amount', 'description'], world.finances.map((t) => [t.id, t.clubId, t.date, t.season, t.category, t.amount, t.description]));
    insertAll(db, 'news_events', ['id', 'date', 'type', 'title', 'body', 'club_id', 'player_id', 'important', 'read'], world.news.map((n) => [n.id, n.date, n.type, n.title, n.body, n.clubId, n.playerId, b(n.important), b(n.read)]));
    insertAll(db, 'manager_history', ['id', 'club_id', 'start_season', 'end_season', 'wins', 'losses', 'titles', 'end_reason'], world.managerHistory.map((h) => [h.id, h.clubId, h.startSeason, h.endSeason, h.wins, h.losses, h.titles, h.endReason]));
    insertAll(db, 'job_offers', ['id', 'club_id', 'kind', 'date', 'expires', 'status', 'message'], world.jobOffers.map((o) => [o.id, o.clubId, o.kind, o.date, o.expires, o.status, o.message]));
    insertAll(db, 'competition_regulations', ['league_id', 'from_season', 'provenance', 'definition'], world.regulations.map((r) => [r.leagueId, r.fromSeason, r.provenance, j(r)]));
    insertAll(db, 'competition_entries', ['season', 'league_id', 'club_id', 'reason', 'rule_id', 'status', 'detail'], world.competitionEntries.map((e) => [e.season, e.leagueId, e.clubId, e.reason, e.ruleId, e.status, e.detail]));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

type Row = Record<string, SqlValue>;
const s = (v: SqlValue) => v as string;
const n = (v: SqlValue) => v as number;
const ns = (v: SqlValue) => (v === null ? null : (v as string));
const nn = (v: SqlValue) => (v === null ? null : (v as number));
const bool = (v: SqlValue) => v === 1;
const pj = <T>(v: SqlValue) => JSON.parse(v as string) as T;

export function readSaveMeta(db: Database): World['meta'] | null {
  const r = select<Row>(db, 'SELECT * FROM game_saves LIMIT 1')[0];
  if (!r) return null;
  return {
    careerId: s(r.career_id), careerName: s(r.career_name), managerName: s(r.manager_name), userClubId: ns(r.user_club_id) ?? '',
    season: n(r.season), currentDate: s(r.current_date), phase: s(r.phase) as World['meta']['phase'], seed: n(r.seed),
    saveVersion: n(r.save_version), boardConfidence: n(r.board_confidence), managerReputation: n(r.manager_reputation),
    managerAttributes: pj(r.manager_attributes), datasetName: s(r.dataset_name), datasetSource: s(r.dataset_source) as World['meta']['datasetSource'],
    fictionalCoachPolicy: s(r.fictional_coach_policy) as World['meta']['fictionalCoachPolicy'], rosterPolicy: s(r.roster_policy) as World['meta']['rosterPolicy'], createdAt: s(r.created_at), updatedAt: s(r.updated_at),
    idCounters: {},
  };
}

/** Rebuilds the in-memory world from the normalized tables. */
export function loadWorld(db: Database): World {
  migrate(db);
  const meta = readSaveMeta(db);
  if (!meta) throw new Error('Save file contains no career.');
  for (const r of select<Row>(db, 'SELECT * FROM id_counters')) meta.idCounters[s(r.prefix)] = n(r.value);
  const w: World = {
    meta, rules: {}, leagues: {}, clubs: {}, players: {}, contracts: {}, staff: {}, injuries: {}, fixtures: {}, matches: {},
    playerGameStats: [], series: {}, news: [], finances: [], transfers: [], negotiations: {}, playerSeasons: [], seasonStandings: [],
    seasonSummaries: [], awards: [], managerHistory: [], staffHistory: [], staffNegotiations: {}, scoutingReports: {}, dataIssues: {},
    jobOffers: [], dataSources: {}, regulations: [], competitionEntries: [],
  };
  for (const r of select<Row>(db, 'SELECT * FROM data_sources')) w.dataSources[s(r.id)] = { id: s(r.id), title: s(r.title), url: s(r.url), publisher: s(r.publisher), accessedOn: s(r.accessed_on), method: s(r.method) };
  for (const r of select<Row>(db, 'SELECT * FROM data_issues')) w.dataIssues[s(r.id)] = { id: s(r.id), entity: s(r.entity) as never, entityId: s(r.entity_id), field: s(r.field), severity: s(r.severity) as never, message: s(r.message), candidates: pj(r.candidates), status: s(r.status) as never };
  for (const r of select<Row>(db, 'SELECT * FROM competition_rules')) w.rules[s(r.id)] = pj(r.definition);
  for (const r of select<Row>(db, 'SELECT * FROM leagues')) {
    const l = pj<League>(r.format);
    w.leagues[l.id] = { ...l, active: bool(r.active) };
  }
  const comps = new Map<string, { id: string; primary: boolean }[]>();
  for (const r of select<Row>(db, 'SELECT * FROM competitions')) (comps.get(s(r.club_id)) ?? comps.set(s(r.club_id), []).get(s(r.club_id))!).push({ id: s(r.league_id), primary: bool(r.is_primary) });
  const focus = new Map(select<Row>(db, 'SELECT * FROM training_programs').map((r) => [s(r.club_id), s(r.focus)]));
  for (const r of select<Row>(db, 'SELECT * FROM clubs')) {
    const c: Club = {
      id: s(r.id), name: s(r.name), shortName: s(r.short_name), city: s(r.city), country: s(r.country), leagueId: s(r.league_id),
      competitionIds: (comps.get(s(r.id)) ?? []).sort((a, b) => Number(b.primary) - Number(a.primary)).map((x) => x.id),
      reputation: n(r.reputation), arenaCapacity: n(r.arena_capacity), ticketPrice: n(r.ticket_price), cash: n(r.cash),
      wageBudget: n(r.wage_budget), staffBudget: n(r.staff_budget), sponsorshipPerSeason: n(r.sponsorship), tactics: pj(r.tactics),
      rotation: { starters: [], minutes: {}, auto: bool(r.rotation_auto) }, aiPersonality: s(r.ai_personality) as Club['aiPersonality'],
      trainingFocus: (focus.get(s(r.id)) ?? 'balanced') as Club['trainingFocus'], youthRating: n(r.youth_rating),
      primaryColor: s(r.primary_color), rosterSource: s(r.roster_source) as Club['rosterSource'], source: s(r.source) as Club['source'], sourceRef: ns(r.source_ref), verification: pj(r.verification),
    };
    w.clubs[c.id] = c;
  }
  const starters = new Map<string, [number, string][]>();
  for (const r of select<Row>(db, 'SELECT * FROM club_rosters')) {
    const c = w.clubs[s(r.club_id)];
    c.rotation.minutes[s(r.player_id)] = n(r.target_minutes);
    if (r.starter_slot !== null) (starters.get(c.id) ?? starters.set(c.id, []).get(c.id)!).push([n(r.starter_slot), s(r.player_id)]);
  }
  for (const [id, list] of starters) w.clubs[id].rotation.starters = list.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const attrs = new Map<string, Attributes>();
  for (const r of select<Row>(db, 'SELECT * FROM player_attributes')) {
    const a = attrs.get(s(r.player_id)) ?? ({} as Attributes);
    a[s(r.attribute) as AttributeKey] = n(r.value);
    attrs.set(s(r.player_id), a);
  }
  for (const r of select<Row>(db, 'SELECT * FROM players')) {
    const p: Player = {
      id: s(r.id), firstName: s(r.first_name), lastName: s(r.last_name), nationality: s(r.nationality), birthDate: s(r.birth_date),
      heightCm: n(r.height_cm), weightKg: n(r.weight_kg), position: s(r.position) as Player['position'],
      secondaryPosition: ns(r.secondary_position) as Player['secondaryPosition'], clubId: ns(r.club_id), jersey: nn(r.jersey),
      attributes: attrs.get(s(r.id))!, potential: n(r.potential), morale: n(r.morale), fatigue: n(r.fatigue), loyalty: n(r.loyalty),
      injuryId: ns(r.injury_id), retired: bool(r.retired), source: s(r.source) as Player['source'], sourceRef: ns(r.source_ref),
      ratingBasis: s(r.rating_basis) as Player['ratingBasis'], draftYear: nn(r.draft_year), createdAt: s(r.created_at), updatedAt: s(r.updated_at),
    };
    w.players[p.id] = p;
  }
  for (const r of select<Row>(db, 'SELECT * FROM player_contracts')) w.contracts[s(r.id)] = { id: s(r.id), playerId: s(r.player_id), clubId: s(r.club_id), salary: n(r.salary), startSeason: n(r.start_season), endSeason: n(r.end_season), option: s(r.option_type) as never, buyout: nn(r.buyout), nbaExitClause: bool(r.nba_exit_clause), signedDate: s(r.signed_date), active: bool(r.active) };
  for (const r of select<Row>(db, 'SELECT * FROM player_injuries')) w.injuries[s(r.id)] = { id: s(r.id), playerId: s(r.player_id), type: s(r.type), startDate: s(r.start_date), daysOut: n(r.days_out), daysRemaining: n(r.days_remaining), season: n(r.season) };
  for (const r of select<Row>(db, 'SELECT * FROM club_staff')) {
    const st: Staff = {
      id: s(r.id), clubId: ns(r.club_id), firstName: s(r.first_name), lastName: s(r.last_name), nationality: s(r.nationality),
      birthDate: ns(r.birth_date), role: s(r.role) as Staff['role'], attributes: pj(r.attributes), personality: s(r.personality) as Staff['personality'],
      philosophy: s(r.philosophy) as Staff['philosophy'], ambition: s(r.ambition) as Staff['ambition'], preferredRoles: pj(r.preferred_roles),
      reputation: n(r.reputation), experienceYears: n(r.experience_years), salary: n(r.salary), contractStartSeason: n(r.contract_start),
      contractEndSeason: n(r.contract_end), morale: n(r.morale), retired: bool(r.retired), source: s(r.source) as Staff['source'],
      sourceRef: ns(r.source_ref), verification: pj(r.verification), marketExcluded: bool(r.market_excluded),
    };
    w.staff[st.id] = st;
  }
  for (const r of select<Row>(db, 'SELECT * FROM staff_career_history ORDER BY rowid')) w.staffHistory.push({ id: s(r.id), staffId: s(r.staff_id), clubId: s(r.club_id), role: s(r.role) as never, startSeason: n(r.start_season), endSeason: nn(r.end_season), wins: n(r.wins), losses: n(r.losses), titles: n(r.titles), endReason: s(r.end_reason) as never });
  for (const r of select<Row>(db, 'SELECT * FROM staff_negotiations')) w.staffNegotiations[s(r.id)] = { id: s(r.id), staffId: s(r.staff_id), clubId: s(r.club_id), kind: s(r.kind) as never, role: s(r.role) as never, salary: n(r.salary), years: n(r.years), rounds: n(r.rounds), status: s(r.status) as never, response: s(r.response) as never, counterSalary: nn(r.counter_salary), counterRole: ns(r.counter_role) as never, counterYears: nn(r.counter_years), willingness: n(r.willingness), message: s(r.message), createdDate: s(r.created_date), decisionDate: s(r.decision_date), compensation: n(r.compensation) };
  for (const r of select<Row>(db, 'SELECT * FROM fixtures')) {
    const f: Fixture = { id: s(r.id), leagueId: s(r.league_id), season: n(r.season), date: s(r.date), homeId: s(r.home_id), awayId: s(r.away_id), stage: s(r.stage) as Fixture['stage'], round: n(r.round), seriesId: ns(r.series_id), gameNumber: nn(r.game_number), neutral: bool(r.neutral), matchId: ns(r.match_id) };
    w.fixtures[f.id] = f;
  }
  const events = new Map(select<Row>(db, 'SELECT * FROM match_events').map((r) => [s(r.match_id), pj<Match['events']>(r.events)]));
  for (const r of select<Row>(db, 'SELECT * FROM matches')) {
    const x: Match = { id: s(r.id), fixtureId: s(r.fixture_id), leagueId: s(r.league_id), season: n(r.season), date: s(r.date), homeId: s(r.home_id), awayId: s(r.away_id), homeScore: n(r.home_score), awayScore: n(r.away_score), homeQuarters: pj(r.home_quarters), awayQuarters: pj(r.away_quarters), overtimes: n(r.overtimes), attendance: n(r.attendance), homeStats: pj(r.home_stats), awayStats: pj(r.away_stats), seed: n(r.seed), events: events.get(s(r.id)) ?? null };
    w.matches[x.id] = x;
  }
  for (const r of select<Row>(db, 'SELECT * FROM match_player_stats ORDER BY rowid')) w.playerGameStats.push({ matchId: s(r.match_id), playerId: s(r.player_id), clubId: s(r.club_id), starter: bool(r.starter), seconds: n(r.seconds), pts: n(r.pts), fgm: n(r.fgm), fga: n(r.fga), tpm: n(r.tpm), tpa: n(r.tpa), ftm: n(r.ftm), fta: n(r.fta), oreb: n(r.oreb), dreb: n(r.dreb), ast: n(r.ast), stl: n(r.stl), blk: n(r.blk), tov: n(r.tov), pf: n(r.pf), plusMinus: n(r.plus_minus) });
  for (const r of select<Row>(db, 'SELECT * FROM playoff_series')) w.series[s(r.id)] = { id: s(r.id), leagueId: s(r.league_id), season: n(r.season), round: n(r.round), slot: n(r.slot), highSeedId: s(r.high_seed_id), lowSeedId: s(r.low_seed_id), highSeed: n(r.high_seed), lowSeed: n(r.low_seed), highWins: n(r.high_wins), lowWins: n(r.low_wins), bestOf: n(r.best_of), winnerId: ns(r.winner_id) };
  for (const r of select<Row>(db, 'SELECT * FROM standings ORDER BY season, league_id, rank')) w.seasonStandings.push({ season: n(r.season), leagueId: s(r.league_id), rank: n(r.rank), row: pj(r.row) });
  for (const r of select<Row>(db, 'SELECT * FROM seasons ORDER BY rowid')) w.seasonSummaries.push({ season: n(r.season), leagueId: s(r.league_id), championId: ns(r.champion_id), runnerUpId: ns(r.runner_up_id), regularSeasonWinnerId: ns(r.regular_season_winner_id) });
  for (const r of select<Row>(db, 'SELECT * FROM player_seasons ORDER BY rowid')) w.playerSeasons.push({ playerId: s(r.player_id), season: n(r.season), clubId: s(r.club_id), leagueId: s(r.league_id), stage: s(r.stage) as never, gp: n(r.gp), gs: n(r.gs), seconds: n(r.seconds), pts: n(r.pts), fgm: n(r.fgm), fga: n(r.fga), tpm: n(r.tpm), tpa: n(r.tpa), ftm: n(r.ftm), fta: n(r.fta), oreb: n(r.oreb), dreb: n(r.dreb), ast: n(r.ast), stl: n(r.stl), blk: n(r.blk), tov: n(r.tov), pf: n(r.pf), overall: n(r.overall) });
  for (const r of select<Row>(db, 'SELECT * FROM awards ORDER BY rowid')) w.awards.push({ id: s(r.id), season: n(r.season), leagueId: s(r.league_id), award: s(r.award) as never, playerId: ns(r.player_id), clubId: ns(r.club_id), value: s(r.value) });
  for (const r of select<Row>(db, 'SELECT * FROM transfers ORDER BY rowid')) w.transfers.push({ id: s(r.id), date: s(r.date), season: n(r.season), playerId: s(r.player_id), fromClubId: ns(r.from_club_id), toClubId: ns(r.to_club_id), type: s(r.type) as never, fee: n(r.fee), salary: n(r.salary), years: n(r.years) });
  for (const r of select<Row>(db, 'SELECT * FROM transfer_negotiations')) w.negotiations[s(r.id)] = { id: s(r.id), playerId: s(r.player_id), clubId: s(r.club_id), kind: s(r.kind) as never, status: s(r.status) as never, rounds: n(r.rounds), lastOfferSalary: n(r.last_offer_salary), lastOfferYears: n(r.last_offer_years), askingSalary: n(r.asking_salary), date: s(r.date), message: s(r.message) };
  for (const r of select<Row>(db, 'SELECT * FROM scouting_reports')) w.scoutingReports[s(r.id)] = { id: s(r.id), playerId: s(r.player_id), clubId: s(r.club_id), date: s(r.date), potentialLow: n(r.potential_low), potentialHigh: n(r.potential_high), overallEstimate: n(r.overall_estimate), notes: s(r.notes) };
  for (const r of select<Row>(db, 'SELECT * FROM club_finances ORDER BY rowid')) w.finances.push({ id: s(r.id), clubId: s(r.club_id), date: s(r.date), season: n(r.season), category: s(r.category) as never, amount: n(r.amount), description: s(r.description) });
  for (const r of select<Row>(db, 'SELECT * FROM news_events ORDER BY rowid')) w.news.push({ id: s(r.id), date: s(r.date), type: s(r.type) as never, title: s(r.title), body: s(r.body), clubId: ns(r.club_id), playerId: ns(r.player_id), important: bool(r.important), read: bool(r.read) });
  for (const r of select<Row>(db, 'SELECT * FROM manager_history ORDER BY rowid')) w.managerHistory.push({ id: s(r.id), clubId: s(r.club_id), startSeason: n(r.start_season), endSeason: nn(r.end_season), wins: n(r.wins), losses: n(r.losses), titles: n(r.titles), endReason: s(r.end_reason) as never });
  for (const r of select<Row>(db, 'SELECT * FROM job_offers ORDER BY rowid')) w.jobOffers.push({ id: s(r.id), clubId: s(r.club_id), kind: s(r.kind) as never, date: s(r.date), expires: s(r.expires), status: s(r.status) as never, message: s(r.message) });
  for (const r of select<Row>(db, 'SELECT * FROM competition_regulations ORDER BY rowid')) w.regulations.push(pj(r.definition));
  for (const r of select<Row>(db, 'SELECT * FROM competition_entries ORDER BY rowid')) w.competitionEntries.push({ season: n(r.season), leagueId: s(r.league_id), clubId: s(r.club_id), reason: s(r.reason) as never, ruleId: ns(r.rule_id), status: s(r.status) as never, detail: s(r.detail) });
  return w;
}

export function integrityCheck(db: Database): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const ic = db.exec('PRAGMA integrity_check')[0]?.values.map((v) => String(v[0])) ?? [];
  if (ic.length !== 1 || ic[0] !== 'ok') problems.push(...ic);
  const fk = db.exec('PRAGMA foreign_key_check')[0]?.values ?? [];
  for (const v of fk) problems.push(`foreign key violation in ${v[0]} (row ${v[1]}) -> ${v[2]}`);
  if (!readSaveMeta(db)) problems.push('missing game_saves row');
  return { ok: problems.length === 0, problems };
}
