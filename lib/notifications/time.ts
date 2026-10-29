/**
 * Reminder times. Stored in seniors.reminder_time as a Postgres time
 * ("09:00:00"), meant as Singapore time.
 */

/** The times on offer in onboarding and Profile; 9:00 is suggested (PLAN.md, senior setup). */
export const REMINDER_TIMES = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '12:00',
  '15:00',
  '18:00',
  '20:00',
] as const;
export const SUGGESTED_REMINDER_TIME = '09:00';

/** "09:00:00" or "09:00" to { hour: 9, minute: 0 }, or null if it isn't a time. */
export function parseTimeOfDay(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** "09:00:00" to "09:00", to match REMINDER_TIMES. */
export function hhmm(value: string): string {
  return value.slice(0, 5);
}
