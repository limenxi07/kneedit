import { INTL_LOCALE, type Language } from './languages';

/** Every date and time in the app is shown in Singapore time (brief section 8). */
export const TIME_ZONE = 'Asia/Singapore';

export function formatDate(
  date: Date,
  language: Language,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[language], { timeZone: TIME_ZONE, ...options }).format(
    date,
  );
}

export function formatTime(date: Date, language: Language): string {
  return formatDate(date, language, { hour: 'numeric', minute: '2-digit' });
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(INTL_LOCALE[language]).format(value);
}

/** `rate` is a whole percentage, 0 to 100, as stored in the progress model. */
export function formatPercent(rate: number, language: Language): string {
  return new Intl.NumberFormat(INTL_LOCALE[language], {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(rate / 100);
}
