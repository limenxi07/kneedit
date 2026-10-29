import type { RecordSource, SessionRecord, SessionStatus } from './counting.ts';
import { localDate, type LocalDate } from './dates.ts';
import type { Frequency, PlanItem, Programme, Variation } from './schedule.ts';
import type { SeniorStats } from './stats.ts';

/**
 * Database rows to the progress model, and back. The app and the
 * recompute-stats Edge Function both read the same tables, so both build
 * their Programme and sessions here.
 *
 * The row types list only the columns the rules need, in the database's
 * snake_case, so any select that includes them fits.
 */

export type RoutineItemRow = {
  position: number;
  exercise_id: string;
  reps: number;
  frequency: Frequency;
};

export type PrescriptionItemRow = RoutineItemRow & { weekday: number | null };

export type PrescriptionRow = {
  id: string;
  start_date: LocalDate;
  created_at: string;
  variation: Variation;
  prescription_items: PrescriptionItemRow[];
};

export type SessionExerciseRow = {
  exercise_id: string;
  hurt: boolean | null;
  easy: boolean | null;
  form_score: number | null;
};

export type SessionRow = {
  id: string;
  local_date: LocalDate;
  status: SessionStatus;
  ended_at: string | null;
  source: RecordSource;
  session_exercises?: SessionExerciseRow[];
};

function planItem(row: RoutineItemRow, weekday: number | null): PlanItem {
  return {
    exerciseId: row.exercise_id,
    position: row.position,
    reps: row.reps,
    frequency: row.frequency,
    weekday,
  };
}

/**
 * A senior's programme. It starts on the day the senior signed up
 * (`seniors.created_at`), on the starter routine until a physio prescribes.
 */
export function programmeFromRows(rows: {
  seniorCreatedAt: string;
  defaultRoutine: RoutineItemRow[];
  prescriptions: PrescriptionRow[];
}): Programme {
  return {
    startDate: localDate(rows.seniorCreatedAt),
    defaultRoutine: rows.defaultRoutine.map((r) => planItem(r, null)),
    prescriptions: rows.prescriptions.map((p) => ({
      id: p.id,
      startDate: p.start_date,
      createdAt: p.created_at,
      variation: p.variation,
      items: p.prescription_items.map((i) => planItem(i, i.weekday)),
    })),
  };
}

export function sessionFromRow(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    localDate: row.local_date,
    status: row.status,
    endedAt: row.ended_at,
    source: row.source,
    exercises: row.session_exercises?.map((e) => ({
      exerciseId: e.exercise_id,
      hurt: e.hurt,
      easy: e.easy,
      // PostgREST may send numeric columns as strings.
      formScore: e.form_score === null ? null : Number(e.form_score),
    })),
  };
}

/** A `senior_stats` row. */
export function statsRow(seniorId: string, stats: SeniorStats) {
  return {
    senior_id: seniorId,
    as_of_date: stats.asOfDate,
    week_start: stats.weekStart,
    week_done: stats.weekDone,
    week_prescribed: stats.weekPrescribed,
    week_rate: stats.weekRate,
    streak: stats.streak,
    month_sessions: stats.monthSessions,
    missed_days_this_week: stats.missedDaysThisWeek,
    consecutive_missed_days: stats.consecutiveMissedDays,
    includes_sample_data: stats.includesSampleData,
  };
}
