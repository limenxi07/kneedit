import {
  computeStats,
  programmeFromRows,
  sessionFromRow,
  statsRow,
  type SessionRow,
} from '@/lib/progress';

describe('database rows to the progress model', () => {
  const programme = programmeFromRows({
    // 23:30 UTC on the 30th is the 1st in Singapore.
    seniorCreatedAt: '2026-09-30T23:30:00Z',
    defaultRoutine: [{ position: 1, exercise_id: 'quad-sets', reps: 10, frequency: 'daily' }],
    prescriptions: [
      {
        id: 'rx-1',
        start_date: '2026-10-20',
        created_at: '2026-10-19T08:00:00Z',
        variation: 'by_weekday',
        prescription_items: [
          { position: 1, exercise_id: 'heel-raises', reps: 8, frequency: 'daily', weekday: 3 },
        ],
      },
    ],
  });

  it('starts the programme on the Singapore day the senior signed up', () => {
    expect(programme.startDate).toBe('2026-10-01');
    expect(programme.defaultRoutine).toEqual([
      { exerciseId: 'quad-sets', position: 1, reps: 10, frequency: 'daily', weekday: null },
    ]);
  });

  it('keeps each prescription version with its weekdays', () => {
    expect(programme.prescriptions).toEqual([
      {
        id: 'rx-1',
        startDate: '2026-10-20',
        createdAt: '2026-10-19T08:00:00Z',
        variation: 'by_weekday',
        items: [
          { exerciseId: 'heel-raises', position: 1, reps: 8, frequency: 'daily', weekday: 3 },
        ],
      },
    ]);
  });

  it('reads sessions, including form scores sent as strings', () => {
    const row: SessionRow = {
      id: 's1',
      local_date: '2026-10-28',
      status: 'complete',
      ended_at: '2026-10-28T02:00:00Z',
      source: 'fake',
      session_exercises: [
        { exercise_id: 'heel-raises', hurt: false, easy: true, form_score: '8.5' as never },
        { exercise_id: 'quad-sets', hurt: null, easy: null, form_score: null },
      ],
    };
    expect(sessionFromRow(row)).toEqual({
      id: 's1',
      localDate: '2026-10-28',
      status: 'complete',
      endedAt: '2026-10-28T02:00:00Z',
      source: 'fake',
      exercises: [
        { exerciseId: 'heel-raises', hurt: false, easy: true, formScore: 8.5 },
        { exerciseId: 'quad-sets', hurt: null, easy: null, formScore: null },
      ],
    });
  });

  it('writes stats back as a senior_stats row', () => {
    const stats = computeStats(programme, [], '2026-10-28');
    expect(statsRow('senior-1', stats)).toEqual({
      senior_id: 'senior-1',
      as_of_date: '2026-10-28',
      week_start: '2026-10-26',
      week_done: 0,
      week_prescribed: stats.weekPrescribed,
      week_rate: 0,
      streak: 0,
      month_sessions: 0,
      missed_days_this_week: stats.missedDaysThisWeek,
      consecutive_missed_days: stats.consecutiveMissedDays,
      includes_sample_data: false,
    });
  });
});
