import { useMemo, useState } from 'react';
import { clubDirectory, filterClubs, type ClubFilter, type FinancialStatus } from '@gbm/game-engine';
import { useGame, useWorld } from '../store';
import { Badge, Button, Card, Field, TableWrap, inputCls, td, th } from '../components/ui';
import { PageTitle, money } from './common';

const ROSTER_TONE = { real: 'real', mixed: 'warn', placeholder: 'fictional', missing: 'bad' } as const;
const STATUS_TONE: Record<FinancialStatus, 'good' | 'accent' | 'neutral' | 'warn' | 'bad'> = { wealthy: 'good', healthy: 'accent', stable: 'neutral', tight: 'warn', in_debt: 'bad' };

/** Global, searchable club selection (career start). */
export function ClubSelect({ initial }: { initial?: boolean }) {
  const world = useWorld();
  const chooseClub = useGame((s) => s.chooseClub);
  const rows = useMemo(() => clubDirectory(world).filter((r) => world.leagues[r.leagueId].active), [world]);
  const locked = Object.values(world.leagues).filter((l) => !l.active);
  const [f, setF] = useState<ClubFilter>({ minReputation: 0, maxReputation: 100 });
  const [sort, setSort] = useState<'reputation' | 'name' | 'position' | 'cash'>('reputation');
  const countries = [...new Set(rows.map((r) => r.country))].sort();
  const leagues = Object.values(world.leagues).filter((l) => l.active);
  const list = filterClubs(rows, f).sort((a, b) =>
    sort === 'name' ? a.name.localeCompare(b.name) : sort === 'position' ? (a.position || 99) - (b.position || 99) : sort === 'cash' ? b.cash - a.cash : b.reputation - a.reputation,
  );
  const [picked, setPicked] = useState<string | null>(null);
  const pick = rows.find((r) => r.clubId === picked);
  return (
    <div className={initial ? 'safe-top safe-bottom mx-auto max-w-6xl px-4 py-6' : ''}>
      <PageTitle title="Choose your club" sub={`${rows.length} clubs in ${leagues.length} competitions. You will be the head coach of ONE club; every other club is run by the AI.`} />
      {locked.length > 0 && (
        <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
          <strong>{locked.length} competition(s) cannot be simulated</strong> because real player rosters are missing:
          <ul className="mt-1 list-disc pl-5 text-xs">{locked.map((l) => <li key={l.id}>{l.name}: {l.dataNote}</li>)}</ul>
          {rows.length === 0 && <p className="mt-2">No club is currently playable. Start a new career with a verified player dataset, or allow labelled placeholders.</p>}
        </div>
      )}
      <Card title="Filters">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search"><input className={inputCls} placeholder="Club or city" value={f.text ?? ''} onChange={(e) => setF({ ...f, text: e.target.value })} data-testid="club-search" /></Field>
          <Field label="Country">
            <select className={inputCls} value={f.country ?? ''} onChange={(e) => setF({ ...f, country: e.target.value || null })}>
              <option value="">All countries</option>{countries.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="League (primary)">
            <select className={inputCls} value={f.leagueId ?? ''} onChange={(e) => setF({ ...f, leagueId: e.target.value || null })}>
              <option value="">All leagues</option>{leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Competition (any)">
            <select className={inputCls} value={f.competitionId ?? ''} onChange={(e) => setF({ ...f, competitionId: e.target.value || null })}>
              <option value="">Any competition</option>{leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label={`Reputation ${f.minReputation ?? 0}–${f.maxReputation ?? 100}`}>
            <div className="flex gap-2">
              <input type="range" min={0} max={100} value={f.minReputation ?? 0} onChange={(e) => setF({ ...f, minReputation: Number(e.target.value) })} className="w-full" aria-label="Minimum reputation" />
              <input type="range" min={0} max={100} value={f.maxReputation ?? 100} onChange={(e) => setF({ ...f, maxReputation: Number(e.target.value) })} className="w-full" aria-label="Maximum reputation" />
            </div>
          </Field>
          <Field label="Financial status">
            <select className={inputCls} value={f.financialStatus ?? ''} onChange={(e) => setF({ ...f, financialStatus: (e.target.value || null) as FinancialStatus | null })}>
              <option value="">Any</option>{(['wealthy', 'healthy', 'stable', 'tight', 'in_debt'] as const).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="League position (top N)">
            <input className={inputCls} type="number" min={1} placeholder="Any" value={f.maxPosition ?? ''} onChange={(e) => setF({ ...f, maxPosition: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Sort by">
            <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="reputation">Reputation</option><option value="name">Name</option><option value="position">League position</option><option value="cash">Cash</option>
            </select>
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted">Before the season starts, positions are <em>projected</em> from roster strength. Club finances and reputation are in-game values.</p>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title={`${list.length} clubs`}>
          <TableWrap>
            <thead><tr><th className={th}>Club</th><th className={th}>League</th><th className={th}>Rep</th><th className={th}>Pos</th><th className={th}>Finances</th><th className={th}>Head coach</th><th className={th}>Roster</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.clubId} onClick={() => setPicked(r.clubId)} className={`cursor-pointer hover:bg-surface-2 ${picked === r.clubId ? 'bg-accent/10' : ''}`} data-testid="club-row">
                  <td className={td}><div className="font-medium">{r.name}</div><div className="text-xs text-muted">{r.city}, {r.country}</div></td>
                  <td className={td}><div>{r.leagueName}</div>{r.competitions.length > 1 && <div className="text-xs text-muted">+ {r.competitions.slice(1).map((c) => c.name).join(', ')}</div>}</td>
                  <td className={td}>{r.reputation}</td>
                  <td className={td}>{r.position ? `${r.position}${r.positionProjected ? 'ᵖ' : ''}/${r.leagueSize}` : '—'}</td>
                  <td className={td}><Badge tone={STATUS_TONE[r.financialStatus]}>{r.financialStatus.replace('_', ' ')}</Badge></td>
                  <td className={td}>{r.headCoach ?? <span className="text-muted">vacant</span>} {r.headCoach && <Badge tone={r.headCoachReal ? 'real' : 'fictional'}>{r.headCoachReal ? 'Real' : 'Fictional'}</Badge>}</td>
                  <td className={td}><Badge tone={ROSTER_TONE[world.clubs[r.clubId].rosterSource]}>{world.clubs[r.clubId].rosterSource}</Badge></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
        <Card title="Selected club">
          {!pick ? <p className="text-sm text-muted">Pick a club from the list.</p> : (
            <div className="space-y-2 text-sm">
              <div className="text-lg font-bold">{pick.name}</div>
              <div className="text-muted">{pick.city}, {pick.country}</div>
              <div>Competitions: {pick.competitions.map((c) => c.name).join(', ')}</div>
              <div>Reputation {pick.reputation} · {pick.position ? `${pick.positionProjected ? 'projected ' : ''}#${pick.position} of ${pick.leagueSize}` : ''}</div>
              <div>Cash {money(world, pick.cash, pick.clubId)} · Payroll {money(world, pick.payroll, pick.clubId)}</div>
              {pick.headCoach && <p className="text-xs text-muted">Current head coach {pick.headCoach} will step aside when you take over and join the coaching market.</p>}
              {pick.dataNote && <p className="text-xs text-warn">{pick.dataNote}</p>}
              <Button variant="primary" className="w-full" onClick={() => chooseClub(pick.clubId)} data-testid="take-job">Become head coach</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
