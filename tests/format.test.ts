import { formatDate, formatNumber, formatPercent, formatTime } from '@/lib/i18n/format';
import { matchLanguage } from '@/lib/i18n/languages';

describe('matchLanguage', () => {
  it.each([
    ['zh-Hans-SG', 'zh-Hans'],
    ['zh-CN', 'zh-Hans'],
    ['zh-Hant-TW', 'zh-Hans'],
    ['en-SG', 'en'],
    ['ms-MY', 'en'],
    [undefined, 'en'],
  ])('%s -> %s', (tag, expected) => {
    expect(matchLanguage(tag)).toBe(expected);
  });
});

describe('formatting', () => {
  // 23:30 UTC on Sunday 18 Oct is 07:30 on Monday 19 Oct in Singapore.
  const date = new Date('2026-10-18T23:30:00Z');

  it('shows dates in Singapore time', () => {
    expect(formatDate(date, 'en', { weekday: 'long' })).toBe('Monday');
    expect(formatDate(date, 'zh-Hans', { weekday: 'long' })).toBe('星期一');
  });

  it('formats times per language', () => {
    expect(formatTime(date, 'en')).toMatch(/^7:30\s?am$/i);
    expect(formatTime(date, 'zh-Hans')).toMatch(/7:30/);
  });

  it('formats numbers and percentages', () => {
    expect(formatNumber(4460, 'en')).toBe('4,460');
    expect(formatNumber(4460, 'zh-Hans')).toBe('4,460');
    expect(formatPercent(43, 'en')).toBe('43%');
    expect(formatPercent(43, 'zh-Hans')).toBe('43%');
  });
});
