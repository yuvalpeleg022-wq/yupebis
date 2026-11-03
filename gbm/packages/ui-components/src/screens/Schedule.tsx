import { useGame, useWorld } from '../store';
import { Badge, Card, Empty } from '../components/ui';
import { NoClub, PageTitle } from './common';

export function Schedule() {
  const world = useWorld();
  const go = useGame((s) => s.go);
  const clubId = world.meta.userClubId;
  if (!world.clubs[clubId]) return <NoClub />;
  const fixtures = Object.values(world.fixtures).filter((f) => f.season === world.meta.season && (f.homeId === clubId || f.awayId === clubId)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const nextIdx = fixtures.findIndex((f) => !f.matchId);
  return (
    <div>
      <PageTitle title="Schedule" sub={`${fixtures.length} games this season across ${world.clubs[clubId].competitionIds.length} competition(s)`} />
      <Card>
        {fixtures.length === 0 ? <Empty>No fixtures.</Empty> : (
          <ul className="divide-y divide-line">
            {fixtures.map((f, i) => {
              const home = f.homeId === clubId;
              const opp = world.clubs[home ? f.awayId : f.homeId];
              const m = f.matchId ? world.matches[f.matchId] : null;
              const us = m ? (home ? m.homeScore : m.awayScore) : 0;
              const them = m ? (home ? m.awayScore : m.homeScore) : 0;
              return (
                <li key={f.id} className={`flex flex-wrap items-center gap-2 py-2 text-sm ${i === nextIdx ? 'bg-accent/10' : ''}`}>
                  <span className="tabular w-20 shrink-0 text-xs text-muted">{f.date}</span>
                  <Badge tone="neutral">{world.leagues[f.leagueId].shortName}{f.stage === 'playoff' ? ` PO G${f.gameNumber}` : ''}</Badge>
                  <span className="min-w-0 flex-1 truncate">{f.neutral ? 'vs (neutral)' : home ? 'vs' : '@'} {opp.name}</span>
                  {m ? <button className="tabular" onClick={() => go({ screen: 'match', id: m.id })}><Badge tone={us > them ? 'good' : 'bad'}>{us > them ? 'W' : 'L'}</Badge> {us}-{them}</button> : <span className="text-xs text-muted">{i === nextIdx ? 'Next' : ''}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
