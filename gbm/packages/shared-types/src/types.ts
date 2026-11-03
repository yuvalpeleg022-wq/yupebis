/**
 * Core domain types for Global Basketball Manager.
 * These types are platform-independent and shared by the engine, the database
 * layer and the UI. They describe a normalized game world: every entity is
 * stored in its own table keyed by a stable string id.
 */

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

/**
 * Where a record came from. The game must never present generated or
 * user-imported data as verified real-world data.
 */
export type DataSource = 'verified' | 'imported' | 'generated';

/**
 * Evidence level for a real-world record.
 * - verified:    confirmed against a primary/official source page.
 * - reported:    explicitly stated by a named secondary source; primary page not checked.
 * - unverified:  mentioned ambiguously; NOT used for assignments.
 * - conflicting: sources disagree; NOT used for assignments until resolved.
 * - incomplete:  real person/club, but key facts (e.g. current club) are unknown.
 * - fictional:   generated game character, not a real person.
 */
export type VerificationStatus = 'verified' | 'reported' | 'unverified' | 'conflicting' | 'incomplete' | 'fictional';

export interface Verification {
  status: VerificationStatus;
  /** Source ids from the dataset's source registry. */
  sources: string[];
  verifiedOn: string | null;
  missingFields: string[];
  notes: string;
}

/** A known gap or problem in the real-world data, persisted in data_issues. */
export interface DataIssue {
  id: string;
  entity: 'club' | 'coach' | 'player' | 'league';
  entityId: string;
  /** e.g. 'staff:head_coach', 'nationality', 'participation'. */
  field: string;
  severity: 'missing' | 'conflict' | 'unverified';
  message: string;
  candidates: string[];
  status: 'open' | 'resolved';
}

export interface DataSourceRecord {
  id: string;
  title: string;
  url: string;
  publisher: string;
  accessedOn: string;
  method: string;
}

export const OFFENSE_ATTRIBUTES = [
  'insideScoring',
  'layups',
  'dunking',
  'midRange',
  'threePoint',
  'freeThrow',
  'ballHandling',
  'passing',
  'offensiveIQ',
  'offBallMovement',
  'offensiveRebounding',
] as const;
export const DEFENSE_ATTRIBUTES = [
  'perimeterDefense',
  'interiorDefense',
  'steals',
  'blocks',
  'defensiveIQ',
  'defensiveRebounding',
  'helpDefense',
] as const;
export const PHYSICAL_ATTRIBUTES = ['speed', 'acceleration', 'strength', 'vertical', 'stamina', 'agility'] as const;
export const MENTAL_ATTRIBUTES = [
  'leadership',
  'consistency',
  'clutch',
  'workEthic',
  'basketballIQ',
  'teamChemistry',
] as const;
export const ALL_ATTRIBUTES = [
  ...OFFENSE_ATTRIBUTES,
  ...DEFENSE_ATTRIBUTES,
  ...PHYSICAL_ATTRIBUTES,
  ...MENTAL_ATTRIBUTES,
] as const;

export type AttributeKey = (typeof ALL_ATTRIBUTES)[number];
/** All attributes are integers in the range 1..100. */
export type Attributes = Record<AttributeKey, number>;

export type PlayerRole = 'star' | 'starter' | 'rotation' | 'bench' | 'prospect';

export interface Injury {
  id: string;
  playerId: string;
  type: string;
  startDate: string;
  daysOut: number;
  daysRemaining: number;
  season: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string; // ISO yyyy-mm-dd
  heightCm: number;
  weightKg: number;
  position: Position;
  secondaryPosition: Position | null;
  clubId: string | null;
  jersey: number | null;
  attributes: Attributes;
  /** True ceiling (1..100). Hidden from the user: shown through scouting estimates. */
  potential: number;
  morale: number; // 0..100
  fatigue: number; // 0..100 accumulated season fatigue
  loyalty: number; // 0..100
  injuryId: string | null;
  retired: boolean;
  source: DataSource;
  /** External reference (e.g. import source id). */
  sourceRef: string | null;
  draftYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export type ContractOption = 'none' | 'player' | 'team';

export interface Contract {
  id: string;
  playerId: string;
  clubId: string;
  /** Annual salary in game currency units. */
  salary: number;
  startSeason: number;
  /** Last season covered (inclusive). */
  endSeason: number;
  option: ContractOption;
  /** European buyout amount; null when not applicable. */
  buyout: number | null;
  nbaExitClause: boolean;
  signedDate: string;
  active: boolean;
}

export type DefensiveScheme = 'man' | 'zone' | 'press' | 'switch' | 'drop';

export interface Tactics {
  /** All sliders 0..100, 50 = neutral. */
  pace: number;
  fastBreak: number;
  pickAndRoll: number;
  isolation: number;
  motion: number;
  postUp: number;
  threePointFocus: number;
  ballMovement: number;
  defense: DefensiveScheme;
  pressure: number;
  doubleTeams: number;
}

export interface Rotation {
  /** Exactly five player ids when valid. */
  starters: string[];
  /** Target minutes per player for a regulation game. */
  minutes: Record<string, number>;
  /** When true the assistant coach (AI) maintains the rotation automatically. */
  auto: boolean;
}

export type AiPersonality =
  | 'win_now'
  | 'youth_development'
  | 'financial_conservative'
  | 'aggressive_trader'
  | 'superstar_collector'
  | 'defensive_specialist'
  | 'rebuilding';

export type TrainingFocus =
  | 'balanced'
  | 'shooting'
  | 'ball_handling'
  | 'strength'
  | 'conditioning'
  | 'defense'
  | 'playmaking'
  | 'recovery'
  | 'youth';

export interface Club {
  id: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  /** Primary competition: its rules (rosters, salary rules) apply to the club. */
  leagueId: string;
  /** Every competition the club plays in this season (primary first). */
  competitionIds: string[];
  reputation: number; // 1..100
  arenaCapacity: number;
  ticketPrice: number;
  cash: number;
  wageBudget: number;
  sponsorshipPerSeason: number;
  tactics: Tactics;
  rotation: Rotation;
  aiPersonality: AiPersonality;
  trainingFocus: TrainingFocus;
  youthRating: number; // youth academy quality 1..100
  /** Board-approved budget for coaching staff salaries per season. */
  staffBudget: number;
  primaryColor: string; // neutral UI accent (no branding)
  source: DataSource;
  sourceRef: string | null;
  verification: Verification;
}

export type StaffRole =
  | 'head_coach'
  | 'assistant_coach'
  | 'offensive_coordinator'
  | 'defensive_coordinator'
  | 'player_development'
  | 'shooting_coach';

export const STAFF_ROLES: StaffRole[] = [
  'head_coach',
  'assistant_coach',
  'offensive_coordinator',
  'defensive_coordinator',
  'player_development',
  'shooting_coach',
];

/** Coaching skills, each 1..100. */
export interface CoachAttributes {
  offense: number;
  defense: number;
  playerDevelopment: number;
  shooting: number;
  /** Practice planning and training quality. */
  training: number;
  /** In-game decisions and adjustments. */
  gameManagement: number;
  /** Talent evaluation. */
  scouting: number;
  /** Man-management and team chemistry. */
  chemistry: number;
  motivation: number;
  adaptability: number;
}

export const COACH_ATTRIBUTE_KEYS: (keyof CoachAttributes)[] = [
  'offense', 'defense', 'playerDevelopment', 'shooting', 'training', 'gameManagement', 'scouting', 'chemistry',
  'motivation', 'adaptability',
];

export type CoachPersonality = 'players_coach' | 'disciplinarian' | 'innovator' | 'loyal' | 'ambitious' | 'mercenary';
export type CoachingPhilosophy = 'pace_and_space' | 'defense_first' | 'motion_offense' | 'post_oriented' | 'development' | 'balanced';
export type CareerAmbition = 'become_head_coach' | 'win_titles' | 'stability' | 'money' | 'develop_players';

export interface Staff {
  id: string;
  clubId: string | null;
  firstName: string;
  lastName: string;
  /** Empty string when unknown (real coach with unverified nationality). */
  nationality: string;
  /** Null when unknown — never invented for real coaches. */
  birthDate: string | null;
  role: StaffRole;
  attributes: CoachAttributes;
  personality: CoachPersonality;
  philosophy: CoachingPhilosophy;
  ambition: CareerAmbition;
  preferredRoles: StaffRole[];
  reputation: number; // 1..100
  experienceYears: number;
  salary: number;
  contractStartSeason: number;
  contractEndSeason: number;
  /** Job satisfaction 0..100; low morale coaches may resign. */
  morale: number;
  retired: boolean;
  source: DataSource;
  sourceRef: string | null;
  verification: Verification;
  /** Unresolved real coaches (conflicting or unknown status) stay out of the market. */
  marketExcluded: boolean;
}

/** One stint in a coach's career (persisted in staff_career_history). */
export interface StaffCareerEntry {
  id: string;
  staffId: string;
  clubId: string;
  role: StaffRole;
  startSeason: number;
  endSeason: number | null;
  wins: number;
  losses: number;
  titles: number;
  endReason: 'active' | 'fired' | 'resigned' | 'contract_expired' | 'poached' | 'retired' | 'promoted' | 'demoted' | 'role_change' | 'replaced';
}

export type StaffNegotiationKind = 'hire' | 'renewal' | 'promotion';
export type StaffNegotiationResponse =
  | 'pending'
  | 'accepted'
  | 'counter_salary'
  | 'request_role'
  | 'demand_years'
  | 'rejected'
  | 'signed_elsewhere';

/** A contract offer to a coach, from the user or an AI club. */
export interface StaffNegotiation {
  id: string;
  staffId: string;
  clubId: string;
  kind: StaffNegotiationKind;
  role: StaffRole;
  salary: number;
  years: number;
  rounds: number;
  status: 'open' | 'accepted' | 'rejected' | 'expired';
  response: StaffNegotiationResponse;
  counterSalary: number | null;
  counterRole: StaffRole | null;
  counterYears: number | null;
  willingness: number;
  message: string;
  createdDate: string;
  /** Date the coach will decide on (AI offers) or the offer lapses. */
  decisionDate: string;
  /** Compensation owed to the coach's current club if poached. */
  compensation: number;
}

export type SalaryCapType = 'soft' | 'hard' | 'none';

export interface CompetitionRules {
  id: string;
  name: string;
  /** e.g. 'NBA' or 'FIBA' rules family. */
  family: 'NBA' | 'FIBA';
  periods: number;
  periodMinutes: number;
  overtimeMinutes: number;
  shotClock: number;
  personalFoulLimit: number;
  /** Team fouls per period after which every foul awards free throws. */
  teamFoulBonus: number;
  rosterMin: number;
  rosterMax: number;
  /** Maximum active players dressed for a game. */
  gameRosterMax: number;
  foreignPlayerLimit: number | null;
  salaryCap: {
    type: SalaryCapType;
    cap: number;
    luxuryTax: number | null;
    luxuryTaxRate: number;
    minSalary: number;
    maxSalary: number;
    /** Minimum payroll a club must reach (NBA style). */
    salaryFloor: number | null;
  };
  /** Release costs: share of remaining contract value paid on release. */
  releaseCostShare: number;
  allowBuyouts: boolean;
  /** Note displayed in the UI: these are gameplay approximations. */
  note: string;
}

export interface PlayoffFormat {
  teams: number;
  /** Games per round, e.g. [7,7,7,7] or [5,1,1] (Final Four style). */
  seriesLengths: number[];
  /** Rounds that are played as a neutral-site single game (Final Four). */
  neutralRounds: number[];
}

export interface League {
  id: string;
  name: string;
  shortName: string;
  country: string;
  region: 'north_america' | 'europe' | 'asia_pacific' | 'south_america' | 'africa' | 'college';
  rulesId: string;
  tier: number;
  /** Number of complete round robins in the regular season. */
  roundRobins: number;
  /** Days between rounds of the regular season. */
  daysBetweenRounds: number;
  /** Optional repeating pattern of gaps (days) between rounds, e.g. [5, 2, 7] for Thu/Tue/Thu weeks. */
  roundGaps?: number[];
  /** Data completeness note shown in the UI (e.g. partial club list). */
  dataNote?: string;
  seasonStartMonthDay: string; // 'MM-DD'
  playoff: PlayoffFormat;
  tvRevenuePerClub: number;
  salaryScale: { min: number; max: number };
  currency: string;
  source: DataSource;
  /** Whether this league is part of the playable world. */
  active: boolean;
}

export type FixtureStage = 'regular' | 'playoff';

export interface Fixture {
  id: string;
  leagueId: string;
  season: number;
  date: string;
  homeId: string;
  awayId: string;
  stage: FixtureStage;
  round: number;
  seriesId: string | null;
  gameNumber: number | null;
  neutral: boolean;
  matchId: string | null;
}

export interface TeamGameStats {
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  possessions: number;
  fastBreakPts: number;
  pointsInPaint: number;
  secondChancePts: number;
}

export interface PlayerGameStats {
  matchId: string;
  playerId: string;
  clubId: string;
  starter: boolean;
  seconds: number;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  plusMinus: number;
}

export interface MatchEvent {
  period: number;
  /** Seconds remaining in the period. */
  clock: number;
  clubId: string;
  playerId: string | null;
  type:
    | 'made2'
    | 'miss2'
    | 'made3'
    | 'miss3'
    | 'ftMade'
    | 'ftMiss'
    | 'oreb'
    | 'dreb'
    | 'turnover'
    | 'steal'
    | 'block'
    | 'foul'
    | 'sub'
    | 'period_end'
    | 'injury';
  text: string;
  homeScore: number;
  awayScore: number;
}

export interface Match {
  id: string;
  fixtureId: string;
  leagueId: string;
  season: number;
  date: string;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  homeQuarters: number[];
  awayQuarters: number[];
  overtimes: number;
  attendance: number;
  homeStats: TeamGameStats;
  awayStats: TeamGameStats;
  seed: number;
  /** Play-by-play is only stored for the user's matches to keep saves small. */
  events: MatchEvent[] | null;
}

export interface PlayoffSeries {
  id: string;
  leagueId: string;
  season: number;
  round: number;
  slot: number;
  highSeedId: string;
  lowSeedId: string;
  highSeed: number;
  lowSeed: number;
  highWins: number;
  lowWins: number;
  bestOf: number;
  winnerId: string | null;
}

export interface StandingRow {
  clubId: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  streak: number; // positive = wins, negative = losses
  last10: string; // e.g. '7-3'
}

export type NewsType =
  | 'match'
  | 'injury'
  | 'transfer'
  | 'contract'
  | 'finance'
  | 'board'
  | 'season'
  | 'development'
  | 'retirement'
  | 'system';

export interface NewsEvent {
  id: string;
  date: string;
  type: NewsType;
  title: string;
  body: string;
  clubId: string | null;
  playerId: string | null;
  /** Important events stop time advancement for the user. */
  important: boolean;
  read: boolean;
}

export type FinanceCategory =
  | 'tickets'
  | 'sponsorship'
  | 'tv'
  | 'salary'
  | 'staff'
  | 'operations'
  | 'transfer'
  | 'release'
  | 'luxury_tax'
  | 'prize';

export interface FinanceTransaction {
  id: string;
  clubId: string;
  date: string;
  season: number;
  category: FinanceCategory;
  amount: number;
  description: string;
}

export type TransferType = 'free_agent' | 'release' | 'renewal' | 'transfer' | 'trade' | 'draft' | 'retirement';

export interface TransferRecord {
  id: string;
  date: string;
  season: number;
  playerId: string;
  fromClubId: string | null;
  toClubId: string | null;
  type: TransferType;
  fee: number;
  salary: number;
  years: number;
}

export type NegotiationStatus = 'open' | 'accepted' | 'rejected' | 'withdrawn';

export interface TransferNegotiation {
  id: string;
  playerId: string;
  clubId: string;
  kind: 'free_agent' | 'renewal';
  status: NegotiationStatus;
  rounds: number;
  lastOfferSalary: number;
  lastOfferYears: number;
  askingSalary: number;
  date: string;
  message: string;
}

export interface PlayerSeasonStats {
  playerId: string;
  season: number;
  clubId: string;
  leagueId: string;
  stage: FixtureStage;
  gp: number;
  gs: number;
  seconds: number;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  overall: number;
}

export interface SeasonStanding {
  season: number;
  leagueId: string;
  rank: number;
  row: StandingRow;
}

export interface Award {
  id: string;
  season: number;
  leagueId: string;
  award: 'mvp' | 'champion' | 'top_scorer' | 'rookie_of_year';
  playerId: string | null;
  clubId: string | null;
  value: string;
}

export interface SeasonSummary {
  season: number;
  leagueId: string;
  championId: string | null;
  runnerUpId: string | null;
  regularSeasonWinnerId: string | null;
}

export interface ManagerStint {
  id: string;
  clubId: string;
  startSeason: number;
  endSeason: number | null;
  wins: number;
  losses: number;
  titles: number;
  endReason: 'active' | 'fired' | 'resigned' | 'moved';
}

export interface ScoutingReport {
  id: string;
  playerId: string;
  clubId: string;
  date: string;
  /** Scout's estimate of the player's potential, may be wrong. */
  potentialLow: number;
  potentialHigh: number;
  overallEstimate: number;
  notes: string;
}

export type SeasonPhase = 'preseason' | 'regular' | 'playoffs' | 'offseason';

export interface CareerMeta {
  saveVersion: number;
  careerId: string;
  careerName: string;
  managerName: string;
  /** The club the user manages; '' while the user is between jobs. */
  userClubId: string;
  /** User's standing in the coaching world (1..100); drives job offers. */
  managerReputation: number;
  /** The user's coaching skills as head coach of their club. */
  managerAttributes: CoachAttributes;
  season: number;
  currentDate: string;
  phase: SeasonPhase;
  seed: number;
  idCounters: Record<string, number>;
  boardConfidence: number; // 0..100
  createdAt: string;
  updatedAt: string;
  datasetName: string;
  datasetSource: DataSource;
  /**
   * When AI clubs may hire fictional coaches: 'when_needed' (default) only if no
   * suitable real coach is available; 'never' keeps the market real-only.
   */
  fictionalCoachPolicy: 'when_needed' | 'never';
}

/** The complete, normalized game world held in memory during play. */
export interface World {
  meta: CareerMeta;
  rules: Record<string, CompetitionRules>;
  leagues: Record<string, League>;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  contracts: Record<string, Contract>;
  staff: Record<string, Staff>;
  injuries: Record<string, Injury>;
  fixtures: Record<string, Fixture>;
  matches: Record<string, Match>;
  playerGameStats: PlayerGameStats[];
  series: Record<string, PlayoffSeries>;
  news: NewsEvent[];
  finances: FinanceTransaction[];
  transfers: TransferRecord[];
  negotiations: Record<string, TransferNegotiation>;
  playerSeasons: PlayerSeasonStats[];
  seasonStandings: SeasonStanding[];
  seasonSummaries: SeasonSummary[];
  awards: Award[];
  managerHistory: ManagerStint[];
  staffHistory: StaffCareerEntry[];
  staffNegotiations: Record<string, StaffNegotiation>;
  scoutingReports: Record<string, ScoutingReport>;
  dataIssues: Record<string, DataIssue>;
  jobOffers: JobOffer[];
  dataSources: Record<string, DataSourceRecord>;
}

/** A head-coaching job offer to the user, or the user's application. */
export interface JobOffer {
  id: string;
  clubId: string;
  kind: 'offer' | 'application';
  date: string;
  expires: string;
  status: 'open' | 'accepted' | 'declined' | 'rejected' | 'expired';
  message: string;
}

export const SAVE_VERSION = 1;
