import { useState } from 'react';
import type { Position } from '@gbm/shared-types';
import { playerOverall } from '@gbm/player-system';
import { payroll } from '@gbm/finance-system';
import { clubRules, freeAgents, playerAsk } from '@gbm/transfer-system';
import { useWorld } from '../store';
import { Card, Field, InDevelopment, OvrPill, Stat, TableWrap, inputCls, td, th } from '../components/ui';
import { NoClub, PageTitle, PlayerLink, age, money } from './common';
import { Negotiation } from './Squad';

export function Transfers() {
  const world = useWorld();
  const clubId = world.meta.userClubId;
  const [pos, setPos] = useState<Position | ''>('');
  const [minOvr, setMinOvr] = useState(0);
  const [maxAge, setMaxAge] = useState(40);
  const [text, setText] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const club = world.clubs[clubId];
  if (!club) return <NoClub />;
  const { rules } = clubRules(world, clubId);
  const pay = payroll(world, clubId, world.meta.phase === 'offseason' ? world.meta.season + 1 : world.meta.season);
  const list = freeAgents(world)
    .filter((p) => (!pos || p.position === pos) && playerOverall(p) >= minOvr && age(world, p) <= maxAge && `${p.firstName} ${p.lastName}`.toLowerCase().includes(text.toLowerCase()))
    .sort((a, b) => playerOverall(b) - playerOverall(a))
    .slice(0, 150);
  return (
    <div>
      <PageTitle title="Transfers" sub="Free-agent market. Every signing is validated against roster limits, salary cap or wage budget, and cash." />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Payroll" value={money(world, pay, clubId)} />
        <Stat label={rules.salaryCap.type === 'none' ? 'Wage budget' : `Salary cap (${rules.salaryCap.type})`} value={money(world, rules.salaryCap.type === 'none' ? club.wageBudget : rules.salaryCap.cap, clubId)} />
        <Stat label="Cash" value={money(world, club.cash, clubId)} />
        <Stat label="Free agents" value={freeAgents(world).length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card title="Search free agents">
          <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <Field label="Name"><input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} /></Field>
            <Field label="Position"><select className={inputCls} value={pos} onChange={(e) => setPos(e.target.value as Position | '')}><option value="">All</option>{['PG', 'SG', 'SF', 'PF', 'C'].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label={`Min overall ${minOvr}`}><input type="range" min={0} max={90} value={minOvr} onChange={(e) => setMinOvr(Number(e.target.value))} /></Field>
            <Field label={`Max age ${maxAge}`}><input type="range" min={18} max={40} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} /></Field>
          </div>
          <TableWrap>
            <thead><tr>{['Name', 'Pos', 'Age', 'OVR', 'Asking', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id} className={sel === p.id ? 'bg-accent/10' : 'hover:bg-surface-2'}>
                <td className={td}><PlayerLink p={p} /></td><td className={td}>{p.position}</td><td className={td}>{age(world, p)}</td><td className={td}><OvrPill value={playerOverall(p)} /></td>
                <td className={td}>{money(world, playerAsk(world, p, club, 'free_agent'), clubId)}</td>
                <td className={td}><button className="text-accent" onClick={() => setSel(p.id)} data-testid="negotiate">Negotiate</button></td>
              </tr>
            ))}</tbody>
          </TableWrap>
        </Card>
        <div className="space-y-4">
          {sel ? <Negotiation key={sel} playerId={sel} kind="free_agent" /> : <Card title="Negotiation"><p className="text-sm text-muted">Select a free agent to make an offer.</p></Card>}
          <InDevelopment feature="Trades, paid transfers, loans & buyouts" detail="Trade evaluation, salary matching, draft picks and European transfer fees are planned (Phase 4–5). They are not available yet." />
        </div>
      </div>
    </div>
  );
}
