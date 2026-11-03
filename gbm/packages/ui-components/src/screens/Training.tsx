import type { TrainingFocus } from '@gbm/shared-types';
import { TRAINING_FOCUS_ATTRS, TRAINING_FOCUS_LABEL } from '@gbm/player-system';
import { staffEffects } from '@gbm/staff-system';
import { useGame, useWorld } from '../store';
import { Card, Stat, cn } from '../components/ui';
import { NoClub, PageTitle } from './common';

const DESC: Record<TrainingFocus, string> = {
  balanced: 'Even development across all skills.',
  shooting: 'Faster growth in three-point, mid-range and free-throw shooting.',
  ball_handling: 'Ball handling, agility and offensive IQ.',
  strength: 'Strength, vertical and finishing inside.',
  conditioning: 'Stamina, speed and acceleration.',
  defense: 'Perimeter, interior and help defense, steals and blocks.',
  playmaking: 'Passing, ball handling and basketball IQ.',
  recovery: 'Faster fatigue recovery; slows physical decline of veterans.',
  youth: 'Extra development for players aged 23 or younger.',
};

export function Training() {
  const world = useWorld();
  const act = useGame((s) => s.act);
  const club = world.clubs[world.meta.userClubId];
  if (!club) return <NoClub />;
  const fx = staffEffects(world, club.id);
  return (
    <div>
      <PageTitle title="Training" sub="Development is applied monthly; it depends on age, potential, work ethic, minutes, coaching and this focus." />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Development coaching" value={fx.development} />
        <Stat label="Shooting coaching" value={fx.shooting} />
        <Stat label="Training quality" value={fx.training} />
        <Stat label="Chemistry" value={fx.chemistry} />
      </div>
      <Card title="Team training focus">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(TRAINING_FOCUS_LABEL) as TrainingFocus[]).map((f) => (
            <button key={f} onClick={() => act((w) => { w.clubs[club.id].trainingFocus = f; }, `Training focus: ${TRAINING_FOCUS_LABEL[f]}`)} className={cn('rounded-lg border p-3 text-left', club.trainingFocus === f ? 'border-accent bg-accent/10' : 'border-line bg-surface-2 hover:border-muted')}>
              <div className="font-medium">{TRAINING_FOCUS_LABEL[f]}</div>
              <div className="mt-1 text-xs text-muted">{DESC[f]}</div>
              {TRAINING_FOCUS_ATTRS[f].length > 0 && <div className="mt-1 text-[11px] text-muted">Boosts: {TRAINING_FOCUS_ATTRS[f].join(', ')}</div>}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Individual player training plans are in development.</p>
      </Card>
    </div>
  );
}
