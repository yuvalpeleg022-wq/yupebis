import { useMemo, useState } from 'react';
import { allocateNextSeason, computeStandings, entriesFor, regulationFor, seasonResults, standingsZones, type StandingsZone } from '@gbm/competition-system';
import { validateRegulation } from '@gbm/data-import';
import { seasonLabel } from '@gbm/shared-types';
import { useGame, useWorld } from '../store';
import { Badge, Button, Card, Empty, Field, TableWrap, inputCls, td, th } from '../components/ui';
import { PageTitle } from './common';

const ZONE_TONE: Record<StandingsZone['kind'], 'good' | 'accent' | 'warn' | 'bad'> = { qualification: 'good', qualifying_round: 'accent', promotion: 'good', relegation: 'bad' };
const REASON_LABEL: Record<string, string> = {
  founding: 'Real-world 2026-27', member: 'Member', license: 'Licence', champion: 'Champion', runner_up: 'Runner-up', position: 'League position',
  country: 'Country allocation', wildcard: 'Wildcard', dropped: 'Dropped down', promoted: 'Promoted', relegated: 'Relegated', qualifying_round: 'Qualifying round',
};

export function Qualification() {
  const world = useWorld();
  const season = world.meta.season;
  const user = world.clubs[world.meta.userClubId];
  const leagues = Object.values(world.leagues).filter((l) => world.competitionEntries.some((e) => e.leagueId === l.id && e.season >= season));
  const [leagueId, setLeagueId] = useState(user?.leagueId ?? leagues[0]?.id);
  const league = world.leagues[leagueId];
  const zones = standingsZones(world, leagueId, season);
  const standings = computeStandings(world, leagueId, season);
  const confirmedNext = world.competitionEntries.filter((e) => e.season === season + 1);
  const projected = useMemo(() => (confirmedNext.length ? null : allocateNextSeason(world, season, seasonResults(world, season))), [world, season, confirmedNext.length, world.matches]);
  const nextList = confirmedNext.length ? confirmedNext : projected?.entries ?? [];
  const isConfirmed = confirmedNext.length > 0;
  const pending = entriesFor(world, season).filter((e) => e.status === 'pending_qualifier');
  const qualifiers = Object.values(world.fixtures).filter((f) => f.season === season && f.stage === 'qualifier');
  const comps = [...new Set(nextList.map((e) => e.leagueId))];
  if (!league) return <Empty>No competitions.</Empty>;
  return (
    <div>
      <PageTitle title="Qualification" sub={`Promotion, relegation and continental places for ${seasonLabel(season + 1)}`} actions={
        <select className={inputCls + ' w-auto'} value={leagueId} onChange={(e) => setLeagueId(e.target.value)} aria-label="Competition">{leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={`${league.name} — current table and zones`} actions={<Badge tone="warn">Projected</Badge>}>
          {zones.length === 0 && <p className="mb-2 text-sm text-muted">No qualification, promotion or relegation zones for this competition.</p>}
          <div className="mb-2 flex flex-wrap gap-1">{zones.map((z, i) => <Badge key={i} tone={ZONE_TONE[z.kind]}>{z.from}–{z.to}: {z.label}</Badge>)}</div>
          <TableWrap>
            <thead><tr>{['#', 'Club', 'W-L', 'Zone'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{standings.map((r, i) => {
              const z = zones.filter((x) => i + 1 >= x.from && i + 1 <= x.to);
              return <tr key={r.clubId} className={r.clubId === world.meta.userClubId ? 'bg-accent/15' : ''}><td className={td}>{i + 1}</td><td className={td}>{world.clubs[r.clubId]?.name}</td><td className={td}>{r.wins}-{r.losses}</td><td className={td}>{z.map((x, k) => <Badge key={k} tone={ZONE_TONE[x.kind]}>{x.kind.replace('_', ' ')}</Badge>)}</td></tr>;
            })}</tbody>
          </TableWrap>
          <p className="mt-2 text-xs text-muted">Positions-based places cascade: if a club already qualified for a higher competition, the next eligible club takes its place.</p>
        </Card>
        <Card title={`Next season memberships (${seasonLabel(season + 1)})`} actions={<Badge tone={isConfirmed ? 'good' : 'warn'}>{isConfirmed ? 'Confirmed' : 'Projected from current standings'}</Badge>}>
          {comps.length === 0 ? <Empty>No qualification data.</Empty> : comps.map((id) => {
            const list = nextList.filter((e) => e.leagueId === id);
            const reg = regulationFor(world, id, season + 1);
            if (reg?.membership !== 'qualification' && !list.some((e) => e.reason === 'promoted' || e.reason === 'relegated')) return null;
            return (
              <div key={id} className="mb-3">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold">{world.leagues[id].name} <Badge tone="neutral">{list.filter((e) => e.status !== 'eliminated').length}/{reg?.size ?? '?'}</Badge></div>
                <ul className="space-y-0.5 text-xs">{list.filter((e) => reg?.membership === 'qualification' || e.reason === 'promoted' || e.reason === 'relegated').map((e) => (
                  <li key={e.clubId} className={`flex flex-wrap gap-2 ${e.clubId === world.meta.userClubId ? 'text-accent' : ''}`}><span className="min-w-0 flex-1 truncate">{world.clubs[e.clubId]?.name}</span><Badge tone={e.status === 'pending_qualifier' ? 'accent' : e.status === 'eliminated' ? 'bad' : 'good'}>{REASON_LABEL[e.reason] ?? e.reason}</Badge><span className="text-muted">{e.detail}</span></li>
                ))}</ul>
              </div>
            );
          })}
          {projected?.notes.map((n, i) => <p key={i} className="text-xs text-warn">{world.leagues[n.leagueId]?.shortName}: {n.message}</p>)}
        </Card>
        <Card title="Qualifying rounds this season">
          {pending.length === 0 && qualifiers.length === 0 ? <Empty>No qualifying rounds this season.</Empty> : (
            <ul className="space-y-1 text-sm">
              {qualifiers.map((f) => { const m = f.matchId ? world.matches[f.matchId] : null; return <li key={f.id} className="flex flex-wrap justify-between gap-2"><span>{world.leagues[f.leagueId].shortName}: {world.clubs[f.homeId].shortName} vs {world.clubs[f.awayId].shortName} <span className="text-xs text-muted">{f.date}</span></span><span className="tabular">{m ? `${m.homeScore}-${m.awayScore}` : 'pending'}</span></li>; })}
            </ul>
          )}
        </Card>
        <Card title="Licences & eligibility">
          {Object.values(world.leagues).map((l) => regulationFor(world, l.id, season + 1)).filter((r) => r?.membership === 'qualification').map((r) => (
            <div key={r!.leagueId} className="mb-3 text-sm">
              <div className="font-semibold">{world.leagues[r!.leagueId].name} <Badge tone={r!.provenance === 'real_world' ? 'real' : 'neutral'}>{r!.provenance.replace('_', ' ')}</Badge>{r!.exclusive && <Badge tone="neutral">exclusive</Badge>}</div>
              <p className="text-xs text-muted">{r!.notes}</p>
              {r!.qualification.filter((q) => q.source.type === 'license').map((q) => q.source.type === 'license' && <p key={q.id} className="text-xs">{q.label}: {q.source.clubIds.map((c) => world.clubs[c]?.shortName).join(', ')} — valid through {q.source.untilSeason}</p>)}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export function RulesEditor() {
  const world = useWorld();
  const act = useGame((s) => s.act);
  const ids = Object.keys(world.leagues);
  const [leagueId, setLeagueId] = useState(ids[0]);
  const current = regulationFor(world, leagueId, world.meta.season + 1);
  const [text, setText] = useState(() => JSON.stringify(current ? { ...current, fromSeason: world.meta.season + 1 } : null, null, 2));
  const [errors, setErrors] = useState<string[]>([]);
  const versions = world.regulations.filter((r) => r.leagueId === leagueId).sort((a, b) => a.fromSeason - b.fromSeason);
  const load = (id: string) => {
    setLeagueId(id);
    const r = regulationFor(world, id, world.meta.season + 1);
    setText(JSON.stringify(r ? { ...r, fromSeason: world.meta.season + 1 } : { leagueId: id, fromSeason: world.meta.season + 1, size: 16, membership: 'open', promotion: null, relegation: null, qualification: [], qualifyingRound: null, priority: 0, exclusive: false, provenance: 'game_regulation', notes: '' }, null, 2));
    setErrors([]);
  };
  return (
    <div>
      <PageTitle title="Competition rules editor" sub="Edit qualification, promotion and relegation for future seasons — no code changes needed. Changes apply from the season you set." />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="Competitions">
          <ul className="space-y-1 text-sm">{ids.map((id) => <li key={id}><button className={`w-full rounded px-2 py-1 text-left ${id === leagueId ? 'bg-accent/15' : 'hover:bg-surface-2'}`} onClick={() => load(id)}>{world.leagues[id].name} <span className="text-xs text-muted">{id}</span></button></li>)}</ul>
          <div className="mt-3 text-xs text-muted">Versions: {versions.map((v) => `${v.fromSeason} (${v.provenance.replace('_', ' ')})`).join(', ') || 'none'}</div>
          <details className="mt-3 text-xs text-muted"><summary>Club ids</summary><ul className="max-h-64 overflow-y-auto">{Object.values(world.clubs).map((c) => <li key={c.id}>{c.id} — {c.name}</li>)}</ul></details>
        </Card>
        <Card title={`${world.leagues[leagueId].name} regulation`}>
          <Field label="Regulation (JSON)">
            <textarea className={inputCls + ' min-h-[420px] font-mono text-xs'} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="Regulation JSON" />
          </Field>
          {errors.map((e) => <p key={e} className="mt-1 text-xs text-bad">{e}</p>)}
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={() => {
              let raw: unknown;
              try { raw = JSON.parse(text); } catch (e) { setErrors([`Invalid JSON: ${(e as Error).message}`]); return; }
              const v = validateRegulation(world, raw);
              if (!v.ok) { setErrors(v.errors); return; }
              setErrors([]);
              act((w) => { w.regulations.push({ ...v.value, provenance: 'game_regulation' }); }, `Saved rules for ${world.leagues[leagueId].name} from ${v.value.fromSeason}`);
            }}>Validate &amp; save</Button>
            <Button onClick={() => load(leagueId)}>Reset</Button>
          </div>
          <p className="mt-2 text-xs text-muted">Rule sources: league_position, playoff_champion, playoff_runner_up, license, wildcard, country_allocation, dropped_from. Edited rules are stored as game regulations.</p>
        </Card>
      </div>
    </div>
  );
}
