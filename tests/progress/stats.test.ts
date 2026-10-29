import { completionRate, countedSessions, type SessionRecord } from '@/lib/progress/counting';
import { myRank, sortLeaderboard, type LeaderboardEntry } from '@/lib/progress/leaderboard';
import type { PlanItem, Programme } from '@/lib/progress/schedule';
import { computeStats } from '@/lib/progress/stats';

const daily: PlanItem = {
  exerciseId: 'quad-sets',
  position: 1,
  reps: 10,
  frequency: 'daily',
  weekday: null,
};

const everyDay: Programme = { startDate: '2026-09-01', defaultRoutine: [daily], prescriptions: [] };

let nextId = 0;
const session = (localDate: string, extra: Partial<SessionRecord> = {}): SessionRecord => ({
  id: `s${++nextId}`,
  localDate,
  status: 'complete',
  endedAt: `${localDate}T02:00:00Z`,
  source: 'manual',
  ...extra,
});

// Wednesday 28 October 2026. The week began on Monday the 26th.
const WEDNESDAY = '2026-10-28';

describe('counting sessions', () => {
  it('counts complete sessions up to the number prescribed, in the order they ended', () => {
    const late = session('2026-10-27', { endedAt: '2026-10-27T10:00:00Z' });
    const early = session('2026-10-27', { endedAt: '2026-10-27T01:00:00Z' });
    const unfinished = session('2026-10-27', { status: 'incomplete' });
    expect(countedSessions([late, unfinished, early], 1)).toEqual([early]);
    expect(countedSessions([late, unfinished, early], 2)).toEqual([early, late]);
    expect(countedSessions([late], 0)).toEqual([]);
  });

  it('rounds the rate to a whole percentage', () => {
    expect(completionRate(3, 7)).toBe(43);
    expect(completionRate(0, 0)).toBe(0);
    expect(completionRate(9, 7)).toBe(100);
  });
});

describe('weekly numbers', () => {
  it('on a perfect Wednesday, the most you can have is 3 of 7, which is 43%', () => {
    const stats = computeStats(
      everyDay,
      [session('2026-10-26'), session('2026-10-27'), session(WEDNESDAY)],
      WEDNESDAY,
    );
    expect(stats).toMatchObject({
      weekStart: '2026-10-26',
      weekDone: 3,
      weekPrescribed: 7,
      weekRate: 43,
      missedDaysThisWeek: 0,
      includesSampleData: false,
    });
  });

  it('never counts extra sessions or today as missed', () => {
    const stats = computeStats(
      everyDay,
      [session('2026-10-26'), session('2026-10-26'), session('2026-10-26')],
      WEDNESDAY,
    );
    expect(stats.weekDone).toBe(1);
    expect(stats.missedDaysThisWeek).toBe(1); // Tuesday; Wednesday is today
  });

  it('counts sessions this calendar month', () => {
    const stats = computeStats(
      everyDay,
      [session('2026-09-30'), session('2026-10-01'), session('2026-10-15'), session(WEDNESDAY)],
      WEDNESDAY,
    );
    expect(stats.monthSessions).toBe(3);
  });

  it('flags sample data', () => {
    expect(
      computeStats(everyDay, [session(WEDNESDAY, { source: 'fake' })], WEDNESDAY),
    ).toMatchObject({ includesSampleData: true });
  });
});

describe('streak', () => {
  it('counts back from yesterday, and adds today once it is done', () => {
    const sessions = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'].map((d) =>
      session(d),
    );
    expect(computeStats(everyDay, sessions, WEDNESDAY).streak).toBe(4);
    expect(computeStats(everyDay, [...sessions, session(WEDNESDAY)], WEDNESDAY).streak).toBe(5);
  });

  it('is kept while today is not done yet, and broken by a missed day', () => {
    const sessions = [session('2026-10-24'), session('2026-10-26'), session('2026-10-27')];
    expect(computeStats(everyDay, sessions, WEDNESDAY).streak).toBe(2);
    expect(computeStats(everyDay, [session('2026-10-26')], WEDNESDAY).streak).toBe(0);
  });

  it('skips rest days', () => {
    const alternate: Programme = {
      startDate: '2026-10-20',
      defaultRoutine: [{ ...daily, frequency: 'alternate_days' }],
      prescriptions: [],
    };
    // Prescribed on the 20th, 22nd, 24th, 26th and 28th.
    const sessions = ['2026-10-22', '2026-10-24', '2026-10-26'].map((d) => session(d));
    expect(computeStats(alternate, sessions, WEDNESDAY).streak).toBe(3);
    expect(computeStats(alternate, sessions, '2026-10-27').streak).toBe(3);
  });

  it('needs one counted session a day, even on two-session days', () => {
    const twice: Programme = {
      startDate: '2026-10-20',
      defaultRoutine: [{ ...daily, frequency: 'twice_daily' }],
      prescriptions: [],
    };
    const stats = computeStats(twice, [session('2026-10-26'), session('2026-10-27')], WEDNESDAY);
    expect(stats.streak).toBe(2);
    expect(stats.weekPrescribed).toBe(14);
    // Both days had one of two sessions: each is a missed day.
    expect(stats.missedDaysThisWeek).toBe(2);
  });
});

describe('missed days in a row', () => {
  it('counts back from yesterday over prescribed days', () => {
    expect(computeStats(everyDay, [session('2026-10-24')], WEDNESDAY).consecutiveMissedDays).toBe(
      3,
    );
    expect(computeStats(everyDay, [session('2026-10-27')], WEDNESDAY).consecutiveMissedDays).toBe(
      0,
    );
  });

  it('stops at the start of the programme', () => {
    const fresh: Programme = { ...everyDay, startDate: '2026-10-27' };
    expect(computeStats(fresh, [], WEDNESDAY).consecutiveMissedDays).toBe(1);
  });
});

describe('leaderboard', () => {
  const entry = (
    seniorId: string,
    displayName: string,
    weekRate: number,
    streak: number,
    isMe = false,
  ): LeaderboardEntry => ({
    seniorId,
    displayName,
    weekRate,
    streak,
    isMe,
    includesSampleData: false,
  });

  it('sorts by rate, then streak, then name, then id', () => {
    const board = [
      entry('d', 'Ah Kow', 43, 2),
      entry('c', 'Bee Lian', 43, 5),
      entry('b', 'Ah Kow', 43, 2),
      entry('a', 'Siti', 86, 1, true),
      entry('e', 'Ah Hock', 43, 2),
    ];
    expect(sortLeaderboard(board).map((e) => e.seniorId)).toEqual(['a', 'c', 'e', 'b', 'd']);
    expect(myRank(board)).toBe(1);
    expect(myRank(board.filter((e) => !e.isMe))).toBeNull();
  });
});
