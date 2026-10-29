import type { PlanItem, Prescription, Programme } from '@/lib/progress';
import {
  currentStep,
  isCounted,
  nextQueue,
  queueForNumber,
  queueForSession,
  sessionNumber,
  type FlowSession,
} from '@/lib/session/flow';

const item = (exerciseId: string, position: number, extra: Partial<PlanItem> = {}): PlanItem => ({
  exerciseId,
  position,
  reps: 10,
  frequency: 'daily',
  weekday: null,
  ...extra,
});

const starter = [item('seated-knee-extension', 1), item('ankle-pumps', 2)];
const twiceDaily: Prescription = {
  id: 'rx-1',
  startDate: '2026-10-20',
  createdAt: '2026-10-19T08:00:00Z',
  variation: 'same_every_day',
  items: [item('quad-sets', 1), item('ankle-pumps', 2, { frequency: 'twice_daily' })],
};
const programme: Programme = {
  startDate: '2026-10-01',
  defaultRoutine: starter,
  prescriptions: [twiceDaily],
};

const DAY = '2026-10-28';
let nextId = 0;
const session = (extra: Partial<FlowSession> = {}): FlowSession => ({
  id: `s${++nextId}`,
  local_date: DAY,
  started_at: `${DAY}T01:00:00Z`,
  ended_at: `${DAY}T01:20:00Z`,
  status: 'complete',
  prescription_id: 'rx-1',
  ...extra,
});

describe('what a session queues', () => {
  it('queues everything due first, then only the twice-daily exercises', () => {
    expect(queueForNumber(programme, DAY, 1).map((i) => i.exerciseId)).toEqual([
      'quad-sets',
      'ankle-pumps',
    ]);
    expect(queueForNumber(programme, DAY, 2).map((i) => i.exerciseId)).toEqual(['ankle-pumps']);
  });

  it('repeats the day for an extra session beyond the plan', () => {
    expect(queueForNumber(programme, DAY, 3).map((i) => i.exerciseId)).toEqual([
      'quad-sets',
      'ankle-pumps',
    ]);
  });

  it('queues nothing on a rest day', () => {
    const restDay: Programme = { ...programme, prescriptions: [], defaultRoutine: [] };
    expect(queueForNumber(restDay, DAY, 1)).toEqual([]);
    expect(queueForNumber(restDay, DAY, 2)).toEqual([]);
  });

  it('numbers a session by the complete sessions that ended before it began', () => {
    const first = session();
    const ended = session({ status: 'incomplete', ended_at: `${DAY}T02:00:00Z` });
    const current = session({
      started_at: `${DAY}T09:00:00Z`,
      ended_at: null,
      status: 'in_progress',
    });
    expect(sessionNumber(current, [first, ended, current])).toBe(2);
    expect(sessionNumber(first, [first, ended, current])).toBe(1);
  });

  it('starts a new session after the complete ones', () => {
    expect(nextQueue(programme, DAY, []).length).toBe(2);
    expect(nextQueue(programme, DAY, [session()]).map((i) => i.exerciseId)).toEqual([
      'ankle-pumps',
    ]);
    // An ended-early session doesn't count, so the next one has everything again.
    expect(nextQueue(programme, DAY, [session({ status: 'incomplete' })]).length).toBe(2);
  });

  it('keeps the queue of the programme version a session started on', () => {
    const replacement: Prescription = {
      id: 'rx-2',
      startDate: DAY,
      createdAt: `${DAY}T03:00:00Z`,
      variation: 'same_every_day',
      items: [item('heel-raises', 1)],
    };
    const changed: Programme = { ...programme, prescriptions: [twiceDaily, replacement] };
    const started = session({ ended_at: null, status: 'in_progress', prescription_id: 'rx-1' });
    expect(queueForSession(changed, started, [started]).map((i) => i.exerciseId)).toEqual([
      'quad-sets',
      'ankle-pumps',
    ]);
    // The next session gets the new version.
    expect(nextQueue(changed, DAY, []).map((i) => i.exerciseId)).toEqual(['heel-raises']);
  });

  it('uses the starter routine for a session started on it', () => {
    const started = session({ ended_at: null, status: 'in_progress', prescription_id: null });
    expect(queueForSession(programme, started, [started]).map((i) => i.exerciseId)).toEqual([
      'seated-knee-extension',
      'ankle-pumps',
    ]);
  });
});

describe('where the senior is in a session', () => {
  const queue = [item('quad-sets', 1), item('ankle-pumps', 2)];

  it('starts at the first exercise', () => {
    expect(currentStep(queue, [])).toEqual({ kind: 'exercise', index: 0, item: queue[0] });
  });

  it('asks the questions for an exercise done but not answered', () => {
    expect(currentStep(queue, [{ position: 1, hurt: false, easy: null }])).toEqual({
      kind: 'questions',
      index: 0,
      item: queue[0],
    });
  });

  it('moves on once both questions are answered, and finishes after the last', () => {
    const first = { position: 1, hurt: false, easy: true };
    expect(currentStep(queue, [first])).toEqual({ kind: 'exercise', index: 1, item: queue[1] });
    expect(currentStep(queue, [first, { position: 2, hurt: true, easy: false }])).toEqual({
      kind: 'finished',
    });
  });
});

describe('whether a session counts', () => {
  it('counts complete sessions up to the slots, in the order they ended', () => {
    const first = session({ ended_at: `${DAY}T01:00:00Z` });
    const second = session({ ended_at: `${DAY}T05:00:00Z` });
    const early = session({ status: 'incomplete', ended_at: `${DAY}T00:30:00Z` });
    const day = [first, second, early];
    expect(isCounted(first, day, 1)).toBe(true);
    expect(isCounted(second, day, 1)).toBe(false);
    expect(isCounted(second, day, 2)).toBe(true);
    expect(isCounted(early, day, 2)).toBe(false);
  });
});
