# Game Rules & Formulas

## Competitions
| Competition | Rules family | Format (game) | Notes |
|---|---|---|---|
| NBA | NBA: 4×12, OT 5, foul-out 6 | 30 clubs, 3 round robins (87 games), 16-team playoffs best-of-7 | No play-in (simplification). Closed league. |
| EuroLeague | FIBA: 4×10, foul-out 5 | 20 clubs, double round robin (38), top-8 best-of-5 + Final Four | Thu/Tue rhythm; no play-in |
| EuroCup | FIBA | 1 round robin, 8-team playoffs | Populated by qualification from 2027-28 |
| Basketball Champions League | FIBA | 1 round robin + Final Four; 4 places via qualifying round | Populated from 2027-28 |
| ACB, BSL, GBL, IBPL, LBA, LNB, BBL | FIBA domestic (foreign limit 6) | double round robin on Sundays, 8-team playoffs (3/5/5) | Partial club lists except ACB |

Salary caps, budgets, TV money, arena sizes are **in-game values**, not real figures.

## Qualification, promotion & relegation
Regulations are versioned per season (`CompetitionRegulation`) and editable in **Competition Rules** without code changes. The 2026-27 memberships come from the real-world dataset; simulated seasons use the regulations below, which are **game regulations** unless marked `real_world`:
- **NBA** closed (real-world structure).
- **EuroLeague** (20): Fenerbahçe 10-year licence (reported), other 2026-27 members treated as licence holders through 2030 (**game assumption** — licence terms not verified), EuroCup champion and runner-up, wildcards by reputation. One-year wildcards (Paris, Beşiktaş) and Hapoel's temporary licence are not extended.
- **EuroCup** (20, scaled from the real 32): clubs dropping out of the EuroLeague, domestic league positions (ACB 3, BSL 3, others 2) with cascade, wildcards.
- **BCL** (16): 12 direct places by domestic position + wildcards; 4 places via a one-game knockout qualifying round in pre-season (byes if under-subscribed).
- **Domestic leagues**: bottom two relegated **when a second division exists in the database**; none does yet, so relegation is reported as suspended.

Allocation order: closed/open leagues (with promotion/relegation) → qualification competitions by priority. Exclusive competitions: a club enters at most one. Regional eligibility: European competitions only admit clubs whose home league is European. Places by position cascade to the next eligible club. Season transition: results → entries confirmed at season end → applied on 1 July (reputation +2 EuroLeague / +1 other European, +3 promotion, −5 relegation) → qualifying rounds 14 days before start → registration deadline 2 days before start publishes schedules.

## Player ratings
Overall = 0.9 × position-weighted attributes + 0.1 × mental average (weights in `player-system/src/ratings.ts`).

**Real players** (`player-system/src/fromStats.ts`): per-36 production and shooting percentages of the most recent real season map to the 1–100 scale; low-volume percentages are regressed to the mean; competition strength (`LEAGUE_STRENGTH`, NBA +8 … NCAA −6) and playing-time trust shift the scale; physical attributes come from height/position; leadership/work ethic/chemistry stay neutral (no data). Real players without statistics get a league baseline and are flagged `league_baseline`.

**Development**: monthly ticks; growth = (potential − overall) × age factor × work ethic × development coaching × training quality × minutes; physical decline from 29, skill decline from 32; season-end breakouts/stalls; retirement probability by age and level.

## Match engine
Possession-based. Each possession: duration (pace, press, shot clock) → turnover check (ball security vs pressure/steals, tactical fit) → non-shooting fouls (bonus FTs) → shot selection (usage by ability, team shot mix shaped by tactics and defensive scheme) → make probability (shooter skill vs matched defender and rim protection, fatigue, home court, coaching, chemistry, tactical fit, form, clutch, momentum) → fouls/and-ones/blocks → rebounds (offensive rebound chance from both teams' rebounding) → assists. Substitutions balance target minutes, energy, foul trouble, garbage time and closing lineups. Calibrated (300-game samples, tested): NBA ≈ 100 possessions, 117 ppg, 47% FG, 37% 3P, 79% FT; FIBA ≈ 75 possessions, 84 ppg.

## Coaching staff
Roles: head coach (the user at their club), assistant ×2, offensive/defensive coordinator, player development, shooting coach. Effects feed the engine (offense/defense coaching, game management, chemistry), development (development coach, shooting coach, training quality) and scouting accuracy. Willingness to join is the sum of named factors (salary vs expectation, role fit and seniority, club vs coach reputation, head-coach reputation, ambitions vs contender status, career opportunity, relationships from shared history, contract length, current employment, morale, competing offers). Responses: accept, counter salary, request role, demand years, reject, or sign elsewhere.

## Finances & transfers
Monthly wages, staff wages, operations, sponsorship and broadcast revenue from every competition entered; gate receipts per home game (attendance from reputation, opponent, price). Signings are validated against roster limits, foreign-player limits, salary cap (NBA soft cap with minimum exception), wage budget and cash; emergency minimum deals are allowed below the roster minimum. Releases cost the remaining contract (×60% in FIBA leagues, capped at buyout).
