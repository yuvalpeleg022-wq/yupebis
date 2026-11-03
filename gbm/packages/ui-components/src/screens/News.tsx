import { useState } from 'react';
import type { NewsType } from '@gbm/shared-types';
import { useGame, useWorld } from '../store';
import { Badge, Button, Card, Empty, inputCls } from '../components/ui';
import { PageTitle } from './common';

export function News() {
  const world = useWorld();
  const act = useGame((s) => s.act);
  const [scope, setScope] = useState<'mine' | 'important' | 'all'>('mine');
  const [type, setType] = useState<NewsType | ''>('');
  const [open, setOpen] = useState<string | null>(null);
  const list = [...world.news].reverse().filter((n) => (scope === 'all' || (scope === 'important' ? n.important : n.clubId === world.meta.userClubId || n.important)) && (!type || n.type === type)).slice(0, 200);
  const types = [...new Set(world.news.map((n) => n.type))];
  return (
    <div>
      <PageTitle title="News" sub="Every item is generated from an event that happened in this career." actions={
        <div className="flex flex-wrap gap-2">
          <select className={inputCls + ' w-auto'} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} aria-label="Scope"><option value="mine">My club</option><option value="important">Important</option><option value="all">Everything</option></select>
          <select className={inputCls + ' w-auto'} value={type} onChange={(e) => setType(e.target.value as NewsType | '')} aria-label="Type"><option value="">All types</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
          <Button onClick={() => act((w) => w.news.forEach((n) => (n.read = true)), 'All marked as read')}>Mark all read</Button>
        </div>} />
      <Card>
        {list.length === 0 ? <Empty>No news.</Empty> : (
          <ul className="divide-y divide-line">
            {list.map((n) => (
              <li key={n.id} className="py-2">
                <button className="flex w-full items-start gap-2 text-left" onClick={() => { setOpen(open === n.id ? null : n.id); if (!n.read) act((w) => { const x = w.news.find((y) => y.id === n.id); if (x) x.read = true; }); }}>
                  <span className="tabular w-20 shrink-0 text-xs text-muted">{n.date}</span>
                  <span className={`flex-1 text-sm ${n.read ? 'text-muted' : 'font-medium'}`}>{n.title}</span>
                  <Badge tone={n.important ? 'warn' : 'neutral'}>{n.type}</Badge>
                </button>
                {open === n.id && <p className="mt-1 pl-22 text-sm text-ink sm:pl-[5.5rem]">{n.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">The full News Center (journalists, rumours with credibility, following clubs, press conferences, saved articles) is in development.</p>
    </div>
  );
}
