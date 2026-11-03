import { useState } from 'react';
import { computeStandings, roundName, seriesForLeague } from '@gbm/competition-system';
import { leagueStatus } from '@gbm/game-engine';
import { useWorld } from '../store';
import { Badge, Card, Empty, TableWrap, inputCls, td, th } from '../components/ui';
import { PageTitle } from './common';

export function Competitions() {
  const world = useWorld();
  const user = world.clubs[world.meta.userClubId];
  const leagues = Object.values(world.leagues).filter((l) => l.active);
  const [leagueId, setLeagueId] = useState(user?.leagueId ?? leagues[0].id);
  const [season, setSeason] = useState(world.meta.season);
  const league = world.leagues[leagueId];
  const rules = world.rules[league.rulesId];
  const live = season === world.meta.season;
  const rows = live ? computeStandings(world, leagueId, season) : world.seasonStandings.filter((s) => s.season === season && s.leagueId === leagueId).sort((a, b) => a.rank - b.rank).map((s) => s.row);
  const series = seriesForLeague(world, leagueId, season);
  const rounds = [...new Set(series.map((s) => s.round))];
  const seasons = [...new Set([world.meta.season, ...world.seasonStandings.map((s) => s.season)])].sort((a, b) => b - a);
  const summary = world.seasonSummaries.find((s) => s.season === season && s.leagueId === leagueId);
  return (
    <div>
      <PageTitle title="Competitions" actions={
        <div className="flex gap-2">
          <select className={inputCls + ' w-auto'} value={leagueId} onChange={(e) => setLeagueId(e.target.value)} aria-label="Competition">{leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <select className={inputCls + ' w-auto'} value={season} onChange={(e) => setSeason(Number(e.target.value))} aria-label="Season">{seasons.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </div>} />
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted">
        <Badge tone="accent">{live ? leagueStatus(world, leagueId).replace('_', ' ') : 'archived'}</Badge>
        <span>{rules.name}: {rules.periods}×{rules.periodMinutes} min, OT {rules.overtimeMinutes} min, foul out at {rules.personalFoulLimit}</span>
        <span>· {league.roundRobins}× round robin · playoffs: top {league.playoff.teams}, rounds best-of {league.playoff.seriesLengths.join('/')}</span>
        {league.dataNote && <span className="text-warn">· {league.dataNote}</span>}
      </div>
      {summary?.championId && <p className="mb-3 text-sm">Champion: <strong>{world.clubs[summary.championId]?.name}</strong></p>}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card title="Standings">
          {rows.length === 0 ? <Empty>No standings.</Empty> : (
            <TableWrap>
              <thead><tr>{['#', 'Club', 'GP', 'W', 'L', 'PCT', 'PF', 'PA', 'DIFF', 'Home', 'Away', 'L10', 'Strk'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={r.clubId} className={r.clubId === world.meta.userClubId ? 'bg-accent/15' : i < league.playoff.teams ? '' : 'text-muted'}>
                  <td className={td}>{i + 1}</td><td className={td}>{world.clubs[r.clubId]?.name}</td><td className={td}>{r.played}</td><td className={td}>{r.wins}</td><td className={td}>{r.losses}</td>
                  <td className={td}>{r.played ? (r.wins / r.played).toFixed(3) : '—'}</td><td className={td}>{r.pointsFor}</td><td className={td}>{r.pointsAgainst}</td><td className={td}>{r.pointsFor - r.pointsAgainst}</td>
                  <td className={td}>{r.homeWins}-{r.homeLosses}</td><td className={td}>{r.awayWins}-{r.awayLosses}</td><td className={td}>{r.last10}</td><td className={td}>{r.streak > 0 ? `W${r.streak}` : r.streak < 0 ? `L${-r.streak}` : '—'}</td>
                </tr>
              ))}</tbody>
            </TableWrap>
          )}
          <p className="mt-2 text-xs text-muted">Tiebreakers: win %, head-to-head, point differential, points scored.</p>
        </Card>
        <Card title="Playoffs">
          {series.length === 0 ? <Empty>Playoffs have not started.</Empty> : rounds.map((r) => (
            <div key={r} className="mb-3">
              <div className="mb-1 text-xs font-semibold uppercase text-muted">{roundName(league, r)}</div>
              {series.filter((s) => s.round === r).map((s) => (
                <div key={s.id} className="mb-1 rounded bg-surface-2 px-2 py-1 text-sm">
                  <div className="flex justify-between"><span className={s.winnerId === s.highSeedId ? 'font-semibold' : ''}>({s.highSeed}) {world.clubs[s.highSeedId].shortName}</span><span className="tabular">{s.highWins}</span></div>
                  <div className="flex justify-between"><span className={s.winnerId === s.lowSeedId ? 'font-semibold' : ''}>({s.lowSeed}) {world.clubs[s.lowSeedId].shortName}</span><span className="tabular">{s.lowWins}</span></div>
                </div>
              ))}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
