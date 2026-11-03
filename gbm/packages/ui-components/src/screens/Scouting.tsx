import { useState } from 'react';
import { playerOverall, scoutPotential } from '@gbm/player-system';
import { staffEffects } from '@gbm/staff-system';
import { useWorld } from '../store';
import { Card, InDevelopment, OvrPill, Stat, TableWrap, td, th } from '../components/ui';
import { NoClub, PageTitle, PlayerLink, age, sortAge } from './common';

export function Scouting() {
  const world = useWorld();
  const [maxAge, setMaxAge] = useState(22);
  const clubId = world.meta.userClubId;
  if (!world.clubs[clubId]) return <NoClub />;
  const scout = staffEffects(world, clubId).scouting;
  const prospects = Object.values(world.players)
    .filter((p) => !p.retired && p.clubId !== clubId && sortAge(world, p) <= maxAge)
    .map((p) => ({ p, est: scoutPotential(p, clubId, scout, false) }))
    .sort((a, b) => b.est.estimate - a.est.estimate)
    .slice(0, 60);
  return (
    <div>
      <PageTitle title="Scouting" sub="Potential is never shown exactly for other clubs' players: estimates depend on your staff's scouting quality." />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3"><Stat label="Scouting quality" value={scout} sub="from coaching staff" /><Stat label="Prospects shown" value={prospects.length} /></div>
      <Card title="Young prospects (estimated potential)" actions={<label className="text-xs text-muted">Max age {maxAge} <input type="range" min={18} max={25} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} /></label>}>
        <TableWrap>
          <thead><tr>{['Name', 'Club', 'Pos', 'Age', 'OVR', 'Potential (est.)'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>{prospects.map(({ p, est }) => <tr key={p.id}><td className={td}><PlayerLink p={p} /></td><td className={td}>{p.clubId ? world.clubs[p.clubId].shortName : 'FA'}</td><td className={td}>{p.position}</td><td className={td}>{age(world, p)}</td><td className={td}><OvrPill value={playerOverall(p)} /></td><td className={td}>{est.low}–{est.high}</td></tr>)}</tbody>
        </TableWrap>
      </Card>
      <div className="mt-4"><InDevelopment feature="Scouting assignments & reports" detail="Sending scouts to leagues and saving written reports is planned; the scouting_reports table already exists in the save format." /></div>
    </div>
  );
}
