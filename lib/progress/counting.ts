import { eachDay, type LocalDate } from './dates.ts';
import { prescribedSlots, type Programme } from './schedule.ts';

export type RecordSource = 'fake' | 'manual' | 'sleeve';
export type SessionStatus = 'in_progress' | 'complete' | 'incomplete';

export type ExerciseRecord = {
  exerciseId: string;
  hurt: boolean | null;
  easy: boolean | null;
  /** 0 to 10, only from the sleeve. */
  formScore: number | null;
};

export type SessionRecord = {
  id: string;
  localDate: LocalDate;
  status: SessionStatus;
  /** ISO timestamp, null while in progress. */
  endedAt: string | null;
  source: RecordSource;
  exercises?: ExerciseRecord[];
};

export type Day = {
  date: LocalDate;
  /** Prescribed sessions: 0 is a rest day. */
  slots: number;
  /** The sessions that count, at most `slots` of them. */
  counted: SessionRecord[];
};

/**
 * The sessions that count on one day: complete sessions in the order they
 * ended, up to the number prescribed. Extra and incomplete sessions are kept
 * but never counted.
 */
export function countedSessions(sessions: SessionRecord[], slots: number): SessionRecord[] {
  return sessions
    .filter((s) => s.status === 'complete')
    .sort((a, b) => (a.endedAt ?? '').localeCompare(b.endedAt ?? '') || a.id.localeCompare(b.id))
    .slice(0, slots);
}

/** Slots and counted sessions for every day from `from` to `to`. */
export function buildDays(
  programme: Programme,
  sessions: SessionRecord[],
  from: LocalDate,
  to: LocalDate,
): Day[] {
  const byDate = new Map<LocalDate, SessionRecord[]>();
  for (const s of sessions) {
    const list = byDate.get(s.localDate);
    if (list) list.push(s);
    else byDate.set(s.localDate, [s]);
  }
  return eachDay(from, to).map((date) => {
    const slots = prescribedSlots(programme, date);
    return { date, slots, counted: countedSessions(byDate.get(date) ?? [], slots) };
  });
}

/** A past day with fewer counted sessions than prescribed. Today is never missed. */
export function isMissed(day: Day, today: LocalDate): boolean {
  return day.date < today && day.counted.length < day.slots;
}

/** Done of prescribed, as a whole percentage. Nothing prescribed is 0%. */
export function completionRate(done: number, prescribed: number): number {
  if (prescribed <= 0) return 0;
  return Math.round((100 * Math.min(done, prescribed)) / prescribed);
}

export function hasSampleData(days: Day[]): boolean {
  return days.some((d) => d.counted.some((s) => s.source === 'fake'));
}
