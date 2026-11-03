import { useState } from 'react';
import { coachDataReport, importCoaches, importPlayers, parseCsv } from '@gbm/data-import';
import { makeFictionalCoach } from '@gbm/game-engine';
import { Rng } from '@gbm/shared-types';
import { useGame, useWorld } from '../store';
import { Badge, Card, Stat, TableWrap, td, th } from '../components/ui';
import { PageTitle } from './common';

export function DataSources() {
  const world = useWorld();
  const act = useGame((s) => s.act);
  const [log, setLog] = useState<string[]>([]);
  const r = coachDataReport(world);
  const issues = r.missingOrUnverifiedAssignments;
  return (
    <div>
      <PageTitle title="Data sources & verification" sub={world.meta.datasetName} />
      <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
        Real clubs and coaches were researched on 2026-11-03 through web-search summaries of the cited sources; primary pages were not opened, so
        records are marked <strong>reported</strong>, not verified. Players are fictional generated players. Nothing here is claimed to be complete.
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Real coaches" value={r.realCoaches} /><Stat label="Real HCs at real club" value={r.realHeadCoachesAssigned} /><Stat label="Real assistants" value={r.realAssistantsImported} />
        <Stat label="Fictional coaches" value={r.fictionalCoaches} /><Stat label="Open data issues" value={issues.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Open data issues">
          <TableWrap>
            <thead><tr>{['Entity', 'Field', 'Severity', 'Detail'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{issues.slice(0, 200).map((d, i) => <tr key={i}><td className={td}>{d.club}</td><td className={td}>{d.field}</td><td className={td}><Badge tone={d.severity === 'missing' ? 'warn' : 'bad'}>{d.severity}</Badge></td><td className={td + ' max-w-xs whitespace-normal text-xs'}>{d.message}</td></tr>)}</tbody>
          </TableWrap>
        </Card>
        <Card title="Import your own data">
          <p className="text-sm text-muted">Fill gaps with data you are authorized to use. Coach JSON: an array of {'{ firstName, lastName, club, role, sourceUrl, nationality?, birthDate? }'}. Player CSV/JSON columns: firstName, lastName, nationality, birthDate, heightCm, weightKg, position, overall, club.</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <label>Coaches (JSON) <input type="file" accept=".json" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const text = await f.text();
              act((w) => { const res = importCoaches(w, JSON.parse(text), (role) => makeFictionalCoach(w, new Rng(1), role, w.clubs[w.meta.userClubId]?.leagueId ?? Object.keys(w.leagues)[0])); setLog([`Coaches: ${res.added} added, ${res.updated} updated, ${res.skipped} skipped`, ...res.errors, ...res.messages]); });
            }} /></label>
            <label>Players (CSV or JSON) <input type="file" accept=".csv,.json" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const text = await f.text();
              const rows = f.name.endsWith('.json') ? JSON.parse(text) : parseCsv(text);
              act((w) => { const res = importPlayers(w, rows); setLog([`Players: ${res.added} added, ${res.updated} updated, ${res.skipped} skipped`, ...res.errors, ...res.messages]); });
            }} /></label>
          </div>
          {log.length > 0 && <ul className="mt-3 max-h-48 overflow-y-auto rounded bg-surface-2 p-2 text-xs">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </Card>
        <Card title={`Sources (${r.sources.length})`}>
          <ul className="space-y-1 text-xs">{r.sources.map((s) => <li key={s.id}><a className="text-accent" href={s.url} target="_blank" rel="noreferrer">{s.title}</a> <span className="text-muted">accessed {s.accessedOn}</span></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
