import { daysBetween, isoWeekday, type LocalDate } from './dates.ts';

export type Frequency = 'daily' | 'twice_daily' | 'alternate_days';
export type Variation = 'same_every_day' | 'by_weekday';

export type PlanItem = {
  exerciseId: string;
  position: number;
  reps: number;
  frequency: Frequency;
  /** ISO weekday (1 is Monday) in a by_weekday programme, otherwise null. */
  weekday: number | null;
};

/** One saved version of a physio's programme (a `prescriptions` row and its items). */
export type Prescription = {
  id: string;
  startDate: LocalDate;
  /** When the version was saved. Later versions win once they have started. */
  createdAt: string;
  variation: Variation;
  items: PlanItem[];
};

/** Everything that decides what a senior is asked to do on any day. */
export type Programme = {
  /** The first day the senior had a programme (the day they signed up). */
  startDate: LocalDate;
  /** The Kneedit starter routine, used until a physio prescribes. */
  defaultRoutine: PlanItem[];
  prescriptions: Prescription[];
};

/** The plan in force on one day. */
export type Plan = {
  /** Null means the default routine. */
  prescriptionId: string | null;
  /** Alternate days count from here. */
  startDate: LocalDate;
  variation: Variation;
  items: PlanItem[];
};

/**
 * The plan in force on a day: the most recently saved prescription that has
 * started by then, or the default routine. Null before the programme began.
 * Mirrors prescription_in_force() in the database.
 */
export function planOn(programme: Programme, date: LocalDate): Plan | null {
  if (date < programme.startDate) return null;
  let current: Prescription | null = null;
  for (const p of programme.prescriptions) {
    if (p.startDate > date) continue;
    if (!current || p.createdAt > current.createdAt) current = p;
  }
  if (current) {
    return {
      prescriptionId: current.id,
      startDate: current.startDate,
      variation: current.variation,
      items: current.items,
    };
  }
  return {
    prescriptionId: null,
    startDate: programme.startDate,
    variation: 'same_every_day',
    items: programme.defaultRoutine,
  };
}

/** The exercises due on a day under a plan, in order. */
export function dueItems(plan: Plan, date: LocalDate): PlanItem[] {
  const weekday = isoWeekday(date);
  return plan.items
    .filter((item) => plan.variation === 'same_every_day' || item.weekday === weekday)
    .filter(
      (item) => item.frequency !== 'alternate_days' || daysBetween(plan.startDate, date) % 2 === 0,
    )
    .sort((a, b) => a.position - b.position);
}

/**
 * Prescribed sessions on a day: 0 (rest day), 1, or 2 when a twice-daily
 * exercise is due.
 */
export function prescribedSlots(programme: Programme, date: LocalDate): 0 | 1 | 2 {
  const plan = planOn(programme, date);
  if (!plan) return 0;
  const due = dueItems(plan, date);
  if (due.length === 0) return 0;
  return due.some((item) => item.frequency === 'twice_daily') ? 2 : 1;
}

/**
 * What a session queues: the first session of the day has everything due,
 * the second only the twice-daily exercises. Any further session is empty.
 */
export function sessionQueue(
  programme: Programme,
  date: LocalDate,
  sessionNumber: number,
): PlanItem[] {
  const plan = planOn(programme, date);
  if (!plan) return [];
  const due = dueItems(plan, date);
  if (sessionNumber === 1) return due;
  if (sessionNumber === 2) return due.filter((item) => item.frequency === 'twice_daily');
  return [];
}
