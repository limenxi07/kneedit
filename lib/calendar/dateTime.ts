import { addDays, isoWeekday, localDate, type LocalDate } from '@/lib/progress';

/**
 * Dates and times typed by the physio, in Singapore time: "2026-11-05" and
 * "10:00". Returns the instant, or null if either isn't valid.
 */
export function parseSingaporeDateTime(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [hour, minute] = [Number(t[1]), Number(t[2])];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const iso = `${d[1]}-${d[2]}-${d[3]}T${String(hour).padStart(2, '0')}:${t[2]}:00+08:00`;
  const instant = new Date(iso);
  // Reject dates that roll over, such as 31 February.
  if (Number.isNaN(instant.getTime()) || localDate(instant) !== `${d[1]}-${d[2]}-${d[3]}`) {
    return null;
  }
  return instant;
}

/** A Singapore date as typed ("2026-11-05"), valid and real. */
export function isValidDate(date: string): boolean {
  return parseSingaporeDateTime(date, '12:00') !== null;
}

/** The instant a Singapore day starts. */
export function startOfDay(date: LocalDate): Date {
  return new Date(`${date}T00:00:00+08:00`);
}

/** Monday to Sunday of the week containing `date`, as instants: [start, end). */
export function weekRange(date: LocalDate): { start: Date; end: Date } {
  const monday = addDays(date, 1 - isoWeekday(date));
  return { start: startOfDay(monday), end: startOfDay(addDays(monday, 7)) };
}

/** Whether an instant has already passed. */
export function isPast(instant: Date, now = new Date()): boolean {
  return instant.getTime() < now.getTime();
}
