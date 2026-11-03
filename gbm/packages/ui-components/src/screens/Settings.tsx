import { useState } from 'react';
import { useGame, useWorld } from '../store';
import { Button, Card, Field, inputCls } from '../components/ui';
import { PageTitle } from './common';

export function Settings() {
  const world = useWorld();
  const { save, lastSaved, platform, exportSaveFile, closeCareer, act, saves } = useGame();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div>
      <PageTitle title="Settings" sub={`Career “${world.meta.careerName}” · ${world.meta.careerId}`} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Saves">
          <p className="text-sm">Last saved: {lastSaved ?? 'never'} · storage: {platform?.storage.name}</p>
          <p className="mt-1 text-xs text-muted">Autosave runs every 7 game days and when the app is closed or backgrounded. Each manual save keeps the previous one as a backup for crash recovery.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void save()} data-testid="save-now">Save now</Button>
            <Button onClick={() => {
              const bytes = exportSaveFile();
              if (!bytes) return;
              const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }));
              const a = document.createElement('a');
              a.href = url; a.download = `${world.meta.careerName.replace(/\W+/g, '_')}.gbm`; a.click();
              URL.revokeObjectURL(url);
            }}>Export save file</Button>
            <Button onClick={() => void closeCareer()} data-testid="close-career">Save &amp; exit to menu</Button>
          </div>
        </Card>
        <Card title="Cloud synchronization">
          <p className="text-sm text-muted">{platform?.cloudSync.reason}</p>
        </Card>
        <Card title="Coaching market">
          <Field label="Fictional coaches">
            <select className={inputCls} value={world.meta.fictionalCoachPolicy} onChange={(e) => act((w) => { w.meta.fictionalCoachPolicy = e.target.value as 'when_needed' | 'never'; })}>
              <option value="when_needed">Only when no real coach is available</option>
              <option value="never">Never</option>
            </select>
          </Field>
        </Card>
        <Card title="Danger zone">
          {!confirmDelete ? <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete this career…</Button> : (
            <div className="flex gap-2"><Button variant="danger" onClick={async () => { await saves?.delete(world.meta.careerId); setConfirmDelete(false); await closeCareer(); await saves?.delete(world.meta.careerId); }}>Delete permanently</Button><Button onClick={() => setConfirmDelete(false)}>Cancel</Button></div>
          )}
        </Card>
        <Card title="About">
          <p className="text-sm">Platform: {platform?.label}. Same engine and save format on Windows, Android and browser.</p>
        </Card>
      </div>
    </div>
  );
}
