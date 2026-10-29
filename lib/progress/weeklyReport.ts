import {
  buildDays,
  completionRate,
  hasSampleData,
  isMissed,
  type RecordSource,
  type SessionRecord,
} from './counting.ts';
import { addDays, type LocalDate } from './dates.ts';
import type { Programme } from './schedule.ts';

export type DayStatus = 'done' | 'partial' | 'missed' | 'rest' | 'upcoming';

export type ActivityRecord = { localDate: LocalDate; steps: number | null; source: RecordSource };
export type FallRecord = { localDate: LocalDate; source: RecordSource };

/** The caregiver's weekly report. Stored as `weekly_reports.report`. */
export type WeeklyReport = {
  weekStart: LocalDate;
  /** Monday to Sunday. */
  days: { date: LocalDate; prescribed: number; done: number; status: DayStatus }[];
  done: number;
  prescribed: number;
  rate: number;
  /** Average over the days that have a step count, or null if none do. */
  averageDailySteps: number | null;
  flags: {
    /** Exercises answered "Did it hurt? Yes". */
    painReports: number;
    possibleFalls: number;
    missedDays: number;
  };
  includesSampleData: boolean;
};

function statusOf(slots: number, done: number, date: LocalDate, today: LocalDate): DayStatus {
  if (slots === 0) return 'rest';
  if (done >= slots) return 'done';
  if (date >= today) return done > 0 ? 'partial' : 'upcoming';
  return done > 0 ? 'partial' : 'missed';
}

export function buildWeeklyReport(input: {
  programme: Programme;
  sessions: SessionRecord[];
  activity: ActivityRecord[];
  falls: FallRecord[];
  weekStart: LocalDate;
  today: LocalDate;
}): WeeklyReport {
  const { programme, weekStart, today } = input;
  const sunday = addDays(weekStart, 6);
  const inWeek = (date: LocalDate) => date >= weekStart && date <= sunday;

  const days = buildDays(programme, input.sessions, weekStart, sunday);
  const sessions = input.sessions.filter((s) => inWeek(s.localDate));
  const activity = input.activity.filter((a) => inWeek(a.localDate) && a.steps !== null);
  const falls = input.falls.filter((f) => inWeek(f.localDate));

  const done = days.reduce((n, d) => n + d.counted.length, 0);
  const prescribed = days.reduce((n, d) => n + d.slots, 0);
  const steps = activity.map((a) => a.steps ?? 0);

  return {
    weekStart,
    days: days.map((d) => ({
      date: d.date,
      prescribed: d.slots,
      done: d.counted.length,
      status: statusOf(d.slots, d.counted.length, d.date, today),
    })),
    done,
    prescribed,
    rate: completionRate(done, prescribed),
    averageDailySteps: steps.length
      ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length)
      : null,
    flags: {
      painReports: sessions.flatMap((s) => s.exercises ?? []).filter((e) => e.hurt === true).length,
      possibleFalls: falls.length,
      missedDays: days.filter((d) => isMissed(d, today)).length,
    },
    includesSampleData:
      hasSampleData(days) ||
      sessions.some((s) => s.source === 'fake') ||
      activity.some((a) => a.source === 'fake') ||
      falls.some((f) => f.source === 'fake'),
  };
}
