/**
 * Prints every Simplified Chinese string that still needs a native speaker's
 * review, as Markdown, safety wording first.
 *
 *   npm run i18n:review-list
 */
import fs from 'node:fs';
import path from 'node:path';

import { seedStrings } from './seed-strings.ts';

type Entry = { status: 'machine-drafted' | 'reviewed'; priority: 'safety' | 'health' | 'general' };

const root = path.resolve(import.meta.dirname, '..');
const review = JSON.parse(
  fs.readFileSync(path.join(root, 'locales/review-status.json'), 'utf8'),
) as { strings: Record<string, Entry>; data: Record<string, Entry> };
const seedZh = seedStrings(root, 'zh-Hans');

function lookup(id: string): string {
  if (id in seedZh) return seedZh[id]!;
  const [ns, key] = id.split(':') as [string, string];
  const file = path.join(root, 'locales/zh-Hans', `${ns}.json`);
  let value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const part of key.split('.')) value = (value as Record<string, unknown>)[part];
  return String(value);
}

const order = ['safety', 'health', 'general'] as const;
const pending = Object.entries({ ...review.strings, ...review.data }).filter(
  ([, e]) => e.status !== 'reviewed',
);

console.log(`${pending.length} Chinese strings awaiting review.\n`);
for (const priority of order) {
  const rows = pending.filter(([, e]) => e.priority === priority);
  if (rows.length === 0) continue;
  console.log(`### ${priority[0]!.toUpperCase()}${priority.slice(1)} (${rows.length})\n`);
  console.log('| Key | Chinese |\n| --- | --- |');
  for (const [id] of rows) console.log(`| \`${id}\` | ${lookup(id)} |`);
  console.log('');
}
