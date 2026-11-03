import { describe, expect, it } from 'vitest';
import { coachDataReport, coachDataReportMarkdown, loadRealDataset2026 } from '@gbm/data-import';
import { createCareer } from '../src';

describe('real-world career creation', () => {
  // No user club yet: the world as it looks on the club-selection screen.
  const world = createCareer({ careerName: 'Test', managerName: 'Tester', seed: 12345, rosterPolicy: 'placeholders' });

  it('assigns every sourced head coach to the correct real club', () => {
    const ds = loadRealDataset2026();
    for (const c of ds.coaches.filter((x) => x.assignment)) {
      const staff = Object.values(world.staff).find((s) => s.sourceRef === c.ref)!;
      const club = world.clubs[staff.clubId!];
      expect(club.sourceRef).toBe(c.assignment!.club);
      expect(staff.role).toBe(c.assignment!.role);
      expect(staff.verification.status).not.toBe('fictional');
    }
  });

  it('never invents biographical facts for real coaches', () => {
    for (const s of Object.values(world.staff)) {
      if (s.verification.status === 'fictional') continue;
      expect(s.birthDate).toBeNull();
      expect(s.nationality).toBe('');
      expect(s.verification.sources.length).toBeGreaterThan(0);
    }
  });

  it('does not assign unverified or conflicting coaches', () => {
    for (const s of Object.values(world.staff)) {
      if (['unverified', 'conflicting', 'incomplete'].includes(s.verification.status)) {
        expect(s.clubId).toBeNull();
        expect(s.marketExcluded).toBe(true);
      }
    }
  });

  it('the user replaces the real head coach of the chosen club, who joins the market', () => {
    const w = createCareer({ careerName: 'T2', managerName: 'Tester', userClubRef: 'nba:bos', seed: 5, rosterPolicy: 'placeholders' });
    const bos = w.meta.userClubId;
    const mazzulla = Object.values(w.staff).find((s) => s.sourceRef === 'coach:joe-mazzulla')!;
    expect(mazzulla.clubId).toBeNull();
    expect(mazzulla.marketExcluded).toBe(false);
    expect(mazzulla.verification.notes).toContain('Replaced in-game');
    expect(Object.values(w.staff).some((s) => s.clubId === bos && s.role === 'head_coach')).toBe(false);
  });

  it('clubs in EuroLeague also play their domestic league', () => {
    const rm = Object.values(world.clubs).find((c) => c.sourceRef === 'el:rma')!;
    expect(rm.competitionIds.map((id) => world.leagues[id].shortName)).toEqual(['EL', 'ACB']);
  });

  it('fills head-coach gaps with real unattached coaches before fictional ones', () => {
    const playable = Object.values(world.clubs).filter((c) => world.leagues[c.leagueId].active);
    for (const c of playable) expect(Object.values(world.staff).some((s) => s.clubId === c.id && s.role === 'head_coach')).toBe(true);
    const fictionalHc = Object.values(world.staff).filter((s) => s.verification.status === 'fictional' && s.clubId);
    const realFree = Object.values(world.staff).filter((s) => s.verification.status !== 'fictional' && !s.clubId && !s.marketExcluded);
    if (fictionalHc.length > 0) expect(realFree.length).toBe(0);
  });

  it('writes the coach data report', () => {
    const r = coachDataReport(world);
    expect(r.realCoaches).toBeGreaterThan(100);
    expect(coachDataReportMarkdown(r)).toContain('Real coaches imported');
    console.log(JSON.stringify({ ...r, missingOrUnverifiedAssignments: r.missingOrUnverifiedAssignments.length, sources: r.sources.length }, null, 1));
  });
});
