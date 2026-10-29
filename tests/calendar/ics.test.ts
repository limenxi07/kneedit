import { buildIcs } from '@/lib/calendar/ics';

const event = {
  uid: 'visit-1',
  // 10:00 in Singapore.
  start: new Date('2026-11-05T10:00:00+08:00'),
  durationMin: 30,
  title: 'Physiotherapy visit: Tan Mei Ling',
  location: 'Demo Clinic, Room 3; Level 2',
  description: 'Booked in Kneedit.\nBring your sleeve.',
};
const now = new Date('2026-10-29T01:02:03Z');

describe('.ics files', () => {
  const ics = buildIcs(event, now);
  const lines = ics.split('\r\n');

  it('is one VEVENT in a VCALENDAR, with CRLF line ends', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('BEGIN:VEVENT');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });

  it('writes times in UTC and adds the duration', () => {
    expect(lines).toContain('DTSTART:20261105T020000Z');
    expect(lines).toContain('DTEND:20261105T023000Z');
    expect(lines).toContain('DTSTAMP:20261029T010203Z');
  });

  it('keeps a stable UID, so adding a visit twice updates it', () => {
    expect(lines).toContain('UID:visit-1@kneedit.app');
    expect(buildIcs(event, now)).toBe(ics);
  });

  it('escapes commas, semicolons and new lines', () => {
    expect(lines).toContain('LOCATION:Demo Clinic\\, Room 3\; Level 2');
    expect(lines).toContain('DESCRIPTION:Booked in Kneedit.\\nBring your sleeve.');
  });

  it('folds long lines at 75 bytes, without splitting characters', () => {
    const long = buildIcs({ ...event, title: '复诊提醒：'.repeat(8) }, now);
    const physical = long.split('\r\n');
    for (const line of physical)
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    const unfolded = long.replace(/\r\n /g, '');
    expect(unfolded).toContain(`SUMMARY:${'复诊提醒：'.repeat(8)}`);
  });

  it('leaves out an empty location', () => {
    expect(buildIcs({ ...event, location: '' }, now)).not.toContain('LOCATION');
  });
});
