import type { ReactNode } from 'react';
import type { Player, Staff, World } from '@gbm/shared-types';
import { ageOn, formatMoney } from '@gbm/shared-types';
import { useGame } from '../store';
import { Badge } from '../components/ui';

export const money = (world: World, amount: number, clubId?: string) => {
  const cur = clubId ? world.leagues[world.clubs[clubId]?.leagueId]?.currency : 'USD';
  return formatMoney(amount, cur === 'EUR' ? '€' : '$');
};

export const age = (world: World, p: { birthDate: string }) => ageOn(p.birthDate, world.meta.currentDate);
export const pname = (p: Pick<Player, 'firstName' | 'lastName'>) => `${p.firstName} ${p.lastName}`;
export const cname = (s: Pick<Staff, 'firstName' | 'lastName'>) => `${s.firstName} ${s.lastName}`.trim();

export function PageTitle({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold">{title}</h1>
        {sub && <div className="text-sm text-muted">{sub}</div>}
      </div>
      {actions}
    </div>
  );
}

export function PlayerLink({ p }: { p: Player }) {
  const go = useGame((s) => s.go);
  return <button className="text-left font-medium text-ink hover:text-accent" onClick={() => go({ screen: 'player', id: p.id })}>{pname(p)}</button>;
}

export function CoachLink({ s }: { s: Staff }) {
  const go = useGame((st) => st.go);
  return <button className="text-left font-medium text-ink hover:text-accent" onClick={() => go({ screen: 'coach', id: s.id })}>{cname(s)}</button>;
}

/** REAL / FICTIONAL marker for coaches. */
export function Provenance({ s }: { s: Staff }) {
  if (s.verification.status === 'fictional') return <Badge tone="fictional" title="Generated game character — not a real person">Fictional</Badge>;
  const simulated = s.verification.notes.includes('Simulated appointment');
  return (
    <span className="inline-flex gap-1">
      <Badge tone="real" title={`Real coach · evidence: ${s.verification.status}`}>Real</Badge>
      {s.verification.status !== 'reported' && s.verification.status !== 'verified' && <Badge tone="warn">{s.verification.status}</Badge>}
      {simulated && <Badge tone="warn" title="Real coach appointed in-game because this club's real coach is unknown">Simulated job</Badge>}
    </span>
  );
}

export function PlayerSourceBadge({ p }: { p: Player }) {
  if (p.source === 'generated') return <Badge tone="fictional" title="Generated player — not a real person">Fictional</Badge>;
  if (p.source === 'imported') return <Badge tone="accent" title="User-imported data">Imported</Badge>;
  return <Badge tone="real">Verified</Badge>;
}

export function NoClub() {
  const go = useGame((s) => s.go);
  return (
    <div className="rounded-xl border border-line bg-surface p-6 text-center">
      <p className="text-sm text-muted">You are not managing a club right now.</p>
      <button className="mt-3 text-sm text-accent" onClick={() => go({ screen: 'career' })}>Open the job market →</button>
    </div>
  );
}
