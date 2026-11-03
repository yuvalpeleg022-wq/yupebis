import { useState } from 'react';
import { DEFENSE_ATTRIBUTES, MENTAL_ATTRIBUTES, OFFENSE_ATTRIBUTES, PHYSICAL_ATTRIBUTES, type AttributeKey, type Player } from '@gbm/shared-types';
import { playerOverall, scoutPotential, marketValue } from '@gbm/player-system';
import { contractForPlayer } from '@gbm/finance-system';
import { clubRules, negotiate, playerAsk, releaseCost, releasePlayer, rosterOf, signContract, validateRelease, validateSigning } from '@gbm/transfer-system';
import { staffEffects } from '@gbm/staff-system';
import { useGame, useWorld } from '../store';
import { Badge, Button, Card, Empty, Field, OvrPill, RatingBar, Stat, TableWrap, inputCls, td, th } from '../components/ui';
import { NoClub, PageTitle, PlayerLink, PlayerSourceBadge, age, money, sortAge, pname } from './common';

const LABELS: Record<AttributeKey, string> = {
  insideScoring: 'Inside Scoring', layups: 'Layups', dunking: 'Dunking', midRange: 'Mid-Range', threePoint: 'Three-Point', freeThrow: 'Free Throws',
  ballHandling: 'Ball Handling', passing: 'Passing', offensiveIQ: 'Offensive IQ', offBallMovement: 'Off-Ball Movement', offensiveRebounding: 'Off. Rebounding',
  perimeterDefense: 'Perimeter D', interiorDefense: 'Interior D', steals: 'Steals', blocks: 'Blocks', defensiveIQ: 'Defensive IQ',
  defensiveRebounding: 'Def. Rebounding', helpDefense: 'Help Defense', speed: 'Speed', acceleration: 'Acceleration', strength: 'Strength',
  vertical: 'Vertical', stamina: 'Stamina', agility: 'Agility', leadership: 'Leadership', consistency: 'Consistency', clutch: 'Clutch',
  workEthic: 'Work Ethic', basketballIQ: 'Basketball IQ', teamChemistry: 'Team Chemistry',
};

export function Squad() {
  const world = useWorld();
  const clubId = world.meta.userClubId;
  const [sort, setSort] = useState<'ovr' | 'pos' | 'age' | 'salary'>('ovr');
  if (!world.clubs[clubId]) return <NoClub />;
  const { rules } = clubRules(world, clubId);
  const roster = rosterOf(world, clubId).sort((a, b) =>
    sort === 'ovr' ? playerOverall(b) - playerOverall(a) : sort === 'age' ? sortAge(world, a) - sortAge(world, b) : sort === 'salary' ? (contractForPlayer(world, b.id)?.salary ?? 0) - (contractForPlayer(world, a.id)?.salary ?? 0) : a.position.localeCompare(b.position),
  );
  const scout = staffEffects(world, clubId).scouting;
  return (
    <div>
      <PageTitle title="Squad" sub={`${roster.length} players (league allows ${rules.rosterMin}–${rules.rosterMax}) · all players are fictional generated players`}
        actions={<select className={inputCls + ' w-auto'} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort"><option value="ovr">Overall</option><option value="pos">Position</option><option value="age">Age</option><option value="salary">Salary</option></select>} />
      {/* Mobile: compact cards */}
      <div className="grid gap-2 md:hidden">
        {roster.map((p) => <PlayerCard key={p.id} p={p} scout={scout} />)}
      </div>
      {/* Desktop/tablet: wide table */}
      <div className="hidden md:block">
        <Card>
          <TableWrap>
            <thead><tr>{['#', 'Name', 'Pos', 'Age', 'OVR', 'POT (est.)', 'Ht', 'Morale', 'Fatigue', 'Salary', 'Until', 'Status'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {roster.map((p) => {
                const c = contractForPlayer(world, p.id);
                const pot = scoutPotential(p, clubId, scout, true);
                const inj = p.injuryId ? world.injuries[p.injuryId] : null;
                return (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <td className={td}>{p.jersey ?? '—'}</td>
                    <td className={td}><PlayerLink p={p} /></td>
                    <td className={td}>{p.position}{p.secondaryPosition ? `/${p.secondaryPosition}` : ''}</td>
                    <td className={td}>{age(world, p)}</td>
                    <td className={td}><OvrPill value={playerOverall(p)} /></td>
                    <td className={td}>{pot.low}–{pot.high}</td>
                    <td className={td}>{p.heightCm ? `${p.heightCm}cm` : '—'}</td>
                    <td className={td}>{Math.round(p.morale)}</td>
                    <td className={td}>{Math.round(p.fatigue)}</td>
                    <td className={td}>{c ? money(world, c.salary, clubId) : '—'}</td>
                    <td className={td}>{c?.endSeason ?? '—'}</td>
                    <td className={td}>{inj && inj.daysRemaining > 0 ? <Badge tone="bad">{inj.daysRemaining}d</Badge> : <Badge tone="good">Fit</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </Card>
      </div>
    </div>
  );
}

function PlayerCard({ p, scout }: { p: Player; scout: number }) {
  const world = useWorld();
  const go = useGame((s) => s.go);
  const c = contractForPlayer(world, p.id);
  const pot = scoutPotential(p, world.meta.userClubId, scout, true);
  const inj = p.injuryId ? world.injuries[p.injuryId] : null;
  return (
    <button onClick={() => go({ screen: 'player', id: p.id })} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left" data-testid="player-card">
      <OvrPill value={playerOverall(p)} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{pname(p)}</div>
        <div className="text-xs text-muted">{p.position} · {age(world, p)}y · POT {pot.low}–{pot.high} · {c ? money(world, c.salary, p.clubId!) : 'no contract'}</div>
      </div>
      {inj && inj.daysRemaining > 0 && <Badge tone="bad">Inj</Badge>}
    </button>
  );
}

export function PlayerProfile({ id }: { id: string }) {
  const world = useWorld();
  const back = useGame((s) => s.back);
  const p = world.players[id];
  if (!p) return <Empty>Player not found.</Empty>;
  const own = p.clubId === world.meta.userClubId;
  const userClub = world.clubs[world.meta.userClubId];
  const scout = userClub ? staffEffects(world, userClub.id).scouting : 40;
  const pot = scoutPotential(p, world.meta.userClubId || 'none', scout, own);
  const c = contractForPlayer(world, p.id);
  const league = p.clubId ? world.leagues[world.clubs[p.clubId].leagueId] : userClub ? world.leagues[userClub.leagueId] : Object.values(world.leagues)[0];
  const seasons = world.playerSeasons.filter((s) => s.playerId === p.id).sort((a, b) => b.season - a.season);
  const currentStats = currentSeasonStats(world, p.id);
  const injuries = Object.values(world.injuries).filter((i) => i.playerId === p.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const transfers = world.transfers.filter((t) => t.playerId === p.id);
  const groups: [string, readonly AttributeKey[]][] = [['Offense', OFFENSE_ATTRIBUTES], ['Defense', DEFENSE_ATTRIBUTES], ['Physical', PHYSICAL_ATTRIBUTES], ['Mental', MENTAL_ATTRIBUTES]];
  const canRenew = own && c && c.endSeason <= world.meta.season + 1;
  return (
    <div>
      <PageTitle title={pname(p)} sub={<span className="inline-flex flex-wrap items-center gap-2">{p.position}{p.secondaryPosition ? `/${p.secondaryPosition}` : ''}{p.unverifiedFields?.includes('position_slot') ? ' (slot unverified)' : ''} · {age(world, p)} years · {p.heightCm ? `${p.heightCm} cm` : 'height unknown'} · {p.weightKg ? `${p.weightKg} kg` : 'weight unknown'} · {p.nationality || 'nationality unknown'} <PlayerSourceBadge p={p} /></span>}
        actions={<Button variant="ghost" onClick={() => back()}>← Back</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Overall" value={playerOverall(p)} />
        <Stat label="Potential" value={`${pot.low}–${pot.high}`} sub={own ? 'staff estimate' : 'scout estimate'} />
        <Stat label="Club" value={p.clubId ? world.clubs[p.clubId].shortName : p.retired ? 'Retired' : 'Free agent'} />
        <Stat label="Contract" value={c ? money(world, c.salary, c.clubId) : '—'} sub={c ? (p.unverifiedFields?.includes('contract') ? `game estimate · not verified` : `until ${c.endSeason}`) : ''} />
        <Stat label="Market value" value={money(world, marketValue(playerOverall(p), sortAge(world, p), p.potential, league.salaryScale), p.clubId ?? undefined)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Attributes">
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map(([g, keys]) => (
              <div key={g}>
                <div className="mb-1 text-xs font-semibold uppercase text-muted">{g}</div>
                {keys.map((k) => <div key={k} className="flex items-center justify-between gap-2 py-0.5 text-sm"><span className="truncate">{LABELS[k]}</span><RatingBar value={p.attributes[k]} /></div>)}
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Form & condition">
            <div className="grid grid-cols-3 gap-2"><Stat label="Morale" value={Math.round(p.morale)} /><Stat label="Fatigue" value={Math.round(p.fatigue)} /><Stat label="Loyalty" value={p.loyalty} /></div>
            {currentStats && <p className="mt-2 text-sm">This season: {currentStats.gp} GP · {(currentStats.pts / currentStats.gp).toFixed(1)} PTS · {((currentStats.oreb + currentStats.dreb) / currentStats.gp).toFixed(1)} REB · {(currentStats.ast / currentStats.gp).toFixed(1)} AST · {(currentStats.seconds / 60 / currentStats.gp).toFixed(1)} MIN</p>}
          </Card>
          {canRenew && <Negotiation playerId={p.id} kind="renewal" />}
          {own && <ReleaseCard player={p} />}
          {!p.clubId && !p.retired && userClub && <Negotiation playerId={p.id} kind="free_agent" />}
        </div>
        <Card title="Career statistics">
          {seasons.length === 0 ? <Empty>No completed seasons in this career yet.</Empty> : (
            <TableWrap>
              <thead><tr>{['Season', 'Club', 'Stage', 'GP', 'MIN', 'PTS', 'REB', 'AST', 'FG%', '3P%'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{seasons.map((s) => <tr key={`${s.season}${s.stage}${s.clubId}`}><td className={td}>{s.season}</td><td className={td}>{world.clubs[s.clubId]?.shortName}</td><td className={td}>{s.stage}</td><td className={td}>{s.gp}</td><td className={td}>{(s.seconds / 60 / s.gp).toFixed(1)}</td><td className={td}>{(s.pts / s.gp).toFixed(1)}</td><td className={td}>{((s.oreb + s.dreb) / s.gp).toFixed(1)}</td><td className={td}>{(s.ast / s.gp).toFixed(1)}</td><td className={td}>{s.fga ? ((s.fgm / s.fga) * 100).toFixed(1) : '—'}</td><td className={td}>{s.tpa ? ((s.tpm / s.tpa) * 100).toFixed(1) : '—'}</td></tr>)}</tbody>
            </TableWrap>
          )}
        </Card>
        <Card title="History">
          <div className="text-xs font-semibold uppercase text-muted">Transactions</div>
          {transfers.length === 0 ? <p className="text-sm text-muted">None in this career.</p> : <ul className="text-sm">{transfers.map((t) => <li key={t.id}>{t.date}: {t.type.replace('_', ' ')} {t.toClubId ? `→ ${world.clubs[t.toClubId]?.shortName}` : ''}</li>)}</ul>}
          <div className="mt-3 text-xs font-semibold uppercase text-muted">Injury history</div>
          {injuries.length === 0 ? <p className="text-sm text-muted">No injuries.</p> : <ul className="text-sm">{injuries.map((i) => <li key={i.id}>{i.startDate}: {i.type} ({i.daysOut} days)</li>)}</ul>}
        </Card>
      </div>
    </div>
  );
}

function currentSeasonStats(world: ReturnType<typeof useWorld>, playerId: string) {
  let s: { gp: number; pts: number; oreb: number; dreb: number; ast: number; seconds: number } | null = null;
  for (const g of world.playerGameStats) {
    if (g.playerId !== playerId || world.matches[g.matchId]?.season !== world.meta.season) continue;
    s ??= { gp: 0, pts: 0, oreb: 0, dreb: 0, ast: 0, seconds: 0 };
    s.gp++; s.pts += g.pts; s.oreb += g.oreb; s.dreb += g.dreb; s.ast += g.ast; s.seconds += g.seconds;
  }
  return s;
}

export function Negotiation({ playerId, kind }: { playerId: string; kind: 'free_agent' | 'renewal' }) {
  const world = useWorld();
  const act = useGame((s) => s.act);
  const toast = useGame((s) => s.toast);
  const clubId = world.meta.userClubId;
  const p = world.players[playerId];
  const ask = playerAsk(world, p, world.clubs[clubId], kind);
  const [salary, setSalary] = useState(ask);
  const [years, setYears] = useState(2);
  const neg = world.negotiations[`${kind}:${clubId}:${playerId}`];
  const v = validateSigning(world, clubId, playerId, { salary, years }, kind);
  return (
    <Card title={kind === 'renewal' ? 'Contract extension' : 'Offer a contract'}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Salary per year"><input className={inputCls} type="number" step={10000} value={salary} onChange={(e) => setSalary(Number(e.target.value))} data-testid="offer-salary" /></Field>
        <Field label="Years"><select className={inputCls} value={years} onChange={(e) => setYears(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((y) => <option key={y}>{y}</option>)}</select></Field>
      </div>
      <p className="mt-2 text-xs text-muted">Agent's indication: around {money(world, ask, clubId)} per year.</p>
      {v.errors.map((e) => <p key={e} className="mt-1 text-xs text-bad">{e}</p>)}
      {v.warnings.map((e) => <p key={e} className="mt-1 text-xs text-warn">{e}</p>)}
      {neg?.message && <p className="mt-2 rounded bg-surface-2 p-2 text-sm">{neg.message}</p>}
      <Button className="mt-3" variant="primary" disabled={!v.ok} data-testid="submit-offer" onClick={() => act((w) => {
        const r = negotiate(w, clubId, playerId, { salary, years }, kind);
        if (r.accepted) {
          signContract(w, clubId, playerId, { salary, years }, kind);
          toast(`${pname(p)} signed: ${money(w, salary, clubId)} × ${years}y`, 'good');
        } else {
          if (r.counterSalary) setSalary(r.counterSalary);
          if (r.counterYears) setYears(r.counterYears);
          toast(r.message, 'info');
        }
      })}>Submit offer</Button>
    </Card>
  );
}

function ReleaseCard({ player }: { player: Player }) {
  const world = useWorld();
  const act = useGame((s) => s.act);
  const [confirm, setConfirm] = useState(false);
  const clubId = world.meta.userClubId;
  const v = validateRelease(world, clubId, player.id);
  const cost = releaseCost(world, player.id);
  return (
    <Card title="Release player">
      <p className="text-sm">Release cost (remaining contract owed): <strong>{money(world, cost, clubId)}</strong></p>
      {v.errors.map((e) => <p key={e} className="text-xs text-bad">{e}</p>)}
      {v.warnings.map((e) => <p key={e} className="text-xs text-warn">{e}</p>)}
      {!confirm ? <Button className="mt-2" variant="danger" disabled={!v.ok} onClick={() => setConfirm(true)}>Release…</Button> : (
        <div className="mt-2 flex gap-2"><Button variant="danger" onClick={() => act((w) => releasePlayer(w, clubId, player.id), `${pname(player)} released`)}>Confirm release</Button><Button onClick={() => setConfirm(false)}>Cancel</Button></div>
      )}
    </Card>
  );
}
