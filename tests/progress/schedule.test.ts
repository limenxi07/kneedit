import {
  addDays,
  daysBetween,
  eachDay,
  isoWeekday,
  localDate,
  monthStart,
  weekStart,
} from '@/lib/progress/dates';
import {
  dueItems,
  planOn,
  prescribedSlots,
  sessionQueue,
  type PlanItem,
  type Programme,
} from '@/lib/progress/schedule';

const item = (exerciseId: string, extra: Partial<PlanItem> = {}): PlanItem => ({
  exerciseId,
  position: 1,
  reps: 10,
  frequency: 'daily',
  weekday: null,
  ...extra,
});

const starter = [
  item('seated-knee-extension', { position: 1 }),
  item('ankle-pumps', { position: 2 }),
  item('quad-sets', { position: 3 }),
];

describe('dates', () => {
  it('uses the Singapore calendar date', () => {
    // 00:30 on 29 October in Singapore is still 28 October in UTC.
    expect(localDate('2026-10-28T16:30:00Z')).toBe('2026-10-29');
    expect(localDate('2026-10-28T15:59:00Z')).toBe('2026-10-28');
  });

  it('runs weeks Monday to Sunday', () => {
    expect(isoWeekday('2026-10-26')).toBe(1);
    expect(isoWeekday('2026-11-01')).toBe(7);
    expect(weekStart('2026-10-28')).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(daysBetween('2026-10-01', '2026-10-29')).toBe(28);
    expect(monthStart('2026-10-29')).toBe('2026-10-01');
    expect(eachDay('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(eachDay('2026-11-02', '2026-11-01')).toEqual([]);
  });
});

describe('the plan in force', () => {
  const programme: Programme = {
    startDate: '2026-10-01',
    defaultRoutine: starter,
    prescriptions: [
      {
        id: 'first',
        startDate: '2026-10-10',
        createdAt: '2026-10-09T02:00:00Z',
        variation: 'same_every_day',
        items: [item('quad-sets')],
      },
      // Saved on the 12th to start on the 20th...
      {
        id: 'later',
        startDate: '2026-10-20',
        createdAt: '2026-10-12T02:00:00Z',
        variation: 'same_every_day',
        items: [item('heel-raises')],
      },
      // ...then replaced on the 14th by one starting on the 15th.
      {
        id: 'sooner',
        startDate: '2026-10-15',
        createdAt: '2026-10-14T02:00:00Z',
        variation: 'same_every_day',
        items: [item('mini-squats')],
      },
    ],
  };

  it('is nothing before the programme began', () => {
    expect(planOn(programme, '2026-09-30')).toBeNull();
    expect(prescribedSlots(programme, '2026-09-30')).toBe(0);
  });

  it('is the starter routine until a physio prescribes', () => {
    expect(planOn(programme, '2026-10-01')?.prescriptionId).toBeNull();
    expect(sessionQueue(programme, '2026-10-09', 1).map((i) => i.exerciseId)).toEqual([
      'seated-knee-extension',
      'ankle-pumps',
      'quad-sets',
    ]);
  });

  it('is the most recently saved prescription that has started', () => {
    expect(planOn(programme, '2026-10-10')?.prescriptionId).toBe('first');
    expect(planOn(programme, '2026-10-14')?.prescriptionId).toBe('first');
    expect(planOn(programme, '2026-10-15')?.prescriptionId).toBe('sooner');
    // The version saved on the 12th was replaced before it ever started.
    expect(planOn(programme, '2026-10-25')?.prescriptionId).toBe('sooner');
  });
});

describe('prescribed sessions', () => {
  const withPlan = (
    items: PlanItem[],
    variation: 'same_every_day' | 'by_weekday' = 'same_every_day',
  ): Programme => ({
    startDate: '2026-10-01',
    defaultRoutine: starter,
    prescriptions: [
      { id: 'p', startDate: '2026-10-26', createdAt: '2026-10-25T00:00:00Z', variation, items },
    ],
  });

  it('is one a day for daily exercises', () => {
    expect(prescribedSlots(withPlan([item('quad-sets')]), '2026-10-27')).toBe(1);
  });

  it('is two when a twice-daily exercise is due, and the second holds only those', () => {
    const programme = withPlan([
      item('quad-sets', { position: 1 }),
      item('heel-raises', { position: 2, frequency: 'twice_daily' }),
    ]);
    expect(prescribedSlots(programme, '2026-10-27')).toBe(2);
    expect(sessionQueue(programme, '2026-10-27', 1).map((i) => i.exerciseId)).toEqual([
      'quad-sets',
      'heel-raises',
    ]);
    expect(sessionQueue(programme, '2026-10-27', 2).map((i) => i.exerciseId)).toEqual([
      'heel-raises',
    ]);
    expect(sessionQueue(programme, '2026-10-27', 3)).toEqual([]);
  });

  it('counts alternate days from the prescription start, with rest days in between', () => {
    const programme = withPlan([item('mini-squats', { frequency: 'alternate_days' })]);
    expect(prescribedSlots(programme, '2026-10-26')).toBe(1);
    expect(prescribedSlots(programme, '2026-10-27')).toBe(0);
    expect(prescribedSlots(programme, '2026-10-28')).toBe(1);
  });

  it('can vary by weekday', () => {
    const programme = withPlan(
      [
        item('quad-sets', { weekday: 1 }),
        item('heel-raises', { weekday: 3, frequency: 'twice_daily' }),
      ],
      'by_weekday',
    );
    expect(prescribedSlots(programme, '2026-10-26')).toBe(1); // Monday
    expect(prescribedSlots(programme, '2026-10-27')).toBe(0); // Tuesday
    expect(prescribedSlots(programme, '2026-10-28')).toBe(2); // Wednesday
    const plan = planOn(programme, '2026-11-02')!;
    expect(dueItems(plan, '2026-11-02').map((i) => i.exerciseId)).toEqual(['quad-sets']);
  });
});
