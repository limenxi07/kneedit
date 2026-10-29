import { formatTimeOfDay } from '@/lib/i18n/format';
import { localized, localizedList } from '@/lib/i18n/localized';
import { hhmm, parseTimeOfDay, REMINDER_TIMES } from '@/lib/notifications/time';

describe('reminder times', () => {
  it('reads Postgres times', () => {
    expect(parseTimeOfDay('09:00:00')).toEqual({ hour: 9, minute: 0 });
    expect(parseTimeOfDay('20:30')).toEqual({ hour: 20, minute: 30 });
    expect(parseTimeOfDay('24:00')).toBeNull();
    expect(parseTimeOfDay('9am')).toBeNull();
  });

  it('matches stored times to the times on offer', () => {
    expect(REMINDER_TIMES).toContain(hhmm('09:00:00'));
  });

  it('shows a time of day in each language', () => {
    expect(formatTimeOfDay('09:00:00', 'en')).toMatch(/9:00/);
    expect(formatTimeOfDay('18:00', 'zh-Hans')).toMatch(/6:00|18:00/);
  });
});

describe('bilingual data', () => {
  const name = { en: 'Ankle pumps', 'zh-Hans': '踝泵运动' };
  const steps = { en: ['One', 'Two'], 'zh-Hans': ['一', '二'] };

  it('picks the active language', () => {
    expect(localized(name, 'zh-Hans')).toBe('踝泵运动');
    expect(localizedList(steps, 'en')).toEqual(['One', 'Two']);
  });

  it('falls back to English, then to nothing', () => {
    expect(localized({ en: 'Ankle pumps' }, 'zh-Hans')).toBe('Ankle pumps');
    expect(localized(null, 'en')).toBe('');
    expect(localizedList(undefined, 'en')).toEqual([]);
  });
});
