import type { SessionRecord } from '@/lib/progress/counting';
import type { Programme } from '@/lib/progress/schedule';
import { buildVisitSummary } from '@/lib/progress/visitSummary';
import { buildWeeklyReport } from '@/lib/progress/weeklyReport';

const programme: Programme = {
  startDate: '2026-10-01',
  defaultRoutine: [
    { exerciseId: 'quad-sets', position: 1, reps: 10, frequency: 'daily', weekday: null },
    { exerciseId: 'ankle-pumps', position: 2, reps: 15, frequency: 'daily', weekday: null },
  ],
  prescriptions: [],
};

const done = (localDate: string, extra: Partial<SessionRecord> = {}): SessionRecord => ({
  id: `${localDate}-${Math.random()}`,
  localDate,
  status: 'complete',
  endedAt: `${localDate}T02:00:00Z`,
  source: 'manual',
  exercises: [
    { exerciseId: 'quad-sets', hurt: false, easy: true, formScore: null },
    { exerciseId: 'ankle-pumps', hurt: false, easy: true, formScore: null },
  ],
  ...extra,
});

describe('weekly report', () => {
  const report = buildWeeklyReport({
    programme,
    sessions: [
      done('2026-10-26'),
      done('2026-10-28', {
        exercises: [{ exerciseId: 'quad-sets', hurt: true, easy: false, formScore: null }],
      }),
      done('2026-10-19'), // last week
    ],
    activity: [
      { localDate: '2026-10-26', steps: 4000, source: 'manual' },
      { localDate: '2026-10-27', steps: 5001, source: 'manual' },
      { localDate: '2026-10-28', steps: null, source: 'manual' },
    ],
    falls: [{ localDate: '2026-10-27', source: 'manual' }],
    weekStart: '2026-10-26',
    today: '2026-10-29',
  });

  it('has a Monday-to-Sunday grid', () => {
    expect(report.days.map((d) => d.status)).toEqual([
      'done',
      'missed',
      'done',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });

  it('gives sessions done of prescribed and the rate', () => {
    expect(report).toMatchObject({ done: 2, prescribed: 7, rate: 29 });
  });

  it('averages steps over the days that have them', () => {
    expect(report.averageDailySteps).toBe(4501);
  });

  it('flags pain, possible falls and missed days', () => {
    expect(report.flags).toEqual({ painReports: 1, possibleFalls: 1, missedDays: 1 });
    expect(report.includesSampleData).toBe(false);
  });

  it('has no step average without step data', () => {
    const empty = buildWeeklyReport({
      programme,
      sessions: [],
      activity: [],
      falls: [],
      weekStart: '2026-10-26',
      today: '2026-11-02',
    });
    expect(empty.averageDailySteps).toBeNull();
    expect(empty.rate).toBe(0);
  });
});

describe('visit summary', () => {
  const sessions = [
    done('2026-10-20'),
    done('2026-10-21', {
      source: 'fake',
      exercises: [
        { exerciseId: 'quad-sets', hurt: true, easy: false, formScore: 7.5 },
        { exerciseId: 'ankle-pumps', hurt: null, easy: true, formScore: 8 },
      ],
    }),
    done('2026-10-21', { status: 'incomplete', endedAt: '2026-10-21T05:00:00Z', exercises: [] }),
    done('2026-09-30'), // before the period
  ];

  it('counts sessions of prescribed slots in the period', () => {
    const summary = buildVisitSummary({
      programme,
      sessions,
      notes: [],
      periodStart: '2026-10-20',
      periodEnd: '2026-10-23',
    });
    expect(summary.adherence).toEqual({
      periodStart: '2026-10-20',
      periodEnd: '2026-10-23',
      counted: 2,
      prescribed: 4,
      rate: 50,
    });
    expect(summary.includesSampleData).toBe(true);
  });

  it('counts yes answers out of the answers given, in total and per exercise', () => {
    const { details } = buildVisitSummary({
      programme,
      sessions,
      notes: [
        { id: 'n1', localDate: '2026-10-21' },
        { id: 'n0', localDate: '2026-10-01' },
      ],
      periodStart: '2026-10-20',
      periodEnd: '2026-10-23',
    });
    expect(details.hurt).toEqual({ yes: 1, answered: 3 });
    expect(details.easy).toEqual({ yes: 3, answered: 4 });
    expect(details.byExercise).toEqual([
      {
        exerciseId: 'ankle-pumps',
        hurt: { yes: 0, answered: 1 },
        easy: { yes: 2, answered: 2 },
        averageFormScore: 8,
      },
      {
        exerciseId: 'quad-sets',
        hurt: { yes: 1, answered: 2 },
        easy: { yes: 1, answered: 2 },
        averageFormScore: 7.5,
      },
    ]);
    expect(details.averageFormScore).toBe(7.8);
    expect(details.noteIds).toEqual(['n1']);
  });

  it('has no form score without the sleeve', () => {
    const { details } = buildVisitSummary({
      programme,
      sessions: [done('2026-10-20')],
      notes: [],
      periodStart: '2026-10-20',
      periodEnd: '2026-10-20',
    });
    expect(details.averageFormScore).toBeNull();
  });
});
