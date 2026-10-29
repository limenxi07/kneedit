import { parseSingaporeDateTime, weekRange } from '@/lib/calendar/dateTime';
import {
  addItem,
  draftFrom,
  moveItem,
  problems,
  removeItem,
  setItem,
  setVariation,
  toRpcItems,
} from '@/lib/prescribe/editor';
import type { Plan } from '@/lib/progress';

const TODAY = '2026-10-29';
const starter: Plan = {
  prescriptionId: null,
  startDate: '2026-09-01',
  variation: 'same_every_day',
  items: [
    { exerciseId: 'ankle-pumps', position: 2, reps: 15, frequency: 'daily', weekday: null },
    { exerciseId: 'quad-sets', position: 1, reps: 10, frequency: 'daily', weekday: null },
  ],
};

describe('the programme editor', () => {
  it('starts from the plan in force, in order', () => {
    const draft = draftFrom(starter, TODAY);
    expect(draft.lists.all.map((i) => i.exerciseId)).toEqual(['quad-sets', 'ankle-pumps']);
    expect(draft.startDate).toBe(TODAY);
  });

  it('adds each exercise once, removes, and moves within bounds', () => {
    let draft = draftFrom(starter, TODAY);
    draft = addItem(draft, 'all', 'heel-raises', 10);
    draft = addItem(draft, 'all', 'heel-raises', 10);
    expect(draft.lists.all.map((i) => i.exerciseId)).toEqual([
      'quad-sets',
      'ankle-pumps',
      'heel-raises',
    ]);
    draft = moveItem(draft, 'all', 'heel-raises', -1);
    draft = moveItem(draft, 'all', 'quad-sets', -1);
    expect(draft.lists.all.map((i) => i.exerciseId)).toEqual([
      'quad-sets',
      'heel-raises',
      'ankle-pumps',
    ]);
    draft = removeItem(draft, 'all', 'quad-sets');
    expect(draft.lists.all.map((i) => i.exerciseId)).toEqual(['heel-raises', 'ankle-pumps']);
  });

  it('sets reps and frequency', () => {
    const draft = setItem(draftFrom(starter, TODAY), 'all', 'quad-sets', {
      reps: 12,
      frequency: 'twice_daily',
    });
    expect(draft.lists.all[0]).toEqual({
      exerciseId: 'quad-sets',
      reps: 12,
      frequency: 'twice_daily',
    });
  });

  it('copies the daily set to every weekday, and back', () => {
    let draft = setVariation(draftFrom(starter, TODAY), 'by_weekday');
    expect(draft.lists['3'].map((i) => i.exerciseId)).toEqual(['quad-sets', 'ankle-pumps']);
    expect(draft.lists.all).toEqual([]);
    draft = removeItem(draft, '1', 'quad-sets');
    draft = setVariation(draft, 'same_every_day');
    expect(draft.lists.all.map((i) => i.exerciseId)).toEqual(['ankle-pumps']);
  });

  it('builds save_prescription items, with weekdays only when varied by day', () => {
    const daily = draftFrom(starter, TODAY);
    expect(toRpcItems(daily)).toEqual([
      { exercise_id: 'quad-sets', reps: 10, frequency: 'daily' },
      { exercise_id: 'ankle-pumps', reps: 15, frequency: 'daily' },
    ]);
    let byDay = setVariation(daily, 'by_weekday');
    for (const d of ['2', '3', '4', '5', '6', '7'] as const) {
      byDay = removeItem(removeItem(byDay, d, 'quad-sets'), d, 'ankle-pumps');
    }
    expect(toRpcItems(byDay)).toEqual([
      { exercise_id: 'quad-sets', reps: 10, frequency: 'daily', weekday: 1 },
      { exercise_id: 'ankle-pumps', reps: 15, frequency: 'daily', weekday: 1 },
    ]);
  });

  it('finds what stops a save', () => {
    const draft = draftFrom(starter, TODAY);
    expect(problems(draft, TODAY)).toEqual([]);
    expect(problems({ ...draft, startDate: '2026-10-28' }, TODAY)).toEqual(['startInPast']);
    expect(
      problems(removeItem(removeItem(draft, 'all', 'quad-sets'), 'all', 'ankle-pumps'), TODAY),
    ).toEqual(['noItems']);
    expect(problems(setItem(draft, 'all', 'quad-sets', { reps: 0 }), TODAY)).toEqual([
      'repsOutOfRange',
    ]);
  });
});

describe('dates and times typed by the physio', () => {
  it('reads a Singapore date and time', () => {
    expect(parseSingaporeDateTime('2026-11-05', '10:00')?.toISOString()).toBe(
      '2026-11-05T02:00:00.000Z',
    );
    expect(parseSingaporeDateTime('2026-11-05', '9:30')?.toISOString()).toBe(
      '2026-11-05T01:30:00.000Z',
    );
  });

  it('rejects anything that is not a real date and time', () => {
    expect(parseSingaporeDateTime('2026-02-31', '10:00')).toBeNull();
    expect(parseSingaporeDateTime('5/11/2026', '10:00')).toBeNull();
    expect(parseSingaporeDateTime('2026-11-05', '25:00')).toBeNull();
  });

  it('gives the Monday-to-Sunday week as instants', () => {
    const { start, end } = weekRange('2026-10-29');
    expect(start.toISOString()).toBe('2026-10-25T16:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-01T16:00:00.000Z');
  });
});
