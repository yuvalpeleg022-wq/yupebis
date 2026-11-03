import { useEffect, useState, type ReactNode } from 'react';
import { seasonLabel } from '@gbm/shared-types';
import { EXPERIENCE_PROFILES, type ManagerExperience } from '@gbm/game-engine';
import { useGame, type ScreenId } from './store';
import type { PlatformServices } from './platform';
import { Button, Card, Field, cn, inputCls } from './components/ui';
import { ClubSelect } from './screens/ClubSelect';
import { Dashboard } from './screens/Dashboard';
import { Squad, PlayerProfile } from './screens/Squad';
import { Tactics } from './screens/Tactics';
import { Training } from './screens/Training';
import { Transfers } from './screens/Transfers';
import { Scouting } from './screens/Scouting';
import { Competitions } from './screens/Competitions';
import { Schedule } from './screens/Schedule';
import { MatchCenter } from './screens/MatchCenter';
import { Finances } from './screens/Finances';
import { Staff, CoachProfile } from './screens/Staff';
import { Statistics } from './screens/Statistics';
import { Career } from './screens/Career';
import { News } from './screens/News';
import { DataSources } from './screens/DataSources';
import { Settings } from './screens/Settings';
import { MyClub } from './screens/MyClub';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: string;
  needsClub: boolean;
}

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◧', needsClub: false },
  { id: 'club', label: 'My Club', icon: '⌂', needsClub: true },
  { id: 'squad', label: 'Squad', icon: '☰', needsClub: true },
  { id: 'tactics', label: 'Tactics', icon: '◎', needsClub: true },
  { id: 'training', label: 'Training', icon: '↗', needsClub: true },
  { id: 'transfers', label: 'Transfers', icon: '⇄', needsClub: true },
  { id: 'scouting', label: 'Scouting', icon: '⌕', needsClub: true },
  { id: 'competitions', label: 'Competitions', icon: '♜', needsClub: false },
  { id: 'schedule', label: 'Schedule', icon: '▦', needsClub: true },
  { id: 'match', label: 'Match Center', icon: '▶', needsClub: false },
  { id: 'finances', label: 'Finances', icon: '$', needsClub: true },
  { id: 'staff', label: 'Staff', icon: '♟', needsClub: true },
  { id: 'stats', label: 'Statistics', icon: '∑', needsClub: false },
  { id: 'news', label: 'News', icon: '✉', needsClub: false },
  { id: 'career', label: 'Career History', icon: '★', needsClub: false },
  { id: 'data', label: 'Data Sources', icon: 'ⓘ', needsClub: false },
  { id: 'settings', label: 'Settings', icon: '⚙', needsClub: false },
];

const MOBILE_PRIMARY: ScreenId[] = ['dashboard', 'squad', 'schedule', 'news'];

export function GameApp({ platform }: { platform: PlatformServices }) {
  const { booted, bootError, world, busy, boot } = useGame();
  useEffect(() => {
    void boot(platform);
  }, [boot, platform]);
  if (!booted) return <Splash text="Starting…" />;
  if (bootError) return <Splash text={`Could not start the database: ${bootError}`} />;
  return (
    <>
      {!world ? <StartScreen /> : !world.meta.userClubId && world.managerHistory.length === 0 ? <ClubSelect initial /> : <Shell />}
      {busy && <BusyOverlay label={busy.label} progress={busy.progress} />}
      <Toasts />
    </>
  );
}

function Splash({ text }: { text: string }) {
  return (
    <div className="flex min-h-full items-center justify-center p-6 text-center">
      <div>
        <Logo />
        <p className="mt-4 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div>
      <div className="text-2xl font-black tracking-tight">GLOBAL BASKETBALL <span className="text-accent">MANAGER</span></div>
      <div className="text-xs uppercase tracking-[0.3em] text-muted">One World. Every League. Your Legacy.</div>
    </div>
  );
}

function StartScreen() {
  const { careers, loadCareer, newCareer, saves, refreshCareers, importSaveFile } = useGame();
  const [careerName, setCareerName] = useState('My Career');
  const [managerName, setManagerName] = useState('');
  const [experience, setExperience] = useState<ManagerExperience>('professional');
  const [policy, setPolicy] = useState<'when_needed' | 'never'>('when_needed');
  const [rosterPolicy, setRosterPolicy] = useState<'real_only' | 'placeholders'>('real_only');
  const [playerDataset, setPlayerDataset] = useState<unknown>(undefined);
  const [datasetInfo, setDatasetInfo] = useState('');
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-8">
      <Logo />
      <Card title="New career">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!managerName.trim()) return;
            void newCareer({ careerName: careerName.trim() || 'Career', managerName: managerName.trim(), experience, fictionalCoachPolicy: policy, rosterPolicy, playerDataset });
          }}
        >
          <Field label="Your name (head coach)">
            <input className={inputCls} value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="e.g. Alex Morgan" required data-testid="manager-name" />
          </Field>
          <Field label="Career name">
            <input className={inputCls} value={careerName} onChange={(e) => setCareerName(e.target.value)} />
          </Field>
          <Field label="Coaching background">
            <select className={inputCls} value={experience} onChange={(e) => setExperience(e.target.value as ManagerExperience)}>
              {Object.entries(EXPERIENCE_PROFILES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Fictional coaches">
            <select className={inputCls} value={policy} onChange={(e) => setPolicy(e.target.value as 'when_needed' | 'never')}>
              <option value="when_needed">Only when no real coach is available</option>
              <option value="never">Never (real coaches only)</option>
            </select>
          </Field>
          <Field label="Player rosters">
            <select className={inputCls} value={rosterPolicy} onChange={(e) => setRosterPolicy(e.target.value as 'real_only' | 'placeholders')} data-testid="roster-policy">
              <option value="real_only">Real players only (clubs without real rosters are not simulated)</option>
              <option value="placeholders">Allow labelled fictional placeholders where real rosters are missing</option>
            </select>
          </Field>
          <Field label="Real player dataset (JSON, optional)">
            <input type="file" accept=".json" className="text-xs" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const j = JSON.parse(await f.text());
                setPlayerDataset(j);
                setDatasetInfo(`${(j.players ?? []).length} players, ${(j.sources ?? []).length} sources loaded — validated on create.`);
              } catch (err) {
                setDatasetInfo(`Invalid JSON: ${(err as Error).message}`);
              }
            }} />
            {datasetInfo && <span className="text-xs text-ink">{datasetInfo}</span>}
          </Field>
          <p className="text-xs text-muted sm:col-span-2">
            Season {seasonLabel(2026)} world: real clubs and coaches researched on 2026-11-03 (see Data Sources). The built-in dataset contains
            no verified player rosters yet, so with “real players only” no competition can be simulated until you import a verified
            player dataset (format: <code>{'{ sources: [...], players: [...] }'}</code>, see DATA_SOURCES.md). Placeholders are clearly marked FICTIONAL.
          </p>
          <div className="sm:col-span-2"><Button variant="primary" type="submit" data-testid="create-career">Create world &amp; choose club</Button></div>
        </form>
      </Card>
      <Card title="Continue a career" actions={<Button variant="ghost" onClick={() => void refreshCareers()}>Refresh</Button>}>
        {careers.length === 0 ? (
          <p className="text-sm text-muted">No saved careers on this device ({saves ? 'storage ready' : 'storage unavailable'}).</p>
        ) : (
          <ul className="divide-y divide-line">
            {careers.map((c) => (
              <li key={c.careerId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.careerName}</div>
                  <div className="text-xs text-muted">{c.managerName} · {c.currentDate} · {c.slot} save</div>
                </div>
                <Button variant="primary" onClick={() => void loadCareer(c.careerId)} data-testid="continue-career">Continue</Button>
              </li>
            ))}
          </ul>
        )}
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
          Import a .gbm save file
          <input type="file" accept=".gbm,application/octet-stream" className="text-xs" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await importSaveFile(new Uint8Array(await f.arrayBuffer()));
          }} />
        </label>
      </Card>
    </div>
  );
}

function Shell() {
  const { world, route, go, advance, busy } = useGame();
  useGame((s) => s.version);
  const [more, setMore] = useState(false);
  if (!world) return null;
  const club = world.clubs[world.meta.userClubId];
  const items = NAV.filter((n) => club || !n.needsClub);
  const unread = world.news.filter((n) => !n.read && (n.clubId === world.meta.userClubId || n.important)).length;
  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-4 py-3">
          <div className="text-sm font-black tracking-tight">GBM</div>
          <div className="truncate text-xs text-muted">{club ? club.name : 'Between jobs'}</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((n) => (
            <button key={n.id} onClick={() => go({ screen: n.id })} className={cn('flex w-full items-center gap-3 px-4 py-2 text-left text-sm', route.screen === n.id ? 'bg-accent/15 text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
              <span className="w-4 text-center">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {n.id === 'news' && unread > 0 && <span className="rounded bg-accent px-1.5 text-[10px] text-white">{unread}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{club ? club.name : `${world.meta.managerName} — unemployed`}</div>
              <div className="tabular text-xs text-muted">{world.meta.currentDate} · {seasonLabel(world.meta.season)} · {world.meta.phase}</div>
            </div>
            <div className="flex gap-1.5">
              <Button variant="primary" disabled={!!busy} onClick={() => void advance(club ? 'next_game' : 'week')} data-testid="advance-next">
                {club ? 'Next game ▸' : 'Next week ▸'}
              </Button>
              <AdvanceMenu />
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 lg:pb-8">
          <Screen />
        </main>
        {/* Mobile bottom navigation */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface lg:hidden">
          {MOBILE_PRIMARY.map((id) => {
            const n = NAV.find((x) => x.id === id)!;
            const allowed = club || !n.needsClub;
            return (
              <button key={id} disabled={!allowed} onClick={() => { setMore(false); go({ screen: id }); }} className={cn('flex min-h-14 flex-col items-center justify-center text-[11px] disabled:opacity-30', route.screen === id && !more ? 'text-accent' : 'text-muted')}>
                <span className="text-base">{n.icon}</span>{n.label}
              </button>
            );
          })}
          <button onClick={() => setMore(!more)} className={cn('flex min-h-14 flex-col items-center justify-center text-[11px]', more ? 'text-accent' : 'text-muted')} data-testid="more-menu">
            <span className="text-base">⋯</span>More
          </button>
        </nav>
        {more && (
          <div className="fixed inset-x-0 bottom-14 z-30 max-h-[70vh] overflow-y-auto border-t border-line bg-surface p-3 lg:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="grid grid-cols-3 gap-2">
              {items.filter((n) => !MOBILE_PRIMARY.includes(n.id)).map((n) => (
                <button key={n.id} onClick={() => { setMore(false); go({ screen: n.id }); }} className="flex min-h-16 flex-col items-center justify-center rounded-lg bg-surface-2 text-xs text-ink">
                  <span className="text-lg">{n.icon}</span>{n.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdvanceMenu() {
  const { advance, busy } = useGame();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button disabled={!!busy} onClick={() => setOpen(!open)} aria-label="More advance options">▾</Button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-44 rounded-lg border border-line bg-surface p-1 shadow-xl">
          {([['day', 'Advance one day'], ['week', 'Advance one week'], ['month', 'To end of month'], ['next_game', 'To next game']] as const).map(([m, l]) => (
            <button key={m} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => { setOpen(false); void advance(m); }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Screen() {
  const { route } = useGame();
  const screens: Record<ScreenId, () => ReactNode> = {
    dashboard: () => <Dashboard />,
    club: () => <MyClub />,
    squad: () => <Squad />,
    player: () => <PlayerProfile id={route.id!} />,
    tactics: () => <Tactics />,
    training: () => <Training />,
    transfers: () => <Transfers />,
    scouting: () => <Scouting />,
    competitions: () => <Competitions />,
    schedule: () => <Schedule />,
    match: () => <MatchCenter id={route.id} />,
    finances: () => <Finances />,
    staff: () => <Staff />,
    coach: () => <CoachProfile id={route.id!} />,
    stats: () => <Statistics />,
    career: () => <Career />,
    news: () => <News />,
    data: () => <DataSources />,
    settings: () => <Settings />,
  };
  return <>{screens[route.screen]()}</>;
}

function BusyOverlay({ label, progress }: { label: string; progress: number }) {
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="h-1 bg-accent transition-all" style={{ width: `${Math.max(5, progress * 100)}%` }} />
      <div className="mx-auto mt-2 w-fit rounded-full bg-surface-2 px-3 py-1 text-xs text-muted shadow">{label}</div>
    </div>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={cn('pointer-events-auto max-w-md rounded-lg px-4 py-2 text-sm shadow-lg', t.tone === 'good' ? 'bg-good/90 text-white' : t.tone === 'bad' ? 'bg-bad/90 text-white' : 'bg-surface-2 text-ink')}>{t.text}</div>
      ))}
    </div>
  );
}
