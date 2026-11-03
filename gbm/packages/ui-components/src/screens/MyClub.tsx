import { payroll, staffPayroll } from '@gbm/finance-system';
import { boardExpectation } from '@gbm/game-engine';
import { PERSONALITY_LABEL } from '@gbm/ai-manager';
import { rosterOf } from '@gbm/transfer-system';
import { useWorld } from '../store';
import { Badge, Card, Stat } from '../components/ui';
import { NoClub, PageTitle, money } from './common';

export function MyClub() {
  const world = useWorld();
  const club = world.clubs[world.meta.userClubId];
  if (!club) return <NoClub />;
  const rules = world.rules[world.leagues[club.leagueId].rulesId];
  const exp = boardExpectation(world);
  const sources = club.verification.sources.map((id) => world.dataSources[id]).filter(Boolean);
  return (
    <div>
      <PageTitle title={club.name} sub={`${club.city}, ${club.country}`} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Reputation" value={club.reputation} />
        <Stat label="Arena" value={club.arenaCapacity.toLocaleString('en-US')} sub="in-game value" />
        <Stat label="Payroll" value={money(world, payroll(world, club.id, world.meta.season), club.id)} sub={`Budget ${money(world, club.wageBudget, club.id)}`} />
        <Stat label="Staff payroll" value={money(world, staffPayroll(world, club.id), club.id)} sub={`Budget ${money(world, club.staffBudget, club.id)}`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Competitions">
          <ul className="space-y-2 text-sm">
            {club.competitionIds.map((id) => {
              const l = world.leagues[id];
              return <li key={id}><div className="font-medium">{l.name} {id === club.leagueId && <Badge tone="accent">Primary</Badge>}</div><div className="text-xs text-muted">{world.rules[l.rulesId].name}{l.dataNote ? ` · ${l.dataNote}` : ''}</div></li>;
            })}
          </ul>
        </Card>
        <Card title="Board">
          <p className="text-sm">Season objective: <strong>{exp.target}</strong></p>
          <p className="mt-1 text-sm">Confidence {world.meta.boardConfidence}%</p>
          <p className="mt-2 text-xs text-muted">Roster rules: {rules.rosterMin}–{rules.rosterMax} players, {rules.gameRosterMax} dress per game{rules.foreignPlayerLimit ? `, max ${rules.foreignPlayerLimit} foreign players` : ''}. Salary cap: {rules.salaryCap.type}.</p>
          <p className="mt-1 text-xs text-muted">{rules.note}</p>
        </Card>
        <Card title="Club identity data">
          <p className="text-sm">Name, city, country and competition come from the real-world dataset ({club.verification.status}). Roster ({rosterOf(world, club.id).length} players) is fictional.</p>
          <ul className="mt-2 space-y-1 text-xs">{sources.map((s) => <li key={s.id}><a className="text-accent" href={s.url} target="_blank" rel="noreferrer">{s.publisher}: {s.title}</a> <span className="text-muted">({s.accessedOn})</span></li>)}</ul>
        </Card>
        <Card title="Rival clubs (AI)">
          <p className="text-sm text-muted">All other clubs are managed independently by AI general managers with their own personalities.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.values(world.clubs).filter((c) => c.leagueId === club.leagueId && c.id !== club.id).slice(0, 8).map((c) => <li key={c.id} className="flex justify-between gap-2"><span className="truncate">{c.name}</span><span className="text-xs text-muted">{PERSONALITY_LABEL[c.aiPersonality]}</span></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
