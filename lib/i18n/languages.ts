export const LANGUAGES = ['en', 'zh-Hans'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Map a BCP 47 tag from the device ("zh-Hans-SG", "zh-CN", "en-GB") to one
 * of our languages. Any Chinese variant gets Simplified Chinese, the only
 * Chinese we ship; everything else gets English.
 */
export function matchLanguage(tag: string | null | undefined): Language {
  if (!tag) return DEFAULT_LANGUAGE;
  return tag.toLowerCase().startsWith('zh') ? 'zh-Hans' : DEFAULT_LANGUAGE;
}

/** Locale passed to Intl formatters, so dates and numbers read naturally in Singapore. */
export const INTL_LOCALE: Record<Language, string> = {
  en: 'en-SG',
  'zh-Hans': 'zh-Hans-SG',
};
