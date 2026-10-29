import fs from 'node:fs';
import path from 'node:path';

import { NAMESPACES } from '@/lib/i18n/resources';

import { ALL_LANGUAGES, LOCALES_DIR, loadStrings, namespacesIn } from './helpers/locales';

const en = loadStrings('en');
const zh = loadStrings('zh-Hans');

const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('locale files', () => {
  it('have the same namespaces in every language, all registered in resources.ts', () => {
    const expected = namespacesIn('en');
    for (const language of ALL_LANGUAGES) expect(namespacesIn(language)).toEqual(expected);
    expect([...NAMESPACES].sort()).toEqual(expected);
  });

  it('have no key in English that is missing in Chinese', () => {
    const missing = Object.keys(en).filter((k) => !(k in zh));
    expect(missing).toEqual([]);
  });

  it('have no key in Chinese that is missing in English', () => {
    const missing = Object.keys(zh).filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it('have a non-empty string for every key', () => {
    for (const strings of [en, zh]) {
      const bad = Object.entries(strings).filter(([, v]) => typeof v !== 'string' || !v.trim());
      expect(bad).toEqual([]);
    }
  });

  it('use the same {{placeholders}} in both languages', () => {
    const mismatched = Object.keys(en).filter(
      (k) =>
        JSON.stringify(placeholders(String(en[k]))) !==
        JSON.stringify(placeholders(String(zh[k] ?? ''))),
    );
    expect(mismatched).toEqual([]);
  });
});

describe('Chinese review status (locales/review-status.json)', () => {
  const review = JSON.parse(
    fs.readFileSync(path.join(LOCALES_DIR, 'review-status.json'), 'utf8'),
  ) as { strings: Record<string, { status: string; priority: string }> };

  it('lists every Chinese string', () => {
    const unlisted = Object.keys(zh).filter((k) => !(k in review.strings));
    expect(unlisted).toEqual([]);
  });

  it('has no stale entries', () => {
    const stale = Object.keys(review.strings).filter((k) => !(k in zh));
    expect(stale).toEqual([]);
  });

  it('uses only known statuses and priorities', () => {
    const bad = Object.entries(review.strings).filter(
      ([, v]) =>
        !['machine-drafted', 'reviewed'].includes(v.status) ||
        !['safety', 'health', 'general'].includes(v.priority),
    );
    expect(bad).toEqual([]);
  });
});
