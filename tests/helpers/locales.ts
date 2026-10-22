import fs from 'node:fs';
import path from 'node:path';

import { LANGUAGES, type Language } from '@/lib/i18n/languages';

export const ROOT = path.resolve(__dirname, '../..');
export const LOCALES_DIR = path.join(ROOT, 'locales');

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Flatten nested JSON into "a.b.c" keys. Arrays are indexed: "steps.0". */
export function flatten(value: Json, prefix = ''): Record<string, Json> {
  if (value === null || typeof value !== 'object') return { [prefix]: value };
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value);
  return Object.assign({}, ...entries.map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k)));
}

export function namespacesIn(language: Language): string[] {
  return fs
    .readdirSync(path.join(LOCALES_DIR, language))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

/** Every string of a language, keyed "namespace:key.path". */
export function loadStrings(language: Language): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const ns of namespacesIn(language)) {
    const raw = fs.readFileSync(path.join(LOCALES_DIR, language, `${ns}.json`), 'utf8');
    for (const [key, value] of Object.entries(flatten(JSON.parse(raw) as Json))) {
      out[`${ns}:${key}`] = value;
    }
  }
  return out;
}

export const ALL_LANGUAGES = LANGUAGES;
