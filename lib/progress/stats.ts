import { buildDays, completionRate, isMissed, type Day, type SessionRecord } from './counting.ts';
import { addDays, monthStart, weekStart, type LocalDate } from './dates.ts';
import type { Programme } from './schedule.ts';

/** One senior's numbers as of a day. Matches a `senior_stats` row. */
export type SeniorStats = {
  asOfDate: LocalDate;
  weekStart: LocalDate;
  /** Counted sessions this week so far. */
  weekDone: number;
  /** Prescribed sessions in the whole Monday-to-Sunday week. */
  weekPrescribed: number;
  /** weekDone of weekPrescribed, as a whole percentage. */
  weekRate: number;
  streak: number;
  /** Counted sessions this calendar month. */
  monthSessions: number;
  missedDaysThisWeek: number;
  /** Missed prescribed days in a row, counting back from yesterday. */
  consecutiveMissedDays: number;
  includesSampleData: boolean;
};

/**
 * Streak: prescribed days in a row with at least one counted session,
 * counting back from yesterday, plus today once today has one. Rest days are
 * skipped. `days` runs from the programme start to today.
 */
function streakFrom(days: Day[], today: LocalDate): { streak: number; used: Day[] } {
  const used: Day[] = [];
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i]!;
    if (day.date >= today || day.slots === 0) continue;
    if (day.counted.length === 0) break;
    streak++;
    used.push(day);
  }
  const todayRecord = days.find((d) => d.date === today);
  if (todayRecord && todayRecord.counted.length > 0) {
    streak++;
    used.push(todayRecord);
  }
  return { streak, used };
}

function consecutiveMissed(days: Day[], today: LocalDate): number {
  let missed = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i]!;
    if (day.date >= today || day.slots === 0) continue;
    if (!isMissed(day, today)) break;
    missed++;
  }
  return missed;
}

export function computeStats(
  programme: Programme,
  sessions: SessionRecord[],
  today: LocalDate,
): SeniorStats {
  const monday = weekStart(today);
  const sunday = addDays(monday, 6);
  const from = [programme.startDate, monday, monthStart(today)].sort()[0]!;
  const history = buildDays(programme, sessions, from, today);
  const week = buildDays(programme, sessions, monday, sunday);
  const month = history.filter((d) => d.date >= monthStart(today));
  const pastWeek = week.filter((d) => d.date <= today);

  const weekDone = pastWeek.reduce((n, d) => n + d.counted.length, 0);
  const weekPrescribed = week.reduce((n, d) => n + d.slots, 0);
  const { streak, used } = streakFrom(history, today);
  const looked = [...pastWeek, ...month, ...used];

  return {
    asOfDate: today,
    weekStart: monday,
    weekDone,
    weekPrescribed,
    weekRate: completionRate(weekDone, weekPrescribed),
    streak,
    monthSessions: month.reduce((n, d) => n + d.counted.length, 0),
    missedDaysThisWeek: pastWeek.filter((d) => isMissed(d, today)).length,
    consecutiveMissedDays: consecutiveMissed(history, today),
    includesSampleData: looked.some((d) => d.counted.some((s) => s.source === 'fake')),
  };
}
