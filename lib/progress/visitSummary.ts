import { buildDays, completionRate, type SessionRecord } from './counting.ts';
import type { LocalDate } from './dates.ts';
import type { Programme } from './schedule.ts';

/** "Yes" answers out of the answers given. */
export type YesCount = { yes: number; answered: number };

/** Stored as the `adherence` part of a visit summary: every physio sees it. */
export type VisitAdherence = {
  periodStart: LocalDate;
  periodEnd: LocalDate;
  counted: number;
  prescribed: number;
  rate: number;
};

/** Stored as the `details` part: physios on Plus, and the senior. */
export type VisitDetails = {
  hurt: YesCount;
  easy: YesCount;
  byExercise: {
    exerciseId: string;
    hurt: YesCount;
    easy: YesCount;
    averageFormScore: number | null;
  }[];
  /** Over scored exercises only. Null means "needs the sleeve". */
  averageFormScore: number | null;
  noteIds: string[];
};

export type VisitSummary = {
  adherence: VisitAdherence;
  details: VisitDetails;
  includesSampleData: boolean;
};

export type NoteRecord = { id: string; localDate: LocalDate };

function count(values: (boolean | null)[]): YesCount {
  const answered = values.filter((v) => v !== null);
  return { yes: answered.filter((v) => v).length, answered: answered.length };
}

function average(scores: (number | null)[]): number | null {
  const scored = scores.filter((s): s is number => s !== null);
  if (scored.length === 0) return null;
  return Math.round((10 * scored.reduce((a, b) => a + b, 0)) / scored.length) / 10;
}

/**
 * Summary of the time since the last completed visit (or since the programme
 * started), from `periodStart` to `periodEnd`, both included.
 */
export function buildVisitSummary(input: {
  programme: Programme;
  sessions: SessionRecord[];
  notes: NoteRecord[];
  periodStart: LocalDate;
  periodEnd: LocalDate;
}): VisitSummary {
  const { periodStart, periodEnd } = input;
  const inPeriod = (date: LocalDate) => date >= periodStart && date <= periodEnd;

  const days = buildDays(input.programme, input.sessions, periodStart, periodEnd);
  const counted = days.reduce((n, d) => n + d.counted.length, 0);
  const prescribed = days.reduce((n, d) => n + d.slots, 0);

  const sessions = input.sessions.filter((s) => inPeriod(s.localDate));
  const exercises = sessions.flatMap((s) => s.exercises ?? []);
  const exerciseIds = [...new Set(exercises.map((e) => e.exerciseId))].sort();

  return {
    adherence: {
      periodStart,
      periodEnd,
      counted,
      prescribed,
      rate: completionRate(counted, prescribed),
    },
    details: {
      hurt: count(exercises.map((e) => e.hurt)),
      easy: count(exercises.map((e) => e.easy)),
      byExercise: exerciseIds.map((exerciseId) => {
        const mine = exercises.filter((e) => e.exerciseId === exerciseId);
        return {
          exerciseId,
          hurt: count(mine.map((e) => e.hurt)),
          easy: count(mine.map((e) => e.easy)),
          averageFormScore: average(mine.map((e) => e.formScore)),
        };
      }),
      averageFormScore: average(exercises.map((e) => e.formScore)),
      noteIds: input.notes.filter((n) => inPeriod(n.localDate)).map((n) => n.id),
    },
    includesSampleData: sessions.some((s) => s.source === 'fake'),
  };
}
