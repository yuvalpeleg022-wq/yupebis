import { computeStandings } from '@gbm/competition-system';
import { boardExpectation, jobVacancies, nextUserFixture, recentUserMatches } from '@gbm/game-engine';
import { payroll } from '@gbm/finance-system';
import { rosterOf } from '@gbm/transfer-system';
import { clubRecord } from '@gbm/staff-system';
import { useGame, useWorld } from '../store';
import { Badge, Button, Card, Empty, Stat } from '../components/ui';
import { PageTitle, PlayerLink, money } from './common';

export function Dashboard() {
  const world = useWorld();
  const go = useGame((s) => s.go);
  const clubId = world.meta.userClubId;
  const club = world.clubs[clubId];
  const news = [...world.news].reverse().filter((n) => n.clubId === clubId || n.important).slice(0, 6);
  if (!club) {
    const offers = world.jobOffers.filter((o) => o.status === 'open');
    return (
      <div>
        <PageTitle title={`Welcome, ${world.meta.managerName}`} sub="You are between jobs. The basketball world keeps moving." />
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Job market"><p className="text-sm">{offers.length} open offer(s), {jobVacancies(world).length} vacancies.</p><Button className="mt-3" variant="primary" onClick={() => go({ screen: 'career' })}>Open job market</Button></Card>
          <NewsCard news={news} />
        </div>
      </div>
    );
  }
  const next = nextUserFixture(world);
  const recent = recentUserMatches(world, 5);
  const rec = clubRecord(world, clubId, world.meta.season);
  const exp = boardExpectation(world);
  const injured = rosterOf(world, clubId).filter((p) => p.injuryId && world.injuries[p.injuryId]?.daysRemaining > 0);
  const standings = computeStandings(world, club.leagueId, world.meta.season);
  const myPos = standings.findIndex((r) => r.clubId === clubId);
  const window = standings.slice(Math.max(0, myPos - 3), Math.max(0, myPos - 3) + 7);
  return (
    <div>
      <PageTitle title="Dashboard" sub={`${club.name} · ${world.leagues[club.leagueId].name}`} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Record" value={`${rec.wins}-${rec.losses}`} sub={myPos >= 0 ? `#${myPos + 1} in ${world.leagues[club.leagueId].shortName}` : ''} />
        <Stat label="Cash" value={money(world, club.cash, clubId)} sub={`Payroll ${money(world, payroll(world, clubId, world.meta.season), clubId)}`} />
        <Stat label="Board confidence" value={`${world.meta.boardConfidence}%`} sub={exp.target} />
        <Stat label="Injuries" value={injured.length} sub={`${rosterOf(world, clubId).length} on roster`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Next game">
          {next ? (
            <div>
              <div className="text-lg font-semibold">{next.homeId === clubId ? 'vs' : '@'} {world.clubs[next.homeId === clubId ? next.awayId : next.homeId].name}</div>
              <div className="text-sm text-muted">{next.date} · {world.leagues[next.leagueId].name}{next.stage === 'playoff' ? ` · Playoffs game ${next.gameNumber}` : ''}</div>
              <Button className="mt-3" onClick={() => go({ screen: 'tactics' })}>Set lineup &amp; tactics</Button>
            </div>
          ) : <Empty>No scheduled games.</Empty>}
        </Card>
        <Card title="Recent results">
          {recent.length === 0 ? <Empty>No games played yet.</Empty> : (
            <ul className="space-y-1 text-sm">
              {recent.map((m) => {
                const home = m.homeId === clubId;
                const us = home ? m.homeScore : m.awayScore;
                const them = home ? m.awayScore : m.homeScore;
                return (
                  <li key={m.id}>
                    <button className="flex w-full justify-between gap-2 rounded px-1 py-1 hover:bg-surface-2" onClick={() => go({ screen: 'match', id: m.id })}>
                      <span className="truncate">{home ? 'vs' : '@'} {world.clubs[home ? m.awayId : m.homeId].shortName} <span className="text-xs text-muted">{m.date}</span></span>
                      <span className="tabular"><Badge tone={us > them ? 'good' : 'bad'}>{us > them ? 'W' : 'L'}</Badge> {us}-{them}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="Standings" actions={<Button variant="ghost" onClick={() => go({ screen: 'competitions' })}>Full table</Button>}>
          <ol className="space-y-1 text-sm">
            {window.map((r) => (
              <li key={r.clubId} className={`flex justify-between rounded px-1 ${r.clubId === clubId ? 'bg-accent/15' : ''}`}>
                <span className="truncate">{standings.indexOf(r) + 1}. {world.clubs[r.clubId].name}</span>
                <span className="tabular text-muted">{r.wins}-{r.losses}</span>
              </li>
            ))}
          </ol>
        </Card>
        <NewsCard news={news} />
        <Card title="Injuries">
          {injured.length === 0 ? <Empty>No injured players.</Empty> : (
            <ul className="space-y-1 text-sm">{injured.map((p) => <li key={p.id} className="flex justify-between gap-2"><PlayerLink p={p} /><span className="text-xs text-muted">{world.injuries[p.injuryId!].type} · {world.injuries[p.injuryId!].daysRemaining}d</span></li>)}</ul>
          )}
        </Card>
        <Card title="Board expectations">
          <p className="text-sm">{exp.target}</p>
          <p className="mt-1 text-xs text-muted">Roster strength ranks #{exp.rank} of {exp.size} in the league. Board confidence: {world.meta.boardConfidence}%. Very low confidence can lead to dismissal.</p>
        </Card>
      </div>
    </div>
  );
}

function NewsCard({ news }: { news: { id: string; date: string; title: string; important: boolean }[] }) {
  const go = useGame((s) => s.go);
  return (
    <Card title="Club news" actions={<Button variant="ghost" onClick={() => go({ screen: 'news' })}>All news</Button>}>
      {news.length === 0 ? <Empty>No news yet.</Empty> : (
        <ul className="space-y-1.5 text-sm">{news.map((n) => <li key={n.id} className="flex gap-2"><span className="tabular shrink-0 text-xs text-muted">{n.date.slice(5)}</span><span className={n.important ? 'font-medium' : ''}>{n.title}</span></li>)}</ul>
      )}
    </Card>
  );
}
