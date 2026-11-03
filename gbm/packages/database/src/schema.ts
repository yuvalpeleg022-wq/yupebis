/**
 * SQLite schema. Every entity has its own table; nested value objects that are
 * always read and written together (e.g. tactics, quarter scores) are stored as
 * JSON columns. Migrations are applied in order using PRAGMA user_version.
 */
export interface Migration {
  version: number;
  description: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    sql: `
CREATE TABLE game_saves (
  career_id TEXT PRIMARY KEY,
  career_name TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  user_club_id TEXT,
  season INTEGER NOT NULL,
  current_date TEXT NOT NULL,
  phase TEXT NOT NULL,
  seed INTEGER NOT NULL,
  save_version INTEGER NOT NULL,
  board_confidence INTEGER NOT NULL,
  manager_reputation INTEGER NOT NULL,
  manager_attributes TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  dataset_source TEXT NOT NULL,
  fictional_coach_policy TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE game_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE id_counters (prefix TEXT PRIMARY KEY, value INTEGER NOT NULL);

CREATE TABLE data_sources (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL, publisher TEXT NOT NULL, accessed_on TEXT NOT NULL, method TEXT NOT NULL
);
CREATE TABLE data_issues (
  id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL, field TEXT NOT NULL, severity TEXT NOT NULL,
  message TEXT NOT NULL, candidates TEXT NOT NULL, status TEXT NOT NULL
);
CREATE INDEX idx_data_issues_entity ON data_issues(entity_id);

CREATE TABLE competition_rules (id TEXT PRIMARY KEY, name TEXT NOT NULL, family TEXT NOT NULL, definition TEXT NOT NULL);
CREATE TABLE leagues (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, short_name TEXT NOT NULL, country TEXT NOT NULL, region TEXT NOT NULL,
  rules_id TEXT NOT NULL REFERENCES competition_rules(id), tier INTEGER NOT NULL, active INTEGER NOT NULL,
  format TEXT NOT NULL, source TEXT NOT NULL
);

CREATE TABLE clubs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, short_name TEXT NOT NULL, city TEXT NOT NULL, country TEXT NOT NULL,
  league_id TEXT NOT NULL REFERENCES leagues(id), reputation INTEGER NOT NULL, arena_capacity INTEGER NOT NULL,
  ticket_price INTEGER NOT NULL, cash INTEGER NOT NULL, wage_budget INTEGER NOT NULL, staff_budget INTEGER NOT NULL,
  sponsorship INTEGER NOT NULL, tactics TEXT NOT NULL, rotation_auto INTEGER NOT NULL, ai_personality TEXT NOT NULL,
  youth_rating INTEGER NOT NULL, primary_color TEXT NOT NULL, source TEXT NOT NULL, source_ref TEXT, verification TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_clubs_source_ref ON clubs(source_ref);
CREATE TABLE competitions (
  club_id TEXT NOT NULL REFERENCES clubs(id), league_id TEXT NOT NULL REFERENCES leagues(id), is_primary INTEGER NOT NULL,
  PRIMARY KEY (club_id, league_id)
);
CREATE TABLE training_programs (club_id TEXT PRIMARY KEY REFERENCES clubs(id), focus TEXT NOT NULL);

CREATE TABLE players (
  id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, nationality TEXT NOT NULL, birth_date TEXT NOT NULL,
  height_cm INTEGER NOT NULL, weight_kg INTEGER NOT NULL, position TEXT NOT NULL, secondary_position TEXT,
  club_id TEXT REFERENCES clubs(id), jersey INTEGER, potential INTEGER NOT NULL, morale REAL NOT NULL, fatigue REAL NOT NULL,
  loyalty INTEGER NOT NULL, injury_id TEXT, retired INTEGER NOT NULL, source TEXT NOT NULL, source_ref TEXT,
  draft_year INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX idx_players_club ON players(club_id);
CREATE INDEX idx_players_name ON players(last_name, first_name);
CREATE TABLE player_attributes (
  player_id TEXT NOT NULL REFERENCES players(id), attribute TEXT NOT NULL, value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 100),
  PRIMARY KEY (player_id, attribute)
);
CREATE TABLE draft_classes (player_id TEXT PRIMARY KEY REFERENCES players(id), season INTEGER NOT NULL);
CREATE TABLE player_contracts (
  id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), club_id TEXT NOT NULL REFERENCES clubs(id),
  salary INTEGER NOT NULL CHECK (salary >= 0), start_season INTEGER NOT NULL, end_season INTEGER NOT NULL,
  option_type TEXT NOT NULL, buyout INTEGER, nba_exit_clause INTEGER NOT NULL, signed_date TEXT NOT NULL, active INTEGER NOT NULL,
  CHECK (end_season >= start_season)
);
CREATE INDEX idx_contracts_club ON player_contracts(club_id, active);
CREATE INDEX idx_contracts_player ON player_contracts(player_id);
CREATE TABLE player_injuries (
  id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), type TEXT NOT NULL, start_date TEXT NOT NULL,
  days_out INTEGER NOT NULL, days_remaining INTEGER NOT NULL, season INTEGER NOT NULL
);
CREATE INDEX idx_injuries_player ON player_injuries(player_id);
CREATE TABLE club_rosters (
  club_id TEXT NOT NULL REFERENCES clubs(id), player_id TEXT NOT NULL REFERENCES players(id),
  starter_slot INTEGER, target_minutes INTEGER NOT NULL, PRIMARY KEY (club_id, player_id)
);

CREATE TABLE club_staff (
  id TEXT PRIMARY KEY, club_id TEXT REFERENCES clubs(id), first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  nationality TEXT NOT NULL, birth_date TEXT, role TEXT NOT NULL, attributes TEXT NOT NULL, personality TEXT NOT NULL,
  philosophy TEXT NOT NULL, ambition TEXT NOT NULL, preferred_roles TEXT NOT NULL, reputation INTEGER NOT NULL,
  experience_years INTEGER NOT NULL, salary INTEGER NOT NULL, contract_start INTEGER NOT NULL, contract_end INTEGER NOT NULL,
  morale REAL NOT NULL, retired INTEGER NOT NULL, source TEXT NOT NULL, source_ref TEXT, verification TEXT NOT NULL,
  market_excluded INTEGER NOT NULL
);
CREATE INDEX idx_staff_club ON club_staff(club_id);
CREATE TABLE staff_career_history (
  id TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES club_staff(id), club_id TEXT NOT NULL REFERENCES clubs(id),
  role TEXT NOT NULL, start_season INTEGER NOT NULL, end_season INTEGER, wins INTEGER NOT NULL, losses INTEGER NOT NULL,
  titles INTEGER NOT NULL, end_reason TEXT NOT NULL
);
CREATE INDEX idx_staff_history ON staff_career_history(staff_id);
CREATE TABLE staff_negotiations (
  id TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES club_staff(id), club_id TEXT NOT NULL REFERENCES clubs(id),
  kind TEXT NOT NULL, role TEXT NOT NULL, salary INTEGER NOT NULL, years INTEGER NOT NULL, rounds INTEGER NOT NULL,
  status TEXT NOT NULL, response TEXT NOT NULL, counter_salary INTEGER, counter_role TEXT, counter_years INTEGER,
  willingness INTEGER NOT NULL, message TEXT NOT NULL, created_date TEXT NOT NULL, decision_date TEXT NOT NULL, compensation INTEGER NOT NULL
);

CREATE TABLE fixtures (
  id TEXT PRIMARY KEY, league_id TEXT NOT NULL REFERENCES leagues(id), season INTEGER NOT NULL, date TEXT NOT NULL,
  home_id TEXT NOT NULL REFERENCES clubs(id), away_id TEXT NOT NULL REFERENCES clubs(id), stage TEXT NOT NULL,
  round INTEGER NOT NULL, series_id TEXT, game_number INTEGER, neutral INTEGER NOT NULL, match_id TEXT
);
CREATE INDEX idx_fixtures_date ON fixtures(date);
CREATE INDEX idx_fixtures_league ON fixtures(league_id, season);
CREATE TABLE matches (
  id TEXT PRIMARY KEY, fixture_id TEXT NOT NULL UNIQUE REFERENCES fixtures(id), league_id TEXT NOT NULL, season INTEGER NOT NULL,
  date TEXT NOT NULL, home_id TEXT NOT NULL, away_id TEXT NOT NULL, home_score INTEGER NOT NULL, away_score INTEGER NOT NULL,
  home_quarters TEXT NOT NULL, away_quarters TEXT NOT NULL, overtimes INTEGER NOT NULL, attendance INTEGER NOT NULL,
  home_stats TEXT NOT NULL, away_stats TEXT NOT NULL, seed INTEGER NOT NULL
);
CREATE INDEX idx_matches_season ON matches(season, league_id);
CREATE TABLE match_events (match_id TEXT PRIMARY KEY REFERENCES matches(id), events TEXT NOT NULL);
CREATE TABLE match_player_stats (
  match_id TEXT NOT NULL REFERENCES matches(id), player_id TEXT NOT NULL REFERENCES players(id), club_id TEXT NOT NULL,
  starter INTEGER NOT NULL, seconds INTEGER NOT NULL, pts INTEGER NOT NULL, fgm INTEGER NOT NULL, fga INTEGER NOT NULL,
  tpm INTEGER NOT NULL, tpa INTEGER NOT NULL, ftm INTEGER NOT NULL, fta INTEGER NOT NULL, oreb INTEGER NOT NULL,
  dreb INTEGER NOT NULL, ast INTEGER NOT NULL, stl INTEGER NOT NULL, blk INTEGER NOT NULL, tov INTEGER NOT NULL,
  pf INTEGER NOT NULL, plus_minus INTEGER NOT NULL, PRIMARY KEY (match_id, player_id)
);
CREATE INDEX idx_mps_player ON match_player_stats(player_id);
CREATE TABLE playoff_series (
  id TEXT PRIMARY KEY, league_id TEXT NOT NULL, season INTEGER NOT NULL, round INTEGER NOT NULL, slot INTEGER NOT NULL,
  high_seed_id TEXT NOT NULL, low_seed_id TEXT NOT NULL, high_seed INTEGER NOT NULL, low_seed INTEGER NOT NULL,
  high_wins INTEGER NOT NULL, low_wins INTEGER NOT NULL, best_of INTEGER NOT NULL, winner_id TEXT
);
CREATE TABLE standings (
  season INTEGER NOT NULL, league_id TEXT NOT NULL, rank INTEGER NOT NULL, club_id TEXT NOT NULL, row TEXT NOT NULL,
  PRIMARY KEY (season, league_id, club_id)
);
CREATE TABLE seasons (
  season INTEGER NOT NULL, league_id TEXT NOT NULL, champion_id TEXT, runner_up_id TEXT, regular_season_winner_id TEXT,
  PRIMARY KEY (season, league_id)
);
CREATE TABLE player_seasons (
  player_id TEXT NOT NULL, season INTEGER NOT NULL, club_id TEXT NOT NULL, league_id TEXT NOT NULL, stage TEXT NOT NULL,
  gp INTEGER NOT NULL, gs INTEGER NOT NULL, seconds INTEGER NOT NULL, pts INTEGER NOT NULL, fgm INTEGER NOT NULL,
  fga INTEGER NOT NULL, tpm INTEGER NOT NULL, tpa INTEGER NOT NULL, ftm INTEGER NOT NULL, fta INTEGER NOT NULL,
  oreb INTEGER NOT NULL, dreb INTEGER NOT NULL, ast INTEGER NOT NULL, stl INTEGER NOT NULL, blk INTEGER NOT NULL,
  tov INTEGER NOT NULL, pf INTEGER NOT NULL, overall INTEGER NOT NULL,
  PRIMARY KEY (player_id, season, club_id, stage)
);
CREATE INDEX idx_player_seasons_season ON player_seasons(season, league_id);
CREATE TABLE player_career_history (
  player_id TEXT NOT NULL, season INTEGER NOT NULL, club_id TEXT NOT NULL, games INTEGER NOT NULL, points INTEGER NOT NULL,
  PRIMARY KEY (player_id, season, club_id)
);
CREATE TABLE awards (
  id TEXT PRIMARY KEY, season INTEGER NOT NULL, league_id TEXT NOT NULL, award TEXT NOT NULL, player_id TEXT, club_id TEXT, value TEXT NOT NULL
);
CREATE TABLE transfers (
  id TEXT PRIMARY KEY, date TEXT NOT NULL, season INTEGER NOT NULL, player_id TEXT NOT NULL, from_club_id TEXT, to_club_id TEXT,
  type TEXT NOT NULL, fee INTEGER NOT NULL, salary INTEGER NOT NULL, years INTEGER NOT NULL
);
CREATE INDEX idx_transfers_player ON transfers(player_id);
CREATE TABLE transfer_negotiations (
  id TEXT PRIMARY KEY, player_id TEXT NOT NULL, club_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
  rounds INTEGER NOT NULL, last_offer_salary INTEGER NOT NULL, last_offer_years INTEGER NOT NULL, asking_salary INTEGER NOT NULL,
  date TEXT NOT NULL, message TEXT NOT NULL
);
CREATE TABLE scouting_reports (
  id TEXT PRIMARY KEY, player_id TEXT NOT NULL, club_id TEXT NOT NULL, date TEXT NOT NULL, potential_low INTEGER NOT NULL,
  potential_high INTEGER NOT NULL, overall_estimate INTEGER NOT NULL, notes TEXT NOT NULL
);
CREATE TABLE club_finances (
  id TEXT PRIMARY KEY, club_id TEXT NOT NULL, date TEXT NOT NULL, season INTEGER NOT NULL, category TEXT NOT NULL,
  amount INTEGER NOT NULL, description TEXT NOT NULL
);
CREATE INDEX idx_finances_club ON club_finances(club_id, season);
CREATE TABLE news_events (
  id TEXT PRIMARY KEY, date TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, club_id TEXT,
  player_id TEXT, important INTEGER NOT NULL, read INTEGER NOT NULL
);
CREATE INDEX idx_news_date ON news_events(date);
CREATE TABLE manager_history (
  id TEXT PRIMARY KEY, club_id TEXT NOT NULL, start_season INTEGER NOT NULL, end_season INTEGER, wins INTEGER NOT NULL,
  losses INTEGER NOT NULL, titles INTEGER NOT NULL, end_reason TEXT NOT NULL
);
CREATE TABLE job_offers (
  id TEXT PRIMARY KEY, club_id TEXT NOT NULL, kind TEXT NOT NULL, date TEXT NOT NULL, expires TEXT NOT NULL, status TEXT NOT NULL, message TEXT NOT NULL
);
`,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
