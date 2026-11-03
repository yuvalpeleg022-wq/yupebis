import { useMemo, useState } from 'react';
import { useGame, useWorld } from '../store';
import { Card, TableWrap, inputCls, td, th } from '../components/ui';
import { PageTitle } from './common';

type Cat = 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'tpm';
const CATS: [Cat, string][] = [['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['stl', 'Steals'], ['blk', 'Blocks'], ['tpm', '3-pointers made']];

export function Statistics() {
  const world = useWorld();
  const go = useGame((s) => s.go);
  const leagues = Object.values(world.leagues).filter((l) => l.active);
  const [leagueId, setLeagueId] = useState(world.clubs[world.meta.userClubId]?.leagueId ?? leagues[0].id);
  const [cat, setCat] = useState<Cat>('pts');
  const totals = useMemo(() => {
    const m = new Map<string, { playerId: string; clubId: string; gp: number; pts: number; reb: number; ast: number; stl: number; blk: number; tpm: number; min: number }>();
    for (const g of world.playerGameStats) {
      const match = world.matches[g.matchId];
      if (!match || match.season !== world.meta.season || match.leagueId !== leagueId) continue;
      const r = m.get(g.playerId) ?? { playerId: g.playerId, clubId: g.clubId, gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tpm: 0, min: 0 };
      r.gp++; r.pts += g.pts; r.reb += g.oreb + g.dreb; r.ast += g.ast; r.stl += g.stl; r.blk += g.blk; r.tpm += g.tpm; r.min += g.seconds / 60;
      m.set(g.playerId, r);
    }
    return [...m.values()];
  }, [world, leagueId, world.playerGameStats.length]);
  const minGames = Math.max(1, Math.floor(Math.max(0, ...totals.map((t) => t.gp)) * 0.5));
  const leaders = totals.filter((t) => t.gp >= minGames).sort((a, b) => b[cat] / b.gp - a[cat] / a.gp).slice(0, 25);
  return (
    <div>
      <PageTitle title="Statistics" sub="League leaders this season, calculated from simulated box scores." actions={
        <div className="flex gap-2">
          <select className={inputCls + ' w-auto'} value={leagueId} onChange={(e) => setLeagueId(e.target.value)} aria-label="League">{leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <select className={inputCls + ' w-auto'} value={cat} onChange={(e) => setCat(e.target.value as Cat)} aria-label="Category">{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>} />
      <Card title={`Leaders — minimum ${minGames} games`}>
        {leaders.length === 0 ? <p className="text-sm text-muted">No games played in this competition yet.</p> : (
          <TableWrap>
            <thead><tr>{['#', 'Player', 'Club', 'GP', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', '3PM'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{leaders.map((r, i) => {
              const p = world.players[r.playerId];
              const pg = (v: number) => (v / r.gp).toFixed(1);
              return <tr key={r.playerId} className={r.clubId === world.meta.userClubId ? 'bg-accent/10' : ''}><td className={td}>{i + 1}</td><td className={td}><button className="hover:text-accent" onClick={() => go({ screen: 'player', id: r.playerId })}>{p ? `${p.firstName} ${p.lastName}` : r.playerId}</button></td><td className={td}>{world.clubs[r.clubId]?.shortName}</td><td className={td}>{r.gp}</td><td className={td}>{pg(r.min)}</td><td className={td}>{pg(r.pts)}</td><td className={td}>{pg(r.reb)}</td><td className={td}>{pg(r.ast)}</td><td className={td}>{pg(r.stl)}</td><td className={td}>{pg(r.blk)}</td><td className={td}>{pg(r.tpm)}</td></tr>;
            })}</tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
