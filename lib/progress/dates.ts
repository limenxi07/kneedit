/**
 * Calendar dates for the progress rules. A day is a calendar date in
 * Singapore, written 'YYYY-MM-DD'; a week runs Monday to Sunday.
 *
 * lib/progress is plain TypeScript with relative `.ts` imports and no
 * dependencies, so the app, the seed script (Node) and the Edge Functions
 * (Deno) all run the same code.
 */

/** A calendar date, 'YYYY-MM-DD'. */
export type LocalDate = string;

export const PROGRESS_TIME_ZONE = 'Asia/Singapore';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMs(date: LocalDate): number {
  if (!DATE_PATTERN.test(date)) throw new Error(`Not a date: ${date}`);
  return Date.parse(`${date}T00:00:00Z`);
}

function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The calendar date of an instant in Singapore (or another timezone). */
export function localDate(instant: Date | string, timeZone = PROGRESS_TIME_ZONE): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(typeof instant === 'string' ? new Date(instant) : instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** ISO weekday: 1 is Monday, 7 is Sunday. */
export function isoWeekday(date: LocalDate): number {
  const day = new Date(toUtcMs(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** The Monday of the week containing `date`. */
export function weekStart(date: LocalDate): LocalDate {
  return addDays(date, 1 - isoWeekday(date));
}

/** The first day of the month containing `date`. */
export function monthStart(date: LocalDate): LocalDate {
  return `${date.slice(0, 8)}01`;
}

/** Every date from `from` to `to`, both included. Empty if `to` is earlier. */
export function eachDay(from: LocalDate, to: LocalDate): LocalDate[] {
  const days: LocalDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}
