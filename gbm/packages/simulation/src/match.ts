import type {
  Attributes,
  CompetitionRules,
  MatchEvent,
  PlayerGameStats,
  Position,
  Tactics,
  TeamGameStats,
} from '@gbm/shared-types';
import { Rng, clamp } from '@gbm/shared-types';
import { composites } from '@gbm/player-system';
import { tacticalFit } from './tactics';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SimPlayerInput {
  id: string;
  name: string;
  position: Position;
  secondaryPosition: Position | null;
  attributes: Attributes;
  overall: number;
  /** Starting energy 0..100 (reduced by accumulated season fatigue). */
  energy: number;
}

export interface SimTeamInput {
  clubId: string;
  name: string;
  players: SimPlayerInput[];
  starters: string[];
  /** Target minutes per player for regulation. */
  targetMinutes: Record<string, number>;
  tactics: Tactics;
  /** Offensive coaching quality (head coach + offensive coordinator), 1..100. */
  coachRating: number;
  /** Defensive coaching quality (head coach + defensive coordinator), 1..100. */
  defenseCoachRating: number;
  /** In-game management (head coach), 1..100. */
  gameManagement: number;
  chemistry: number;
}

export interface SimOptions {
  rules: CompetitionRules;
  seed: number;
  homeCourt: boolean;
  recordEvents: boolean;
  /** Multiplier for in-game injury risk (0 disables injuries). */
  injuryRate?: number;
}

export interface SimInjury {
  playerId: string;
  clubId: string;
  days: number;
  type: string;
}

export interface SimResult {
  homeScore: number;
  awayScore: number;
  homeQuarters: number[];
  awayQuarters: number[];
  overtimes: number;
  homeStats: TeamGameStats;
  awayStats: TeamGameStats;
  playerStats: Omit<PlayerGameStats, 'matchId'>[];
  events: MatchEvent[];
  injuries: SimInjury[];
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

type ShotType = 'rim' | 'mid' | 'three';

interface PState {
  input: SimPlayerInput;
  a: Attributes;
  c: ReturnType<typeof composites>;
  energy: number;
  seconds: number;
  fouls: number;
  fouledOut: boolean;
  injured: boolean;
  onCourt: boolean;
  targetSec: number;
  /** Per-game form (hot/cold night) derived from consistency. */
  form: number;
  isGuard: boolean;
  isBig: boolean;
  stats: Omit<PlayerGameStats, 'matchId'>;
}

interface TState {
  input: SimTeamInput;
  isHome: boolean;
  players: PState[];
  court: PState[];
  score: number;
  quarters: number[];
  teamFouls: number;
  stats: TeamGameStats;
  fit: number;
  lastSubCheck: number;
  run: number; // current scoring run in points (momentum)
}

const POS_ORDER: Record<Position, number> = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };

function emptyTeamStats(): TeamGameStats {
  return {
    pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0,
    pf: 0, possessions: 0, fastBreakPts: 0, pointsInPaint: 0, secondChancePts: 0,
  };
}

/** Target possessions per team at neutral pace for each rules family. */
const TARGET_POSSESSIONS: Record<CompetitionRules['family'], number> = { NBA: 99, FIBA: 73 };

const SHOT_MIX: Record<CompetitionRules['family'], Record<ShotType, number>> = {
  NBA: { rim: 0.37, mid: 0.2, three: 0.43 },
  FIBA: { rim: 0.38, mid: 0.24, three: 0.38 },
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function simulateMatch(home: SimTeamInput, away: SimTeamInput, opts: SimOptions): SimResult {
  const sim = new MatchSim(home, away, opts);
  return sim.run();
}

class MatchSim {
  private rng: Rng;
  private rules: CompetitionRules;
  private home: TState;
  private away: TState;
  private events: MatchEvent[] = [];
  private injuries: SimInjury[] = [];
  private period = 1;
  private clock = 0;
  private elapsed = 0;
  private regSeconds: number;
  private baseDuration: number;

  constructor(home: SimTeamInput, away: SimTeamInput, private opts: SimOptions) {
    this.rng = new Rng(opts.seed);
    this.rules = opts.rules;
    this.regSeconds = this.rules.periods * this.rules.periodMinutes * 60;
    const target = TARGET_POSSESSIONS[this.rules.family];
    // Average possession length excluding offensive-rebound extensions.
    this.baseDuration = (this.regSeconds / (2 * target)) * 1.04;
    this.home = this.initTeam(home, true);
    this.away = this.initTeam(away, false);
    this.home.fit = tacticalFit(home.tactics, home.players.filter((p) => home.starters.includes(p.id)));
    this.away.fit = tacticalFit(away.tactics, away.players.filter((p) => away.starters.includes(p.id)));
  }

  private initTeam(input: SimTeamInput, isHome: boolean): TState {
    if (input.players.length < 5) throw new Error(`${input.name} has fewer than 5 available players`);
    const players: PState[] = input.players.map((p) => {
      const isGuard = p.position === 'PG' || p.position === 'SG' || p.secondaryPosition === 'PG';
      const isBig = p.position === 'PF' || p.position === 'C' || p.secondaryPosition === 'C';
      return {
        input: p,
        a: p.attributes,
        c: composites(p.attributes),
        energy: clamp(p.energy, 40, 100),
        seconds: 0,
        fouls: 0,
        fouledOut: false,
        injured: false,
        onCourt: false,
        targetSec: (input.targetMinutes[p.id] ?? 0) * 60,
        form: this.rng.normal(0, (100 - p.attributes.consistency) * 0.00035),
        isGuard,
        isBig,
        stats: {
          playerId: p.id, clubId: input.clubId, starter: false, seconds: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0,
          ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, plusMinus: 0,
        },
      };
    });
    const t: TState = {
      input, isHome, players, court: [], score: 0, quarters: [], teamFouls: 0, stats: emptyTeamStats(), fit: 0,
      lastSubCheck: 0, run: 0,
    };
    // Starters: requested five if all available, otherwise best fill.
    const starters = input.starters.map((id) => players.find((p) => p.input.id === id)).filter(Boolean) as PState[];
    const chosen = starters.length === 5 ? starters : this.pickLineup(t, true);
    for (const p of chosen) {
      p.onCourt = true;
      p.stats.starter = true;
    }
    t.court = this.sortCourt(chosen);
    return t;
  }

  run(): SimResult {
    let possession: TState = this.jumpBall();
    const firstPossession = possession;
    while (true) {
      const length = (this.period <= this.rules.periods ? this.rules.periodMinutes : this.rules.overtimeMinutes) * 60;
      this.clock = length;
      this.home.teamFouls = 0;
      this.away.teamFouls = 0;
      const startHome = this.home.score;
      const startAway = this.away.score;
      if (this.period > 1) {
        const rest = this.period === Math.floor(this.rules.periods / 2) + 1 ? 14 : 6;
        for (const t of [this.home, this.away]) for (const p of t.players) p.energy = Math.min(100, p.energy + rest);
        this.substitutions(this.home, true);
        this.substitutions(this.away, true);
        // Alternate the opening possession of each period.
        possession = this.period % 2 === 0 ? this.other(firstPossession) : firstPossession;
      }
      let transition = false;
      while (this.clock > 0) {
        const res = this.possession(possession, this.other(possession), transition);
        transition = res.transitionNext;
        possession = this.other(possession);
        if (res.deadBall) {
          this.substitutions(this.home, false);
          this.substitutions(this.away, false);
        }
      }
      this.home.quarters.push(this.home.score - startHome);
      this.away.quarters.push(this.away.score - startAway);
      this.event(possession, null, 'period_end', `End of ${this.periodName()}`);
      if (this.period >= this.rules.periods && this.home.score !== this.away.score) break;
      if (this.period > this.rules.periods + 10) break; // safety valve
      this.period++;
    }
    return this.result();
  }

  private periodName(): string {
    if (this.period <= this.rules.periods) return this.rules.periods === 2 ? `half ${this.period}` : `Q${this.period}`;
    return `OT${this.period - this.rules.periods}`;
  }

  private other(t: TState): TState {
    return t === this.home ? this.away : this.home;
  }

  private jumpBall(): TState {
    const tallest = (t: TState) => Math.max(...t.court.map((p) => p.input.attributes.vertical + p.c.rebounding));
    const h = tallest(this.home);
    const a = tallest(this.away);
    return this.rng.chance(h / (h + a)) ? this.home : this.away;
  }

  // -------------------------------------------------------------------------
  // Possession
  // -------------------------------------------------------------------------

  private possession(off: TState, def: TState, transition: boolean): { transitionNext: boolean; deadBall: boolean } {
    off.stats.possessions++;
    const paceFactor =
      1 - ((off.input.tactics.pace - 50) * 0.0045 + (def.input.tactics.pace - 50) * 0.0015) -
      (def.input.tactics.defense === 'press' ? 0.05 : 0);
    let duration = transition
      ? this.rng.range(3, 7)
      : clamp(this.baseDuration * paceFactor * this.rng.range(0.55, 1.45), 3, this.rules.shotClock);
    const endOfPeriod = this.clock <= duration + 1;
    if (endOfPeriod) duration = Math.max(0.5, this.clock);
    this.tickTime(duration * 0.6);

    // --- Turnover --------------------------------------------------------
    const handler = this.pickHandler(off);
    const dt = def.input.tactics;
    const defStealAvg = avg(def.court.map((p) => p.a.steals));
    let pTO =
      0.158 +
      (dt.pressure - 50) * 0.0007 +
      (dt.defense === 'press' ? 0.025 : 0) +
      (dt.doubleTeams - 50) * 0.0003 -
      (handler.c.creation - 60) * 0.0011 -
      (avg(off.court.map((p) => p.a.basketballIQ)) - 60) * 0.0008 +
      (defStealAvg - 60) * 0.0007 +
      (def.input.defenseCoachRating - 60) * 0.0002 -
      (transition ? 0.015 : 0) +
      (off.input.tactics.pace - 50) * 0.0003 -
      off.fit * 0.5;
    pTO = clamp(pTO, 0.06, 0.22);
    if (this.rng.chance(pTO)) {
      const culprit = this.rng.chance(0.7) ? handler : this.weighted(off.court, (p) => 100 - p.a.ballHandling + 20);
      culprit.stats.tov++;
      off.stats.tov++;
      const offensiveFoul = this.rng.chance(0.1);
      let live = false;
      if (offensiveFoul) {
        this.addFoul(off, culprit, false);
        this.event(off, culprit, 'turnover', `${culprit.input.name} offensive foul`);
      } else if (this.rng.chance(clamp(0.48 + (defStealAvg - 60) * 0.006 + (dt.pressure - 50) * 0.002, 0.3, 0.7))) {
        const stealer = this.weighted(def.court, (p) => Math.pow(p.a.steals, 2.2) * (p.a.perimeterDefense / 60));
        stealer.stats.stl++;
        def.stats.stl++;
        live = true;
        this.event(def, stealer, 'steal', `${stealer.input.name} steals the ball from ${culprit.input.name}`);
      } else {
        this.event(off, culprit, 'turnover', `${culprit.input.name} turnover`);
      }
      this.tickTime(duration * 0.4 * 0.5);
      this.checkInjuries(off, def);
      return { transitionNext: live && this.rng.chance(this.fastBreakChance(def)), deadBall: !live };
    }

    // --- Non-shooting defensive foul -------------------------------------
    const pFoul = 0.09 + (dt.pressure - 50) * 0.0008 + (dt.defense === 'press' ? 0.02 : 0);
    if (!endOfPeriod && this.rng.chance(pFoul)) {
      const fouler = this.weighted(def.court, (p) => 110 - p.a.defensiveIQ);
      this.addFoul(def, fouler, true);
      if (def.teamFouls > this.rules.teamFoulBonus) {
        const fouled = this.pickShooter(off, def);
        this.event(def, fouler, 'foul', `Foul on ${fouler.input.name} (bonus)`);
        this.tickTime(duration * 0.4);
        const made = this.freeThrows(off, def, fouled, 2);
        this.checkInjuries(off, def);
        if (!made.lastMissed) return { transitionNext: false, deadBall: true };
        this.rebound(off, def, null);
        return { transitionNext: false, deadBall: false };
      }
      this.event(def, fouler, 'foul', `Foul on ${fouler.input.name}`);
    }

    // --- Shot sequence (with offensive rebounds) --------------------------
    let putback = false;
    let secondChance = false;
    let result: { transitionNext: boolean; deadBall: boolean } = { transitionNext: false, deadBall: true };
    for (let attempt = 0; attempt < 4; attempt++) {
      const outcome = this.shot(off, def, transition && attempt === 0, putback, secondChance, endOfPeriod);
      if (outcome !== 'miss') {
        result = { transitionNext: false, deadBall: true };
        break;
      }
      const reb = this.rebound(off, def, null);
      if (reb.defensive) {
        result = { transitionNext: this.rng.chance(this.fastBreakChance(def) * 0.7), deadBall: false };
        break;
      }
      if (this.clock <= 1) break;
      putback = this.rng.chance(0.45);
      secondChance = true;
      this.tickTime(this.rng.range(2, 6));
    }
    this.tickTime(duration * 0.4);
    this.checkInjuries(off, def);
    return result;
  }

  private fastBreakChance(t: TState): number {
    const speed = avg(t.court.map((p) => p.a.speed));
    return clamp(0.18 + (t.input.tactics.fastBreak - 50) * 0.005 + (speed - 60) * 0.004, 0.05, 0.5);
  }

  private pickHandler(t: TState): PState {
    return this.weighted(t.court, (p) => Math.pow(p.c.creation, 3) * (p.isGuard ? 1.6 : 1));
  }

  private pickShooter(off: TState, def: TState): PState {
    const tac = off.input.tactics;
    const exp = clamp(3 + (tac.isolation - 50) * 0.04 - (tac.ballMovement - 50) * 0.02 - (tac.motion - 50) * 0.015, 1.5, 5.5);
    const ability = (p: PState) =>
      Math.max(p.c.rimScoring, p.c.midScoring, p.c.threeScoring) * 0.6 + p.c.creation * 0.25 + p.a.offensiveIQ * 0.15;
    const weights = off.court.map((p) => Math.pow(ability(p) / 60, exp) * (0.6 + p.energy / 250));
    // Double teams take the ball out of the best scorer's hands.
    if (def.input.tactics.doubleTeams > 50) {
      let best = 0;
      for (let i = 1; i < weights.length; i++) if (weights[i] > weights[best]) best = i;
      weights[best] *= 1 - (def.input.tactics.doubleTeams - 50) * 0.008;
    }
    return this.rng.weighted(off.court, weights);
  }

  private pickShotType(shooter: PState, off: TState, def: TState, transition: boolean, putback: boolean): ShotType {
    if (putback) return 'rim';
    const mix = { ...SHOT_MIX[this.rules.family] };
    const o = off.input.tactics;
    const d = def.input.tactics;
    mix.three += (o.threePointFocus - 50) * 0.004 - (o.postUp - 50) * 0.002;
    mix.rim += (o.postUp - 50) * 0.003 + (o.pickAndRoll - 50) * 0.0015 - (o.threePointFocus - 50) * 0.002;
    mix.mid += (o.isolation - 50) * 0.002 + (o.pickAndRoll - 50) * 0.001;
    if (d.defense === 'zone') { mix.three += 0.05; mix.rim -= 0.05; }
    if (d.defense === 'drop') { mix.mid += 0.04; mix.rim -= 0.03; }
    if (d.defense === 'switch') { mix.mid += 0.02; mix.rim += 0.01; mix.three -= 0.02; }
    if (transition) mix.rim *= 1.8;
    const w = {
      rim: Math.max(0.02, mix.rim) * Math.pow(shooter.c.rimScoring / 60, 2) * (shooter.isBig ? 1.25 : 1),
      mid: Math.max(0.02, mix.mid) * Math.pow(shooter.c.midScoring / 60, 2),
      three: Math.max(0.01, mix.three) * Math.pow(shooter.c.threeScoring / 60, 3.2),
    };
    return this.rng.weighted(['rim', 'mid', 'three'] as ShotType[], [w.rim, w.mid, w.three]);
  }

  private matchedDefender(shooter: PState, def: TState, off: TState): PState {
    const idx = off.court.indexOf(shooter);
    return def.court[clamp(idx, 0, def.court.length - 1)];
  }

  private shot(
    off: TState, def: TState, transition: boolean, putback: boolean, secondChance: boolean, heave: boolean,
  ): 'made' | 'miss' | 'fouled' {
    const shooter = this.pickShooter(off, def);
    const type = this.pickShotType(shooter, off, def, transition, putback);
    const defender = this.matchedDefender(shooter, def, off);
    const rimProtector = def.court.reduce((b, p) => (p.c.interiorD > b.c.interiorD ? p : b), def.court[0]);
    const helpD = avg(def.court.map((p) => p.a.helpDefense));
    const dt = def.input.tactics;

    let p: number;
    if (type === 'rim') {
      const defRating = defender.c.interiorD * 0.45 + rimProtector.c.interiorD * 0.4 + helpD * 0.15;
      p = 0.575 + 0.0042 * (shooter.c.rimScoring - 60) - 0.003 * (defRating - 60);
      if (dt.defense === 'zone') p -= 0.02;
      if (dt.defense === 'drop') p -= 0.015;
      if (transition) p += 0.07;
      if (putback) p += 0.03;
    } else if (type === 'mid') {
      p = 0.395 + 0.0038 * (shooter.c.midScoring - 60) - 0.0022 * (defender.c.perimeterD - 60);
      if (dt.defense === 'drop') p += 0.02;
    } else {
      const contest = defender.c.perimeterD * 0.8 + helpD * 0.2;
      p = 0.338 + 0.0034 * (shooter.c.threeScoring - 60) - 0.0018 * (contest - 60);
      if (dt.defense === 'zone') p += 0.012;
      if (off.input.tactics.ballMovement > 60) p += (off.input.tactics.ballMovement - 60) * 0.0004;
    }
    // Situational modifiers.
    if (shooter.energy < 85) p -= (85 - shooter.energy) * 0.0022;
    if (off.isHome && this.opts.homeCourt) p += 0.011;
    p += (off.input.coachRating - 60) * 0.0005 - (def.input.defenseCoachRating - 60) * 0.0004;
    if (this.isClutchTime()) p += (off.input.gameManagement - def.input.gameManagement) * 0.0003;
    p += (off.input.chemistry - 60) * 0.0004;
    p += off.fit * 0.6 - def.fit * 0.25;
    p += shooter.form;
    p -= (dt.pressure - 50) * 0.0003;
    if (off.run >= 8) p += 0.01;
    if (this.isClutchTime()) p += (shooter.a.clutch - 60) * 0.0012;
    if (heave && this.clock < 3) p -= 0.15;
    p = clamp(p, 0.05, 0.85);

    // Shooting fouls.
    const foulBase = type === 'rim' ? 0.2 : type === 'mid' ? 0.05 : 0.017;
    const pFouled = clamp(foulBase * (1 + (dt.pressure - 50) * 0.006) * (1 + (60 - defender.a.defensiveIQ) * 0.008), 0.003, 0.3);
    const fouled = this.rng.chance(pFouled);
    const isThree = type === 'three';
    const points = isThree ? 3 : 2;

    if (fouled) {
      const fouler = type === 'rim' && this.rng.chance(0.4) ? rimProtector : defender;
      this.addFoul(def, fouler, true);
      const made = this.rng.chance(p * 0.42);
      if (made) {
        shooter.stats.fga++;
        off.stats.fga++;
        if (isThree) { shooter.stats.tpa++; off.stats.tpa++; }
        this.creditMake(off, def, shooter, type, points, transition, secondChance, putback);
        this.event(off, shooter, isThree ? 'made3' : 'made2', `${shooter.input.name} scores and draws the foul`);
        const ft = this.freeThrows(off, def, shooter, 1);
        return ft.lastMissed ? 'miss' : 'made';
      }
      this.event(def, fouler, 'foul', `Shooting foul on ${fouler.input.name}`);
      const ft = this.freeThrows(off, def, shooter, isThree ? 3 : 2);
      if (ft.lastMissed) return 'miss';
      return 'fouled';
    }

    shooter.stats.fga++;
    off.stats.fga++;
    if (isThree) { shooter.stats.tpa++; off.stats.tpa++; }

    if (this.rng.chance(p)) {
      this.creditMake(off, def, shooter, type, points, transition, secondChance, putback);
      this.event(off, shooter, isThree ? 'made3' : 'made2', `${shooter.input.name} makes a ${shotLabel(type)}`);
      return 'made';
    }
    // Block check (conditional on a miss).
    const blockBase = type === 'rim' ? 0.16 : type === 'mid' ? 0.05 : 0.015;
    const blocker = type === 'rim' && this.rng.chance(0.6) ? rimProtector : defender;
    if (this.rng.chance(clamp(blockBase * Math.pow(blocker.a.blocks / 60, 1.6), 0, 0.4))) {
      blocker.stats.blk++;
      def.stats.blk++;
      this.event(def, blocker, 'block', `${blocker.input.name} blocks ${shooter.input.name}`);
    } else {
      this.event(off, shooter, isThree ? 'miss3' : 'miss2', `${shooter.input.name} misses a ${shotLabel(type)}`);
    }
    return 'miss';
  }

  private creditMake(
    off: TState, def: TState, shooter: PState, type: ShotType, points: number, transition: boolean,
    secondChance: boolean, putback: boolean,
  ) {
    shooter.stats.fgm++;
    off.stats.fgm++;
    if (type === 'three') { shooter.stats.tpm++; off.stats.tpm++; }
    this.score(off, def, shooter, points);
    if (type === 'rim') off.stats.pointsInPaint += points;
    if (transition) off.stats.fastBreakPts += points;
    if (secondChance) off.stats.secondChancePts += points;
    // Assist.
    const o = off.input.tactics;
    const passAvg = avg(off.court.filter((p) => p !== shooter).map((p) => p.a.passing));
    const base = putback ? 0.05 : type === 'rim' ? 0.45 : type === 'mid' ? 0.4 : 0.76;
    const pAst = clamp(
      base + (o.ballMovement - 50) * 0.003 + (o.motion - 50) * 0.0015 - (o.isolation - 50) * 0.003 + (passAvg - 60) * 0.003 + (transition ? 0.05 : 0),
      0.02, 0.95,
    );
    if (this.rng.chance(pAst)) {
      const mates = off.court.filter((p) => p !== shooter);
      const assister = this.weighted(mates, (p) => Math.pow(p.a.passing, 2.5) * (p.isGuard ? 1.3 : 1));
      assister.stats.ast++;
      off.stats.ast++;
    }
  }

  private freeThrows(off: TState, def: TState, shooter: PState, count: number): { lastMissed: boolean } {
    let lastMissed = false;
    const pct = clamp(0.38 + shooter.a.freeThrow * 0.0058 + (this.isClutchTime() ? (shooter.a.clutch - 60) * 0.001 : 0), 0.35, 0.95);
    for (let i = 0; i < count; i++) {
      shooter.stats.fta++;
      off.stats.fta++;
      if (this.rng.chance(pct)) {
        shooter.stats.ftm++;
        off.stats.ftm++;
        this.score(off, def, shooter, 1);
        lastMissed = false;
        this.event(off, shooter, 'ftMade', `${shooter.input.name} makes free throw ${i + 1} of ${count}`);
      } else {
        lastMissed = true;
        this.event(off, shooter, 'ftMiss', `${shooter.input.name} misses free throw ${i + 1} of ${count}`);
      }
    }
    return { lastMissed };
  }

  private rebound(off: TState, def: TState, _hint: null): { defensive: boolean } {
    const top2 = (vals: number[]) => {
      const s = [...vals].sort((a, b) => b - a);
      return (s[0] + (s[1] ?? s[0])) / 2;
    };
    const offReb = top2(off.court.map((p) => p.a.offensiveRebounding * 0.6 + p.c.rebounding * 0.4));
    const defReb = top2(def.court.map((p) => p.a.defensiveRebounding * 0.6 + p.c.rebounding * 0.4));
    const pOreb = clamp(0.255 + (offReb - defReb) * 0.004 - (off.input.tactics.fastBreak - 50) * 0.0015, 0.12, 0.4);
    if (this.rng.chance(pOreb)) {
      const r = this.weighted(off.court, (p) => Math.pow(p.a.offensiveRebounding, 2.2) * (p.isBig ? 1.6 : 1));
      r.stats.oreb++;
      off.stats.oreb++;
      this.event(off, r, 'oreb', `Offensive rebound ${r.input.name}`);
      return { defensive: false };
    }
    const r = this.weighted(def.court, (p) => Math.pow(p.a.defensiveRebounding, 2.2) * (p.isBig ? 1.6 : 1));
    r.stats.dreb++;
    def.stats.dreb++;
    this.event(def, r, 'dreb', `Defensive rebound ${r.input.name}`);
    return { defensive: true };
  }

  private score(off: TState, def: TState, _scorer: PState, points: number) {
    off.score += points;
    off.stats.pts += points;
    _scorer.stats.pts += points;
    for (const p of off.court) p.stats.plusMinus += points;
    for (const p of def.court) p.stats.plusMinus -= points;
    off.run = off.run > 0 ? off.run + points : points;
    def.run = 0;
  }

  private addFoul(team: TState, player: PState, countsAsTeamFoul: boolean) {
    player.fouls++;
    player.stats.pf++;
    team.stats.pf++;
    if (countsAsTeamFoul) team.teamFouls++;
    if (player.fouls >= this.rules.personalFoulLimit) {
      player.fouledOut = true;
      this.event(team, player, 'foul', `${player.input.name} fouls out`);
      this.substitutions(team, true);
    }
  }

  private isClutchTime(): boolean {
    return this.period >= this.rules.periods && this.clock <= 120 && Math.abs(this.home.score - this.away.score) <= 5;
  }

  // -------------------------------------------------------------------------
  // Time, fatigue, injuries
  // -------------------------------------------------------------------------

  private tickTime(seconds: number) {
    const s = Math.min(seconds, this.clock);
    if (s <= 0) return;
    this.clock -= s;
    this.elapsed += s;
    const possessionsEquivalent = s / 14;
    for (const t of [this.home, this.away]) {
      const press = t.input.tactics.defense === 'press' ? 1.15 : 1;
      const pace = 1 + (t.input.tactics.pace - 50) * 0.003;
      for (const p of t.players) {
        if (p.onCourt) {
          p.seconds += s;
          p.stats.seconds += s;
          const drop = 0.78 * (1.3 - (p.a.stamina / 100) * 0.65) * press * pace;
          p.energy = Math.max(0, p.energy - drop * possessionsEquivalent);
        } else {
          p.energy = Math.min(100, p.energy + 1.3 * possessionsEquivalent);
        }
      }
    }
  }

  private checkInjuries(off: TState, def: TState) {
    const rate = this.opts.injuryRate ?? 1;
    if (rate <= 0) return;
    for (const t of [off, def]) {
      for (const p of t.court) {
        const risk = 0.00008 * rate * (1 + (60 - p.a.strength) * 0.01) * (1 + (100 - p.energy) * 0.012);
        if (this.rng.chance(risk)) {
          p.injured = true;
          const r = this.rng.next();
          const days = r < 0.68 ? this.rng.int(1, 7) : r < 0.94 ? this.rng.int(8, 30) : this.rng.int(31, 150);
          const type = days <= 7 ? this.rng.pick(['Ankle sprain', 'Bruised knee', 'Back spasms', 'Sore hamstring'])
            : days <= 30 ? this.rng.pick(['Hamstring strain', 'Sprained wrist', 'Calf strain', 'Groin strain'])
            : this.rng.pick(['Torn meniscus', 'Broken hand', 'Achilles tendinopathy', 'Stress fracture']);
          this.injuries.push({ playerId: p.input.id, clubId: t.input.clubId, days, type });
          this.event(t, p, 'injury', `${p.input.name} leaves the game injured (${type})`);
          this.substitutions(t, true);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Substitutions and rotation management
  // -------------------------------------------------------------------------

  private desire(_t: TState, p: PState): number {
    if (p.fouledOut || p.injured) return -1000;
    const margin = Math.abs(this.home.score - this.away.score);
    const late = this.period >= this.rules.periods && this.clock <= 300;
    const expected = p.targetSec * Math.min(1, (this.elapsed + 150) / this.regSeconds);
    let d = (expected - p.seconds) / 120;
    d += (p.energy - 80) / 9;
    if (p.onCourt) d += 0.9;
    if (p.targetSec <= 0) d -= 6;
    const limit = this.rules.personalFoulLimit;
    if (!late && p.fouls >= limit - 1) d -= 3;
    else if (this.period <= this.rules.periods / 2 && p.fouls >= limit - 2) d -= 2;
    if (late && margin <= 8) d += (p.input.overall - 60) / 5 + (p.targetSec > 20 * 60 ? 1.5 : 0);
    if (this.period >= this.rules.periods && this.clock <= 360 && margin >= 20) d -= p.targetSec > 24 * 60 ? 4 : -1;
    if (this.period > this.rules.periods) d += (p.input.overall - 60) / 4;
    return d;
  }

  private pickLineup(t: TState, initial: boolean): PState[] {
    const scored = t.players
      .map((p) => ({ p, s: initial ? p.targetSec / 60 + p.input.overall / 10 - (p.injured || p.fouledOut ? 1000 : 0) : this.desire(t, p) }))
      .sort((a, b) => b.s - a.s);
    const pickable = scored.filter((x) => x.s > -900).map((x) => x.p);
    const pool = pickable.length >= 5 ? pickable : [...pickable, ...scored.map((x) => x.p).filter((p) => !pickable.includes(p))];
    const lineup = pool.slice(0, 5);
    const ensure = (pred: (p: PState) => boolean) => {
      if (lineup.some(pred)) return;
      const cand = pool.slice(5).find(pred);
      if (!cand) return;
      // Replace the lowest-ranked player that is not the only member of the other required group.
      for (let i = lineup.length - 1; i >= 0; i--) {
        const without = lineup.filter((_, j) => j !== i);
        if ((pred === isGuardFn || without.some((p) => p.isBig)) && (pred === isBigFn || without.some((p) => p.isGuard))) {
          lineup[i] = cand;
          return;
        }
      }
      lineup[lineup.length - 1] = cand;
    };
    ensure(isGuardFn);
    ensure(isBigFn);
    return lineup;
  }

  private substitutions(t: TState, force: boolean) {
    if (!force && this.elapsed - t.lastSubCheck < 75) return;
    t.lastSubCheck = this.elapsed;
    const next = this.pickLineup(t, false);
    const outgoing = t.court.filter((p) => !next.includes(p));
    if (outgoing.length === 0) return;
    for (const p of outgoing) p.onCourt = false;
    for (const p of next) {
      if (!p.onCourt) {
        p.onCourt = true;
        this.event(t, p, 'sub', `${p.input.name} checks in`);
      }
    }
    t.court = this.sortCourt(next);
  }

  private sortCourt(players: PState[]): PState[] {
    return [...players].sort((a, b) => POS_ORDER[a.input.position] - POS_ORDER[b.input.position]);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private weighted(players: PState[], w: (p: PState) => number): PState {
    return this.rng.weighted(players, players.map(w));
  }

  private event(t: TState, p: PState | null, type: MatchEvent['type'], text: string) {
    if (!this.opts.recordEvents) return;
    this.events.push({
      period: this.period,
      clock: Math.round(this.clock),
      clubId: t.input.clubId,
      playerId: p?.input.id ?? null,
      type,
      text,
      homeScore: this.home.score,
      awayScore: this.away.score,
    });
  }

  private result(): SimResult {
    const playerStats = [...this.home.players, ...this.away.players]
      .filter((p) => p.stats.seconds > 0 || p.stats.starter)
      .map((p) => ({ ...p.stats, seconds: Math.round(p.stats.seconds) }));
    return {
      homeScore: this.home.score,
      awayScore: this.away.score,
      homeQuarters: this.home.quarters,
      awayQuarters: this.away.quarters,
      overtimes: Math.max(0, this.period - this.rules.periods),
      homeStats: this.home.stats,
      awayStats: this.away.stats,
      playerStats,
      events: this.events,
      injuries: this.injuries,
    };
  }
}

const isGuardFn = (p: PState) => p.isGuard;
const isBigFn = (p: PState) => p.isBig;

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

function shotLabel(t: ShotType): string {
  return t === 'rim' ? 'shot at the rim' : t === 'mid' ? 'mid-range jumper' : 'three-pointer';
}
