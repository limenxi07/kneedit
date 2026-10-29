import { buildDemoData, DEMO_PEOPLE } from '@/fake-data/FAKE_DATA_seed';
import { computeStats, sessionQueue } from '@/lib/progress';

const TODAY = '2026-10-29';

const build = () => {
  let n = 0;
  return buildDemoData({ today: TODAY, newId: () => `id-${++n}` });
};

describe('demo data', () => {
  const data = build();
  const seniorKeys = DEMO_PEOPLE.filter((p) => p.role === 'senior').map((p) => p.key);

  it('is the same every time for the same day', () => {
    expect(build()).toEqual(data);
  });

  it('uses demo-only emails', () => {
    for (const person of DEMO_PEOPLE) expect(person.defaultEmail).toMatch(/@kneedit\.test$/);
  });

  it('gives every senior a history, and leaves today free for the main demo senior', () => {
    for (const key of seniorKeys) {
      expect(data.sessions.some((s) => s.seniorKey === key)).toBe(true);
    }
    expect(data.sessions.some((s) => s.seniorKey === 'senior' && s.localDate === TODAY)).toBe(
      false,
    );
    expect(data.sessions.every((s) => s.localDate <= TODAY)).toBe(true);
  });

  it('only holds sessions that follow the programme', () => {
    for (const session of data.sessions) {
      const senior = data.seniors.find((s) => s.key === session.seniorKey)!;
      const queue = sessionQueue(senior.programme, session.localDate, 1).map((i) => i.exerciseId);
      for (const e of session.exercises) expect(queue).toContain(e.exerciseId);
      expect(session.endedAt > session.startedAt).toBe(true);
    }
  });

  it('has scores only in the sleeve range', () => {
    const scores = data.sessions.flatMap((s) => s.exercises.map((e) => e.formScore));
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...scores)).toBeLessThanOrEqual(10);
  });

  it('stores stats computed by lib/progress, flagged as sample data', () => {
    const senior = data.seniors.find((s) => s.key === 'senior')!;
    const stats = data.stats.find((s) => s.seniorKey === 'senior')!;
    const sessions = data.sessions
      .filter((s) => s.seniorKey === 'senior')
      .map((s) => ({ ...s, source: 'fake' as const }));
    expect(stats).toMatchObject(computeStats(senior.programme, sessions, TODAY));
    expect(stats.includesSampleData).toBe(true);
  });

  it('only links and befriends demo people', () => {
    const keys = new Set(DEMO_PEOPLE.map((p) => p.key));
    for (const l of data.careLinks) expect(keys.has(l.memberKey)).toBe(true);
    for (const f of data.friendships) {
      expect(keys.has(f.requesterKey) && keys.has(f.addresseeKey)).toBe(true);
    }
  });

  it('follows the copy rules in the notes it writes', () => {
    for (const note of data.caregiverNotes) {
      expect(note.body).not.toMatch(/[—⸺⸻·・]/);
      expect(note.body).not.toMatch(/\b(he|she|him|her|his|hers)\b/i);
    }
  });
});
