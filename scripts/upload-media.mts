/**
 * Uploads the exercise videos and posters in assets/exercise-media/ to the
 * public `exercise-media` bucket, replacing files with the same name.
 *
 *   npm run media:upload
 *
 * Like the demo seed, it uses the service role: locally from `supabase
 * status`, or for the hosted project from SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY in the gitignored .env.seed.local. The file
 * names match exercises.video_path and poster_path in supabase/seed.sql.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

const DIR = path.resolve(import.meta.dirname, '../assets/exercise-media');
const BUCKET = 'exercise-media';
const TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function config(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) return { url, serviceRoleKey };
  console.log('No SUPABASE_URL in .env.seed.local, so uploading to the local Supabase.');
  const status = JSON.parse(
    execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  ) as { API_URL: string; SERVICE_ROLE_KEY: string };
  return { url: status.API_URL, serviceRoleKey: status.SERVICE_ROLE_KEY };
}

const files = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter((f) => path.extname(f).toLowerCase() in TYPES)
  : [];
if (files.length === 0) {
  console.log(`No videos or posters in ${DIR}. Add knee.mp4, knee.jpg and the rest, then rerun.`);
  process.exit(0);
}

const { url, serviceRoleKey } = config();
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const file of files) {
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(file, fs.readFileSync(path.join(DIR, file)), {
      contentType: TYPES[path.extname(file).toLowerCase()],
      upsert: true,
    });
  if (error) throw new Error(`${file}: ${error.message}`);
  console.log(`Uploaded ${file}`);
}
