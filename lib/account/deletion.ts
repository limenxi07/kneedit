import type { Language } from '@/lib/i18n/languages';

/**
 * The word typed to confirm account deletion (PLAN.md, Delete account, step
 * 2). delete_my_account() in the database accepts the same words.
 */
export const CONFIRMATION_WORD: Record<Language, string> = {
  en: 'DELETE',
  'zh-Hans': '删除',
};

export function matchesConfirmation(typed: string, language: Language): boolean {
  const word = typed.trim();
  return language === 'en'
    ? word.toUpperCase() === CONFIRMATION_WORD.en
    : word === CONFIRMATION_WORD[language];
}
