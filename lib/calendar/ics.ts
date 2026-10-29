/**
 * A visit as an iCalendar (.ics) file, so family and physios can add it to
 * their own calendar (RFC 5545). Times are written in UTC, which every
 * calendar app converts to the phone's own time.
 */

export type CalendarEvent = {
  /** Stable, so adding the same visit twice updates it rather than duplicating it. */
  uid: string;
  start: Date;
  durationMin: number;
  title: string;
  location?: string;
  description?: string;
};

/** 20261105T020000Z */
function utc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Escape text values: backslash, semicolon, comma and new lines. */
function escape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 octets, as the format requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const charSize = new TextEncoder().encode(char).length;
    // Continuation lines start with a space, which counts towards their 75.
    if (size + charSize > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += charSize;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcs(event: CalendarEvent, now = new Date()): string {
  const end = new Date(event.start.getTime() + event.durationMin * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kneedit//Visits//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@kneedit.app`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escape(event.title)}`,
    ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escape(event.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
