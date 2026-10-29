/**
 * Reads the bilingual data in supabase/seed.sql (the JSON between the $json$
 * markers) as flat strings keyed like the locale files:
 *
 *   tag:strength.label, exercise:quad-sets.name, exercise:quad-sets.steps.0
 *
 * Used by tests/exercise-seed.test.ts and scripts/i18n-review-list.mts.
 */
import fs from 'node:fs';
import path from 'node:path';

type Localized = { en: string; 'zh-Hans': string };
type LocalizedList = { en: string[]; 'zh-Hans': string[] };

export type SeedTag = { key: string; kind: string; label: Localized };
export type SeedExercise = { id: string; name: Localized; steps: LocalizedList };

/** `root` is the repository root. */
export function readSeed(root: string): { tags: SeedTag[]; exercises: SeedExercise[] } {
  const file = path.join(root, 'supabase/seed.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const blocks = [...sql.matchAll(/\$json\$([\s\S]*?)\$json\$/g)].map(
    (m) => JSON.parse(m[1]!) as unknown[],
  );
  if (blocks.length !== 2) throw new Error(`Expected 2 $json$ blocks in ${file}`);
  return { tags: blocks[0] as SeedTag[], exercises: blocks[1] as SeedExercise[] };
}

/** Every string in one language, keyed as above. */
export function seedStrings(root: string, language: 'en' | 'zh-Hans'): Record<string, string> {
  const { tags, exercises } = readSeed(root);
  const out: Record<string, string> = {};
  for (const tag of tags) out[`tag:${tag.key}.label`] = tag.label[language];
  for (const exercise of exercises) {
    out[`exercise:${exercise.id}.name`] = exercise.name[language];
    (exercise.steps[language] ?? []).forEach((step, i) => {
      out[`exercise:${exercise.id}.steps.${i}`] = step;
    });
  }
  return out;
}
