import type { Json } from '@/lib/supabase/database.types';

import { DEFAULT_LANGUAGE, type Language } from './languages';

/**
 * Bilingual data from the database, stored as { "en": ..., "zh-Hans": ... }
 * (exercise names and steps, tag labels). The database requires both
 * languages; English is the fallback for anything malformed.
 */
export function localized(value: Json | undefined, language: Language): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return '';
  const text = value[language] ?? value[DEFAULT_LANGUAGE];
  return typeof text === 'string' ? text : '';
}

/** A bilingual list, such as an exercise's steps. */
export function localizedList(value: Json | undefined, language: Language): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  const list = value[language] ?? value[DEFAULT_LANGUAGE];
  return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [];
}
