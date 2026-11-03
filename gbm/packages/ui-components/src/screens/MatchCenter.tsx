import { useState } from 'react';
import type { PlayerGameStats, TeamGameStats } from '@gbm/shared-types';
import { recentUserMatches } from '@gbm/game-engine';
import { useGame, useWorld } from '../store';
import { Button, Card, Empty, TableWrap, inputCls, td, th } from '../components/ui';
import { PageTitle } from './common';

export function MatchCenter({ id }: { id?: string }) {
  const world = useWorld();
  const go = useGame((s) => s.go);
  const recent = recentUserMatches(world, 30);
  const leagueMatches = Object.values(world.matches).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 40);
  const match = id ? world.matches[id] : recent[0] ?? leagueMatches[0];
  const [tab, setTab] = useState<'box' | 'pbp'>('box');
  if (!match) return <div><PageTitle title="Match Center" /><Empty>No games have been played yet.</Empty></div>;
  const home = world.clubs[match.homeId];
  const away = world.clubs[match.awayId];
  const stats = world.playerGameStats.filter((s) => s.matchId === match.id);
  const periods = match.homeQuarters.length;
  const rules = world.rules[world.leagues[match.leagueId].rulesId];
  return (
    <div>
      <PageTitle title="Match Center" sub={`${match.date} · ${world.leagues[match.leagueId].name} · attendance ${match.attendance.toLocaleString('en-US')}`}
        actions={<select className={inputCls + ' w-auto max-w-full'} value={match.id} onChange={(e) => go({ screen: 'match', id: e.target.value })} aria-label="Choose game">
          {[...new Map([...recent, ...leagueMatches].map((m) => [m.id, m])).values()].map((m) => <option key={m.id} value={m.id}>{m.date} {world.clubs[m.homeId].shortName} {m.homeScore}-{m.awayScore} {world.clubs[m.awayId].shortName}</option>)}
        </select>} />
      <Card>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <div className="min-w-0"><div className="truncate text-sm text-muted">Home</div><div className="truncate text-lg font-bold">{home.name}</div></div>
          <div className="tabular text-3xl font-black">{match.homeScore}–{match.awayScore}</div>
          <div className="min-w-0"><div className="truncate text-sm text-muted">Away</div><div className="truncate text-lg font-bold">{away.name}</div></div>
        </div>
        <TableWrap>
          <thead><tr><th className={th}>Team</th>{Array.from({ length: periods }, (_, i) => <th key={i} className={th}>{i < rules.periods ? (rules.periods === 2 ? `H${i + 1}` : `Q${i + 1}`) : `OT${i - rules.periods + 1}`}</th>)}<th className={th}>T</th></tr></thead>
          <tbody>
            {[{ c: home, q: match.homeQuarters, s: match.homeScore }, { c: away, q: match.awayQuarters, s: match.awayScore }].map((r) => <tr key={r.c.id}><td className={td}>{r.c.shortName}</td>{r.q.map((v, i) => <td key={i} className={td}>{v}</td>)}<td className={td + ' font-bold'}>{r.s}</td></tr>)}
          </tbody>
        </TableWrap>
      </Card>
      <div className="my-3 flex gap-2"><Button variant={tab === 'box' ? 'primary' : 'secondary'} onClick={() => setTab('box')}>Box score</Button><Button variant={tab === 'pbp' ? 'primary' : 'secondary'} onClick={() => setTab('pbp')} disabled={!match.events}>Play-by-play</Button></div>
      {tab === 'box' ? (
        <div className="grid gap-4">
          {[{ c: home, t: match.homeStats }, { c: away, t: match.awayStats }].map(({ c, t }) => <BoxScore key={c.id} name={c.name} team={t} players={stats.filter((s) => s.clubId === c.id)} />)}
        </div>
      ) : (
        <Card title="Play-by-play">
          {!match.events ? <Empty>Play-by-play is stored for your club's games only.</Empty> : (
            <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto text-sm">
              {match.events.filter((e) => e.type !== 'sub').map((e, i) => <li key={i} className="flex gap-2"><span className="tabular w-16 shrink-0 text-xs text-muted">P{e.period} {Math.floor(e.clock / 60)}:{String(e.clock % 60).padStart(2, '0')}</span><span className="flex-1">{e.text}</span><span className="tabular text-xs text-muted">{e.homeScore}-{e.awayScore}</span></li>)}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

const pct = (m: number, a: number) => (a ? `${((m / a) * 100).toFixed(0)}%` : '—');

function BoxScore({ name, team, players }: { name: string; team: TeamGameStats; players: PlayerGameStats[] }) {
  const world = useWorld();
  const go = useGame((s) => s.go);
  const sorted = [...players].sort((a, b) => Number(b.starter) - Number(a.starter) || b.seconds - a.seconds);
  return (
    <Card title={name}>
      <TableWrap>
        <thead><tr>{['Player', 'MIN', 'PTS', 'FG', '3P', 'FT', 'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', '+/-'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {sorted.map((s) => {
            const p = world.players[s.playerId];
            return (
              <tr key={s.playerId}>
                <td className={td}><button className="text-left hover:text-accent" onClick={() => go({ screen: 'player', id: s.playerId })}>{p ? `${p.firstName[0]}. ${p.lastName}` : s.playerId}</button>{s.starter && <span className="ml-1 text-[10px] text-muted">S</span>}</td>
                <td className={td}>{Math.floor(s.seconds / 60)}:{String(s.seconds % 60).padStart(2, '0')}</td><td className={td + ' font-semibold'}>{s.pts}</td>
                <td className={td}>{s.fgm}-{s.fga}</td><td className={td}>{s.tpm}-{s.tpa}</td><td className={td}>{s.ftm}-{s.fta}</td><td className={td}>{s.oreb}</td><td className={td}>{s.dreb}</td><td className={td}>{s.oreb + s.dreb}</td>
                <td className={td}>{s.ast}</td><td className={td}>{s.stl}</td><td className={td}>{s.blk}</td><td className={td}>{s.tov}</td><td className={td}>{s.pf}</td><td className={td}>{s.plusMinus > 0 ? `+${s.plusMinus}` : s.plusMinus}</td>
              </tr>
            );
          })}
          <tr className="font-semibold"><td className={td}>Team</td><td className={td}></td><td className={td}>{team.pts}</td><td className={td}>{team.fgm}-{team.fga} ({pct(team.fgm, team.fga)})</td><td className={td}>{team.tpm}-{team.tpa} ({pct(team.tpm, team.tpa)})</td><td className={td}>{team.ftm}-{team.fta} ({pct(team.ftm, team.fta)})</td><td className={td}>{team.oreb}</td><td className={td}>{team.dreb}</td><td className={td}>{team.oreb + team.dreb}</td><td className={td}>{team.ast}</td><td className={td}>{team.stl}</td><td className={td}>{team.blk}</td><td className={td}>{team.tov}</td><td className={td}>{team.pf}</td><td className={td}></td></tr>
        </tbody>
      </TableWrap>
      <p className="mt-2 text-xs text-muted">Possessions {team.possessions} · Points in paint {team.pointsInPaint} · Fast break {team.fastBreakPts} · Second chance {team.secondChancePts}</p>
    </Card>
  );
}
