import { applyForJob, clubInterest, jobVacancies, resign, respondToOffer } from '@gbm/game-engine';
import { clubRecord } from '@gbm/staff-system';
import { useGame, useWorld } from '../store';
import { Badge, Button, Card, Empty, Stat, TableWrap, td, th } from '../components/ui';
import { PageTitle } from './common';
import { useState } from 'react';
import { ClubSelect } from './ClubSelect';

export function Career() {
  const world = useWorld();
  const { act, toast } = useGame();
  const [confirm, setConfirm] = useState(false);
  const [browse, setBrowse] = useState(false);
  const employed = !!world.clubs[world.meta.userClubId];
  const offers = world.jobOffers.filter((o) => o.status === 'open');
  const vacancies = jobVacancies(world);
  const titles = world.managerHistory.reduce((s, m) => s + m.titles, 0);
  if (browse && !employed) return <div><Button variant="ghost" onClick={() => setBrowse(false)}>← Back</Button><ClubSelect /></div>;
  return (
    <div>
      <PageTitle title="Career" sub={`${world.meta.managerName} · reputation ${world.meta.managerReputation}`} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Clubs managed" value={world.managerHistory.length} /><Stat label="Titles" value={titles} /><Stat label="Reputation" value={world.meta.managerReputation} /><Stat label="Status" value={employed ? 'Employed' : 'Unemployed'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Job offers">
          {offers.length === 0 ? <Empty>No open offers.</Empty> : offers.map((o) => (
            <div key={o.id} className="mb-2 rounded bg-surface-2 p-2 text-sm">
              <div className="font-medium">{world.clubs[o.clubId].name} <Badge tone="accent">{o.kind}</Badge></div>
              <div className="text-xs text-muted">{o.message} Expires {o.expires}.</div>
              <div className="mt-2 flex gap-2">
                <Button variant="primary" onClick={() => act((w) => respondToOffer(w, o.id, true), 'You have a new job!')}>Accept</Button>
                <Button onClick={() => act((w) => respondToOffer(w, o.id, false), 'Offer declined')}>Decline</Button>
              </div>
            </div>
          ))}
        </Card>
        <Card title="Head-coach vacancies" actions={!employed && world.managerHistory.length === 0 ? <Button onClick={() => setBrowse(true)}>Browse all clubs</Button> : undefined}>
          {vacancies.length === 0 ? <Empty>No vacancies right now. AI clubs fire and hire coaches as the season unfolds.</Empty> : (
            <TableWrap>
              <thead><tr>{['Club', 'League', 'Rep', 'Interest', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{vacancies.map(({ club }) => <tr key={club.id}><td className={td}>{club.name}</td><td className={td}>{world.leagues[club.leagueId].shortName}</td><td className={td}>{club.reputation}</td><td className={td}>{clubInterest(world, club.id)}%</td><td className={td}><button className="text-accent" onClick={() => act((w) => applyForJob(w, club.id), (o) => o.message)}>Apply</button></td></tr>)}</tbody>
            </TableWrap>
          )}
        </Card>
        <Card title="Manager history">
          <TableWrap>
            <thead><tr>{['Club', 'From', 'To', 'W-L', 'Titles', 'Ended'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{world.managerHistory.map((m) => {
              const live = m.endSeason === null ? clubRecord(world, m.clubId, world.meta.season) : { wins: 0, losses: 0 };
              return <tr key={m.id}><td className={td}>{world.clubs[m.clubId]?.name}</td><td className={td}>{m.startSeason}</td><td className={td}>{m.endSeason ?? 'present'}</td><td className={td}>{m.wins + live.wins}-{m.losses + live.losses}</td><td className={td}>{m.titles}</td><td className={td}>{m.endReason}</td></tr>;
            })}</tbody>
          </TableWrap>
          {employed && (
            !confirm ? <Button className="mt-3" variant="danger" onClick={() => setConfirm(true)}>Resign…</Button> : (
              <div className="mt-3 flex gap-2"><Button variant="danger" onClick={() => { act((w) => resign(w)); setConfirm(false); toast('You resigned.', 'info'); }}>Confirm resignation</Button><Button onClick={() => setConfirm(false)}>Cancel</Button></div>
            )
          )}
        </Card>
        <Card title="Season history">
          {world.seasonSummaries.length === 0 ? <Empty>No completed seasons yet.</Empty> : (
            <TableWrap>
              <thead><tr>{['Season', 'Competition', 'Champion', 'Runner-up', 'MVP'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{[...world.seasonSummaries].reverse().map((s) => {
                const mvp = world.awards.find((a) => a.season === s.season && a.leagueId === s.leagueId && a.award === 'mvp');
                const p = mvp?.playerId ? world.players[mvp.playerId] : null;
                return <tr key={`${s.season}${s.leagueId}`}><td className={td}>{s.season}</td><td className={td}>{world.leagues[s.leagueId]?.shortName}</td><td className={td}>{s.championId ? world.clubs[s.championId]?.name : '—'}</td><td className={td}>{s.runnerUpId ? world.clubs[s.runnerUpId]?.shortName : '—'}</td><td className={td}>{p ? `${p.firstName} ${p.lastName}` : '—'}</td></tr>;
              })}</tbody>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}
