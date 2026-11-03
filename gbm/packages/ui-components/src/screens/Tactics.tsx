import { useState } from 'react';
import type { DefensiveScheme, Tactics as T } from '@gbm/shared-types';
import { playerOverall } from '@gbm/player-system';
import { teamMinutes } from '@gbm/competition-system';
import { DEFENSE_LABELS, tacticalFitBreakdown } from '@gbm/simulation';
import { autoRotation, isAvailable, normalizeMinutes } from '@gbm/ai-manager';
import { clubRules, rosterOf } from '@gbm/transfer-system';
import { useGame, useWorld } from '../store';
import { Badge, Button, Card, Field, OvrPill, inputCls } from '../components/ui';
import { NoClub, PageTitle, pname } from './common';

const SLIDERS: [keyof T, string][] = [
  ['pace', 'Pace'], ['fastBreak', 'Fast Break'], ['pickAndRoll', 'Pick and Roll'], ['isolation', 'Isolation'], ['motion', 'Motion Offense'],
  ['postUp', 'Post-Up'], ['threePointFocus', 'Three-Point Focus'], ['ballMovement', 'Ball Movement'], ['pressure', 'Defensive Pressure'], ['doubleTeams', 'Double Teams'],
];

export function Tactics() {
  const world = useWorld();
  const act = useGame((s) => s.act);
  const club = world.clubs[world.meta.userClubId];
  const [draft, setDraft] = useState(() => (club ? structuredClone(club.rotation) : null));
  if (!club || !draft) return <NoClub />;
  const { rules } = clubRules(world, club.id);
  const total = teamMinutes(rules);
  const roster = rosterOf(world, club.id).sort((a, b) => (draft.minutes[b.id] ?? 0) - (draft.minutes[a.id] ?? 0) || playerOverall(b) - playerOverall(a));
  const sum = roster.reduce((s, p) => s + (draft.minutes[p.id] ?? 0), 0);
  const starters = roster.filter((p) => draft.starters.includes(p.id));
  const fit = tacticalFitBreakdown(club.tactics, starters.map((p) => ({ attributes: p.attributes, position: p.position })));
  const valid = draft.auto || (draft.starters.length === 5 && sum === total);
  const setT = (patch: Partial<T>) => act((w) => Object.assign(w.clubs[club.id].tactics, patch));
  return (
    <div>
      <PageTitle title="Tactics & rotation" sub={`Games are ${rules.periods}×${rules.periodMinutes} min: ${total} player-minutes to distribute.`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Rotation" actions={
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.auto} onChange={(e) => setDraft(e.target.checked ? autoRotation(world, club.id) : { ...draft, auto: false })} data-testid="auto-rotation" />Assistant manages rotation</label>
        }>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={draft.starters.length === 5 ? 'good' : 'bad'}>{draft.starters.length}/5 starters</Badge>
            <Badge tone={sum === total ? 'good' : 'warn'}>{sum}/{total} minutes</Badge>
            {!draft.auto && sum !== total && <Button variant="ghost" onClick={() => { const m = { ...draft.minutes }; normalizeMinutes(m, roster.map((p) => p.id), total); setDraft({ ...draft, minutes: m }); }}>Balance to {total}</Button>}
          </div>
          <ul className="divide-y divide-line">
            {roster.map((p) => {
              const starter = draft.starters.includes(p.id);
              const healthy = isAvailable(world, p);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-2 py-1.5">
                  <input type="checkbox" disabled={draft.auto} checked={starter} aria-label={`Start ${pname(p)}`} onChange={(e) => setDraft({ ...draft, starters: e.target.checked ? [...draft.starters, p.id].slice(-5) : draft.starters.filter((x) => x !== p.id) })} />
                  <OvrPill value={playerOverall(p)} />
                  <span className="min-w-0 flex-1 truncate text-sm">{pname(p)} <span className="text-xs text-muted">{p.position}</span> {!healthy && <Badge tone="bad">Injured</Badge>}</span>
                  <input type="range" min={0} max={rules.periodMinutes * rules.periods} disabled={draft.auto} value={draft.minutes[p.id] ?? 0} onChange={(e) => setDraft({ ...draft, minutes: { ...draft.minutes, [p.id]: Number(e.target.value) } })} className="w-28 sm:w-36" aria-label={`Minutes for ${pname(p)}`} />
                  <span className="tabular w-8 text-right text-sm">{draft.minutes[p.id] ?? 0}</span>
                </li>
              );
            })}
          </ul>
          <Button className="mt-3" variant="primary" disabled={!valid} onClick={() => act((w) => { w.clubs[club.id].rotation = structuredClone(draft); }, 'Rotation saved')} data-testid="save-rotation">Save rotation</Button>
          <p className="mt-2 text-xs text-muted">Injured starters are replaced automatically on game day, and minutes are redistributed.</p>
        </Card>
        <div className="space-y-4">
          <Card title="Systems">
            <Field label="Defensive scheme">
              <select className={inputCls} value={club.tactics.defense} onChange={(e) => setT({ defense: e.target.value as DefensiveScheme })}>
                {Object.entries(DEFENSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SLIDERS.map(([k, label]) => (
                <label key={k} className="text-xs text-muted">
                  <div className="flex justify-between"><span>{label}</span><span className="tabular text-ink">{club.tactics[k] as number}</span></div>
                  <input type="range" min={0} max={100} value={club.tactics[k] as number} onChange={(e) => setT({ [k]: Number(e.target.value) } as Partial<T>)} className="w-full" />
                </label>
              ))}
            </div>
          </Card>
          <Card title="Tactical fit with starters">
            <p className="text-sm">Overall fit: <strong className={fit.total >= 0 ? 'text-good' : 'text-bad'}>{(fit.total * 100).toFixed(1)}</strong> (applied to shot quality and turnovers in simulation)</p>
            <ul className="mt-2 space-y-0.5 text-xs">{fit.items.map((i) => <li key={i.label} className="flex justify-between"><span className="text-muted">{i.label}</span><span className={i.value >= 0 ? 'text-good' : 'text-bad'}>{(i.value * 100).toFixed(1)}</span></li>)}</ul>
            <p className="mt-2 text-xs text-muted">In-game tactical adjustments during a live match are in development; tactics apply to the next simulated game.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
