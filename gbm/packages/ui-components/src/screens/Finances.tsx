import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FINANCE_CATEGORY_LABEL, payroll, seasonFinanceSummary, staffPayroll } from '@gbm/finance-system';
import { useGame, useWorld } from '../store';
import { Button, Card, Field, Stat, TableWrap, inputCls, td, th } from '../components/ui';
import { NoClub, PageTitle, money } from './common';

export function Finances() {
  const world = useWorld();
  const act = useGame((s) => s.act);
  const club = world.clubs[world.meta.userClubId];
  const [price, setPrice] = useState(club?.ticketPrice ?? 0);
  if (!club) return <NoClub />;
  const sum = seasonFinanceSummary(world, club.id, world.meta.season);
  const tx = world.finances.filter((t) => t.clubId === club.id && t.season === world.meta.season);
  const byMonth = new Map<string, { month: string; income: number; expenses: number }>();
  for (const t of tx) {
    const k = t.date.slice(0, 7);
    const r = byMonth.get(k) ?? { month: k, income: 0, expenses: 0 };
    if (t.amount >= 0) r.income += t.amount / 1e6; else r.expenses += -t.amount / 1e6;
    byMonth.set(k, r);
  }
  const chart = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).map((r) => ({ ...r, income: Number(r.income.toFixed(2)), expenses: Number(r.expenses.toFixed(2)) }));
  return (
    <div>
      <PageTitle title="Finances" sub="All amounts are in-game values calculated from actual transactions this season." />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Cash balance" value={money(world, club.cash, club.id)} />
        <Stat label="Season net" value={money(world, sum.net, club.id)} sub={`${money(world, sum.totalIncome, club.id)} in / ${money(world, sum.totalExpenses, club.id)} out`} />
        <Stat label="Player payroll" value={money(world, payroll(world, club.id, world.meta.season), club.id)} sub={`Budget ${money(world, club.wageBudget, club.id)}`} />
        <Stat label="Staff payroll" value={money(world, staffPayroll(world, club.id), club.id)} sub={`Budget ${money(world, club.staffBudget, club.id)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Monthly cash flow (millions)">
          {chart.length === 0 ? <p className="text-sm text-muted">No transactions yet this season.</p> : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={chart}>
                  <CartesianGrid stroke="#22314f" vertical={false} />
                  <XAxis dataKey="month" stroke="#8a9ab8" fontSize={11} />
                  <YAxis stroke="#8a9ab8" fontSize={11} width={40} />
                  <Tooltip contentStyle={{ background: '#16223a', border: '1px solid #22314f' }} />
                  <Legend />
                  <Bar dataKey="income" fill="#22c3a6" name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Season breakdown">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="mb-1 text-xs uppercase text-muted">Income</div>{Object.entries(sum.income).map(([k, v]) => <div key={k} className="flex justify-between"><span>{FINANCE_CATEGORY_LABEL[k as keyof typeof FINANCE_CATEGORY_LABEL]}</span><span className="tabular">{money(world, v, club.id)}</span></div>)}</div>
            <div><div className="mb-1 text-xs uppercase text-muted">Expenses</div>{Object.entries(sum.expenses).map(([k, v]) => <div key={k} className="flex justify-between"><span>{FINANCE_CATEGORY_LABEL[k as keyof typeof FINANCE_CATEGORY_LABEL]}</span><span className="tabular">{money(world, v, club.id)}</span></div>)}</div>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <Field label="Ticket price"><input className={inputCls} type="number" min={1} max={500} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></Field>
            <Button onClick={() => act((w) => { if (price < 1 || price > 500) throw new Error('Ticket price must be between 1 and 500.'); w.clubs[club.id].ticketPrice = Math.round(price); }, 'Ticket price updated')}>Set</Button>
          </div>
          <p className="mt-1 text-xs text-muted">Higher prices raise revenue per fan but reduce attendance.</p>
        </Card>
      </div>
      <div className="mt-4">
        <Card title="Transactions">
          <TableWrap>
            <thead><tr>{['Date', 'Category', 'Description', 'Amount'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>{[...tx].reverse().slice(0, 200).map((t) => <tr key={t.id}><td className={td}>{t.date}</td><td className={td}>{FINANCE_CATEGORY_LABEL[t.category]}</td><td className={td}>{t.description}</td><td className={td + (t.amount >= 0 ? ' text-good' : ' text-bad')}>{money(world, t.amount, club.id)}</td></tr>)}</tbody>
          </TableWrap>
        </Card>
      </div>
    </div>
  );
}
