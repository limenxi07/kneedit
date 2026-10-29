import fs from 'node:fs';
import path from 'node:path';

import { seedStrings } from '@/scripts/seed-strings';

import { ROOT, loadStrings } from './helpers/locales';

/**
 * Copy rules from brief section 8 and the decisions log, checked in both
 * languages. A failure here means a string needs rewording, not that the
 * test needs loosening.
 */

// Em dash, two- and three-em dash (the Chinese "——" is two em dashes),
// middle dot, katakana middle dot.
const FORBIDDEN_CHARACTERS = /[—⸺⸻·・]/;

// No medical claims (brief 1, 8; decisions #1, #2, #8).
const BANNED_EN = [
  /\bprevent/i,
  /\bclinical[\s-]?grade\b/i,
  /\bdiagnos/i,
  /\breal[\s-]?time\b/i,
  /\btreat(s|ment|ments)?\b/i,
  /\bcures?\b/i,
];
const BANNED_ZH = [/预防/, /防止/, /临床级/, /诊断/, /实时/, /治疗(?!师)/, /治愈/];

// The senior is referred to by name, never by a gendered pronoun.
const GENDERED_EN = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
const GENDERED_ZH = /她|(?<!其)他(?!们)/;

// UI strings plus the exercise library and tags in supabase/seed.sql.
const en = { ...loadStrings('en'), ...seedStrings(ROOT, 'en') };
const zh = { ...loadStrings('zh-Hans'), ...seedStrings(ROOT, 'zh-Hans') };

const offending = (strings: Record<string, unknown>, pattern: RegExp) =>
  Object.entries(strings)
    .filter(([, v]) => typeof v === 'string' && pattern.test(v))
    .map(([k, v]) => `${k}: ${String(v)}`);

describe('copy rules', () => {
  it('no em dash or middle dot in any string', () => {
    expect(offending(en, FORBIDDEN_CHARACTERS)).toEqual([]);
    expect(offending(zh, FORBIDDEN_CHARACTERS)).toEqual([]);
  });

  it.each(BANNED_EN.map((p) => [p.source, p]))('no "%s" in English', (_, pattern) => {
    expect(offending(en, pattern)).toEqual([]);
  });

  it.each(BANNED_ZH.map((p) => [p.source, p]))('no "%s" in Chinese', (_, pattern) => {
    expect(offending(zh, pattern)).toEqual([]);
  });

  it('no gendered pronouns', () => {
    expect(offending(en, GENDERED_EN)).toEqual([]);
    expect(offending(zh, GENDERED_ZH)).toEqual([]);
  });

  it('no em dash or middle dot in source, SQL or fake data either', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(m?tsx?|json|sql)$/.test(entry.name)) files.push(full);
      }
    };
    for (const dir of ['app', 'components', 'lib', 'locales', 'fake-data', 'scripts', 'supabase']) {
      walk(path.join(ROOT, dir));
    }
    const bad = files.filter((f) => FORBIDDEN_CHARACTERS.test(fs.readFileSync(f, 'utf8')));
    expect(bad.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
});
