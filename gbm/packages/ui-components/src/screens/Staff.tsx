import { useState } from 'react';
import type { StaffRole } from '@gbm/shared-types';
import { STAFF_ROLES } from '@gbm/shared-types';
import { staffPayroll } from '@gbm/finance-system';
import {
  AMBITION_LABEL, PERSONALITY_LABEL, PHILOSOPHY_LABEL, ROLE_LABEL, ROLE_SLOTS, changeStaffRole, clubStaff, coachRoleRating, expectedSalary,
  leagueSalaryMax, offerToStaff, searchCoaches, staffEffects, terminateStaff, terminationCost, validateStaffHire, willingness, type CoachSearchFilter,
} from '@gbm/staff-system';
import { useGame, useWorld } from '../store';
import { Badge, Button, Card, Empty, Field, RatingBar, Stat, TableWrap, inputCls, td, th } from '../components/ui';
import { CoachLink, NoClub, PageTitle, Provenance, cname, money } from './common';

const ATTR_LABEL: Record<string, string> = { offense: 'Offense', defense: 'Defense', playerDevelopment: 'Player development', shooting: 'Shooting', training: 'Training', gameManagement: 'Game management', scouting: 'Scouting', chemistry: 'Chemistry', motivation: 'Motivation', adaptability: 'Adaptability' };

export function Staff() {
  const world = useWorld();
  const club = world.clubs[world.meta.userClubId];
  const [f, setF] = useState<CoachSearchFilter>({ availability: 'all', role: null, minRating: 0 });
  const [realOnly, setRealOnly] = useState(false);
  if (!club) return <NoClub />;
  const fx = staffEffects(world, club.id);
  const staff = clubStaff(world, club.id);
  const market = searchCoaches(world, f, club.id).filter((s) => !realOnly || s.verification.status !== 'fictional').slice(0, 120);
  return (
    <div>
      <PageTitle title="Coaching staff" sub={`You are the head coach. Staff payroll ${money(world, staffPayroll(world, club.id), club.id)} of ${money(world, club.staffBudget, club.id)} budget.`} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Offense coaching" value={fx.offense} /><Stat label="Defense coaching" value={fx.defense} /><Stat label="Development" value={fx.development} /><Stat label="Scouting" value={fx.scouting} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Your staff">
          <ul className="divide-y divide-line">
            <li className="flex flex-wrap items-center gap-2 py-2 text-sm"><span className="w-44 text-muted">Head Coach</span><span className="font-medium">{world.meta.managerName} (you)</span></li>
            {STAFF_ROLES.filter((r) => r !== 'head_coach').flatMap((role) => {
              const inRole = staff.filter((s) => s.role === role);
              return Array.from({ length: ROLE_SLOTS[role] }, (_, i) => {
                const s = inRole[i];
                return (
                  <li key={`${role}${i}`} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className="w-44 text-muted">{ROLE_LABEL[role]}</span>
                    {s ? <><CoachLink s={s} /><Provenance s={s} /><span className="ml-auto text-xs text-muted">{coachRoleRating(s.attributes, role)} · {money(world, s.salary, club.id)} · to {s.contractEndSeason}</span></> : <span className="text-muted">Vacant — missing specialists are covered by you at 90%</span>}
                  </li>
                );
              });
            })}
          </ul>
        </Card>
        <Card title="Coaching market">
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Field label="Name"><input className={inputCls} value={f.text ?? ''} onChange={(e) => setF({ ...f, text: e.target.value })} /></Field>
            <Field label="Role"><select className={inputCls} value={f.role ?? ''} onChange={(e) => setF({ ...f, role: (e.target.value || null) as StaffRole | null })}><option value="">Any</option>{STAFF_ROLES.filter((r) => r !== 'head_coach').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
            <Field label="Availability"><select className={inputCls} value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value as CoachSearchFilter['availability'] })}><option value="all">All</option><option value="free">Free agents</option><option value="employed">Employed</option></select></Field>
            <Field label="League"><select className={inputCls} value={f.leagueId ?? ''} onChange={(e) => setF({ ...f, leagueId: e.target.value || null })}><option value="">All</option>{Object.values(world.leagues).map((l) => <option key={l.id} value={l.id}>{l.shortName}</option>)}</select></Field>
          </div>
          <label className="mb-2 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={realOnly} onChange={(e) => setRealOnly(e.target.checked)} /> Real coaches only</label>
          <TableWrap>
            <thead><tr>{['Coach', '', 'Current', 'Rating', 'Rep'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{market.map((s) => <tr key={s.id}><td className={td}><CoachLink s={s} /></td><td className={td}><Provenance s={s} /></td><td className={td}>{s.clubId ? `${ROLE_LABEL[s.role]}, ${world.clubs[s.clubId].shortName}` : 'Free agent'}</td><td className={td}>{coachRoleRating(s.attributes, f.role ?? s.role)}</td><td className={td}>{s.reputation}</td></tr>)}</tbody>
          </TableWrap>
          {market.length === 0 && <Empty>No coaches match.</Empty>}
        </Card>
      </div>
    </div>
  );
}

export function CoachProfile({ id }: { id: string }) {
  const world = useWorld();
  const { act, back, toast } = useGame();
  const s = world.staff[id];
  const club = world.clubs[world.meta.userClubId];
  const [role, setRole] = useState<StaffRole>(() => (s?.preferredRoles.find((r) => r !== 'head_coach') ?? 'assistant_coach'));
  const [salary, setSalary] = useState(() => (s && club ? expectedSalary(s, role, leagueSalaryMax(world, club.id)) : 0));
  const [years, setYears] = useState(2);
  if (!s) return <Empty>Coach not found.</Empty>;
  const mine = club && s.clubId === club.id;
  const history = world.staffHistory.filter((h) => h.staffId === s.id);
  const sources = s.verification.sources.map((x) => world.dataSources[x]).filter(Boolean);
  const neg = club ? world.staffNegotiations[`${mine ? 'renewal' : 'hire'}:${club.id}:${s.id}`] : undefined;
  const w = club ? willingness(world, s.id, club.id, { role: mine ? s.role : role, salary, years }, { kind: mine ? 'renewal' : 'hire' }) : null;
  const v = club ? validateStaffHire(world, club.id, s.id, { role: mine ? s.role : role, salary, years }, mine ? 'renewal' : 'hire') : null;
  return (
    <div>
      <PageTitle title={cname(s)} sub={<span className="inline-flex flex-wrap items-center gap-2"><Provenance s={s} />{s.clubId ? `${ROLE_LABEL[s.role]} · ${world.clubs[s.clubId].name}` : s.retired ? 'Retired' : 'Free agent'}</span>} actions={<Button variant="ghost" onClick={() => back()}>← Back</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Profile">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted">Nationality</span><div>{s.nationality || <span className="text-muted">Unknown (not verified)</span>}</div></div>
            <div><span className="text-muted">Born</span><div>{s.birthDate ?? <span className="text-muted">Unknown (not verified)</span>}</div></div>
            <div><span className="text-muted">Personality</span><div>{PERSONALITY_LABEL[s.personality]}</div></div>
            <div><span className="text-muted">Philosophy</span><div>{PHILOSOPHY_LABEL[s.philosophy]}</div></div>
            <div><span className="text-muted">Ambition</span><div>{AMBITION_LABEL[s.ambition]}</div></div>
            <div><span className="text-muted">Preferred roles</span><div>{s.preferredRoles.map((r) => ROLE_LABEL[r]).join(', ')}</div></div>
            <div><span className="text-muted">Reputation</span><div>{s.reputation}</div></div>
            <div><span className="text-muted">Contract</span><div>{s.clubId ? `${money(world, s.salary, s.clubId)} to ${s.contractEndSeason}` : '—'}</div></div>
          </div>
          <div className="mt-3 rounded bg-surface-2 p-2 text-xs text-muted">
            <div className="font-semibold text-ink">{s.verification.status === 'fictional' ? 'Fictional coach' : `Real coach — evidence: ${s.verification.status}`}</div>
            <p className="mt-1">{s.verification.notes}</p>
            {s.verification.missingFields.length > 0 && <p className="mt-1">Missing data: {s.verification.missingFields.join(', ')}</p>}
            {sources.map((x) => <div key={x.id}><a className="text-accent" href={x.url} target="_blank" rel="noreferrer">{x.publisher}: {x.title}</a> ({x.accessedOn})</div>)}
          </div>
        </Card>
        <Card title="Coaching skills (game ratings)">
          {Object.entries(s.attributes).map(([k, val]) => <div key={k} className="flex items-center justify-between py-0.5 text-sm"><span>{ATTR_LABEL[k]}</span><RatingBar value={val} /></div>)}
          {s.verification.status !== 'fictional' && <p className="mt-2 text-xs text-muted">Ratings for real coaches are provisional gameplay estimates, not assessments of the real person.</p>}
        </Card>
        {club && !s.retired && (
          <Card title={mine ? 'Contract & role' : 'Make an offer'}>
            {!mine && <Field label="Role offered"><select className={inputCls} value={role} onChange={(e) => { const r = e.target.value as StaffRole; setRole(r); setSalary(expectedSalary(s, r, leagueSalaryMax(world, club.id))); }}>{STAFF_ROLES.filter((r) => r !== 'head_coach').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label="Salary per year"><input className={inputCls} type="number" step={5000} value={salary} onChange={(e) => setSalary(Number(e.target.value))} /></Field>
              <Field label="Years"><select className={inputCls} value={years} onChange={(e) => setYears(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((y) => <option key={y}>{y}</option>)}</select></Field>
            </div>
            {w && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm"><span>Willingness</span><Badge tone={w.score >= 60 ? 'good' : w.score >= 40 ? 'warn' : 'bad'}>{w.score}/100</Badge></div>
                <ul className="mt-1 space-y-0.5 text-xs">{w.factors.map((x, i) => <li key={i} className="flex justify-between gap-2"><span className="text-muted">{x.label}</span><span className={x.value >= 0 ? 'text-good' : 'text-bad'}>{x.value > 0 ? '+' : ''}{x.value}</span></li>)}</ul>
                <p className="mt-1 text-xs text-muted">Expects about {money(world, w.expectedSalary, club.id)} in this role.</p>
              </div>
            )}
            {v?.errors.map((e) => <p key={e} className="mt-1 text-xs text-bad">{e}</p>)}
            {v?.warnings.map((e) => <p key={e} className="mt-1 text-xs text-warn">{e}</p>)}
            {neg?.message && <p className="mt-2 rounded bg-surface-2 p-2 text-sm">{neg.message}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" disabled={!v?.ok} onClick={() => act((wd) => {
                const r = offerToStaff(wd, club.id, s.id, { role: mine ? s.role : role, salary, years }, mine ? 'renewal' : 'hire');
                const n = r.negotiation;
                if (n.counterSalary) setSalary(n.counterSalary);
                if (n.counterYears) setYears(n.counterYears);
                if (n.counterRole) setRole(n.counterRole);
                toast(n.message, r.hired ? 'good' : 'info');
              })}>{mine ? 'Offer extension' : 'Submit offer'}</Button>
              {mine && <Button variant="danger" onClick={() => act((wd) => terminateStaff(wd, club.id, s.id), (c) => `Contract terminated (paid ${money(world, c, club.id)})`)}>Terminate ({money(world, terminationCost(world, s.id), club.id)})</Button>}
            </div>
            {mine && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Field label="Promote / demote to"><select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>{STAFF_ROLES.filter((r) => r !== 'head_coach').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
                <Button disabled={role === s.role} onClick={() => act((wd) => changeStaffRole(wd, club.id, s.id, role), (r) => (r.promoted ? 'Coach promoted' : 'Coach demoted — morale dropped'))}>Change role</Button>
              </div>
            )}
          </Card>
        )}
        <Card title="Career (this save)">
          {history.length === 0 ? <Empty>No recorded stints yet.</Empty> : (
            <TableWrap>
              <thead><tr>{['Club', 'Role', 'From', 'To', 'W-L', 'Titles', 'End'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{history.map((h) => <tr key={h.id}><td className={td}>{world.clubs[h.clubId]?.shortName}</td><td className={td}>{ROLE_LABEL[h.role]}</td><td className={td}>{h.startSeason}</td><td className={td}>{h.endSeason ?? '—'}</td><td className={td}>{h.wins}-{h.losses}</td><td className={td}>{h.titles}</td><td className={td}>{h.endReason}</td></tr>)}</tbody>
            </TableWrap>
          )}
          <p className="mt-2 text-xs text-muted">Only stints simulated in this career are listed. Real-world career history is not shown because it has not been verified.</p>
        </Card>
      </div>
    </div>
  );
}
